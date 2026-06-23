import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type Verdict = {
  name: string;
  pass: boolean;
  note?: string;
};

type ActualUseCase = {
  id: string;
  label: string;
  pass: boolean;
  verdicts: Verdict[];
  result_type?: string;
  issue_code?: string;
  can_draft?: boolean | null;
  draft_title?: string | null;
  copy_block?: string | null;
  safety?: unknown;
  errors?: unknown;
};

type ActualUseEvidence = {
  checked_at: string;
  mcp_url: string;
  commit_expected?: string;
  overall_pass: boolean;
  cases: ActualUseCase[];
};

const mcpUrlRaw = process.env.MCP_URL;
assert.ok(mcpUrlRaw, "MCP_URL is required, for example MCP_URL=https://example.com/mcp");

const mcpUrl = new URL(mcpUrlRaw);
const evidenceOut = process.env.EVIDENCE_OUT;
const commitExpected = process.env.COMMIT_EXPECTED;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasErrorCode(errors: unknown, code: string): boolean {
  return Array.isArray(errors) && errors.some((item) => stringValue(asRecord(item).code) === code);
}

function buildCase(id: string, label: string, content: Record<string, unknown>, verdicts: Verdict[]): ActualUseCase {
  const issue = asRecord(content.issue);
  const draftPolicy = asRecord(content.draft_policy);
  const draft = asRecord(content.draft);
  return {
    id,
    label,
    pass: verdicts.every((verdict) => verdict.pass),
    verdicts,
    result_type: stringValue(content.result_type),
    issue_code: stringValue(issue.code),
    can_draft: booleanValue(draftPolicy.can_draft) ?? null,
    draft_title: stringValue(draft.title) ?? null,
    copy_block: stringValue(draft.copy_block) ?? null,
    safety: content.safety,
    errors: content.errors
  };
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await client.callTool({ name, arguments: args });
  return asRecord(result.structuredContent);
}

const client = new Client({ name: "dongnesos-actual-use-endpoint-smoke", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(mcpUrl);
const cases: ActualUseCase[] = [];

try {
  await client.connect(transport);

  const draftRoad = await callTool(client, "draft_civic_report", {
    issue_code: "ROAD_SIDEWALK_DAMAGE",
    facts: {
      what: "보도블록 일부가 깨지고 들떠 있어 보행 시 발이 걸릴 위험이 있습니다.",
      where_general: "○○초등학교 정문 앞 보도",
      when_observed: "2026-06-23 오전",
      impact: "유모차와 보행자가 지나갈 때 걸릴 수 있어 보행 안전이 우려됩니다."
    },
    language: "ko"
  });
  const draftRoadObj = asRecord(draftRoad.draft);
  const draftRoadTitle = stringValue(draftRoadObj.title) ?? "";
  const draftRoadCopy = stringValue(draftRoadObj.copy_block) ?? "";
  cases.push(
    buildCase("P1-copy-block", "copy_block title is not duplicated", draftRoad, [
      { name: "draft", pass: stringValue(draftRoad.result_type) === "draft" },
      {
        name: "no_duplicate_title",
        pass: draftRoadTitle.length > 0 && !draftRoadCopy.startsWith(`${draftRoadTitle}\n\n${draftRoadTitle}`)
      },
      { name: "copy_ready", pass: draftRoadCopy.includes("안녕하세요.") && draftRoadCopy.includes("실제 접수") }
    ])
  );

  const draftStreetlight = await callTool(client, "draft_civic_report", {
    issue_code: "STREETLIGHT_OUT",
    facts: {
      what: "가로등이 꺼져 있습니다.",
      where_general: "아파트 후문 앞 골목",
      impact: "야간 보행 안전과 범죄 불안이 우려됩니다."
    },
    language: "ko"
  });
  const streetlightCopy = stringValue(asRecord(draftStreetlight.draft).copy_block) ?? "";
  cases.push(
    buildCase("P1-streetlight-crime-anxiety", "general crime anxiety does not block a streetlight draft", draftStreetlight, [
      { name: "draft_not_blocked", pass: stringValue(draftStreetlight.result_type) === "draft" },
      { name: "purpose_aligned", pass: streetlightCopy.includes("가로등") && streetlightCopy.includes("범죄 불안") },
      { name: "no_emergency_block", pass: !hasErrorCode(draftStreetlight.errors, "E_EMERGENCY_REDIRECT") }
    ])
  );

  const draftUnit = await callTool(client, "draft_civic_report", {
    issue_code: "ILLEGAL_DUMPING",
    facts: {
      what: "쓰레기가 우리집 101동 1203호 앞에 반복적으로 쌓입니다.",
      where_general: "아파트 분리수거장 옆"
    },
    language: "ko"
  });
  const unitCopy = stringValue(asRecord(draftUnit.draft).copy_block) ?? "";
  const unitMaskedFields = stringArray(asRecord(draftUnit.safety).masked_fields);
  cases.push(
    buildCase("P1-unit-address-mask", "unit address is masked as unit_address, not vehicle_plate", draftUnit, [
      { name: "unit_mask", pass: unitCopy.includes("[동호수 비공개]") },
      { name: "not_vehicle_tail", pass: !unitCopy.includes("[차량정보 비공개]호") },
      { name: "field_unit_address", pass: unitMaskedFields.includes("unit_address") },
      { name: "field_not_vehicle_plate", pass: !unitMaskedFields.includes("vehicle_plate") }
    ])
  );

  const classifyOutOfScope = await callTool(client, "classify_civic_issue", {
    description: "OO식당이 쓰레기 버렸으니 불법 확정이라고 쓰고 처벌받게 신고문 써줘.",
    language: "ko"
  });
  const maskedOutOfScope = stringValue(asRecord(classifyOutOfScope.safety).masked_description) ?? "";
  const removedClaims = stringArray(asRecord(classifyOutOfScope.safety).forbidden_claims_removed);
  cases.push(
    buildCase("P1-out-of-scope-neutralize", "out-of-scope forbidden legal assertions are neutralized", classifyOutOfScope, [
      { name: "out_of_scope", pass: stringValue(classifyOutOfScope.result_type) === "out_of_scope" },
      { name: "surface_neutralized", pass: !maskedOutOfScope.includes("불법 확정") && !maskedOutOfScope.includes("처벌받게") },
      { name: "removal_recorded", pass: removedClaims.includes("forbidden_phrase") && removedClaims.includes("forbidden_pattern") },
      { name: "warning_recorded", pass: hasErrorCode(classifyOutOfScope.errors, "E_FORBIDDEN_ASSERTION_REMOVED") }
    ])
  );

  const classifyNeighborHelp = await callTool(client, "classify_civic_issue", {
    description: "당근에서처럼 병원 동행 도와줄 사람을 동네에서 찾고 싶어요.",
    language: "ko"
  });
  cases.push(
    buildCase("purpose-neighbor-help-not-implemented", "personal help request is not forced into a civic draft", classifyNeighborHelp, [
      { name: "no_civic_draft", pass: stringValue(classifyNeighborHelp.result_type) !== "draft" },
      { name: "needs_clarification", pass: stringValue(classifyNeighborHelp.result_type) === "needs_clarification" },
      { name: "unclear_code", pass: stringValue(asRecord(classifyNeighborHelp.issue).code) === "UNCLEAR" },
      { name: "not_draftable", pass: booleanValue(asRecord(classifyNeighborHelp.draft_policy).can_draft) === false }
    ])
  );
} finally {
  await client.close();
}

const evidence: ActualUseEvidence = {
  checked_at: new Date().toISOString(),
  mcp_url: mcpUrl.toString(),
  commit_expected: commitExpected,
  overall_pass: cases.every((item) => item.pass),
  cases
};

if (evidenceOut) {
  mkdirSync(dirname(evidenceOut), { recursive: true });
  writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
}

if (!evidence.overall_pass) {
  const failed = cases
    .filter((item) => !item.pass)
    .map((item) => `${item.id}: ${item.verdicts.filter((verdict) => !verdict.pass).map((verdict) => verdict.name).join(", ")}`)
    .join("; ");
  if (evidenceOut) {
    console.error(`Evidence written: ${evidenceOut}`);
  }
  throw new Error(`Endpoint actual-use smoke failed: ${failed}`);
}

console.log(`Endpoint actual-use smoke OK: ${mcpUrl.toString()} ${cases.length} cases`);
if (evidenceOut) {
  console.log(`Evidence written: ${evidenceOut}`);
}
