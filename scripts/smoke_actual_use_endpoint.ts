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

function routeLabels(content: Record<string, unknown>): string[] {
  const routes = Array.isArray(content.official_routes)
    ? content.official_routes
    : Array.isArray(asRecord(content.action_card).official_routes)
      ? (asRecord(content.action_card).official_routes as unknown[])
      : [];
  return routes.map(asRecord).map((route) => stringValue(route.label) ?? "");
}

function hasRoute(content: Record<string, unknown>, pattern: RegExp): boolean {
  return routeLabels(content).some((label) => pattern.test(label));
}

function legalSourceIds(content: Record<string, unknown>): string[] {
  const contexts = Array.isArray(content.legal_context)
    ? content.legal_context
    : Array.isArray(asRecord(content.action_card).legal_context)
      ? (asRecord(content.action_card).legal_context as unknown[])
      : [];
  return contexts.map(asRecord).map((context) => stringValue(context.source_id) ?? "");
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
      { name: "copy_ready", pass: draftRoadCopy.startsWith("제목:") && draftRoadCopy.includes("요청사항:") && draftRoadCopy.includes("실제 접수") },
      { name: "official_route_safetyreport", pass: hasRoute(draftRoad, /안전신문고/) },
      { name: "official_route_epeople", pass: hasRoute(draftRoad, /국민신문고/) },
      { name: "official_route_local_direct", pass: hasRoute(draftRoad, /지역\/구청 공식 생활민원 페이지 직접 선택/) }
    ])
  );

  const draftPlayMcpRoad = await callTool(client, "draft_civic_report", {
    issue_code: "road_walkway",
    facts: {
      what: "집 앞 보도블록이 깨져서 유모차가 걸려요."
    },
    tone: "formal",
    language: "ko"
  });
  const playMcpRoadCopy = stringValue(asRecord(draftPlayMcpRoad.draft).copy_block) ?? "";
  cases.push(
    buildCase("playmcp-road-walkway-hint", "PlayMCP category hint resolves to a copy-ready road draft", draftPlayMcpRoad, [
      { name: "draft_not_unknown", pass: stringValue(draftPlayMcpRoad.result_type) === "draft" },
      { name: "copy_ready", pass: playMcpRoadCopy.includes("보도블록") && playMcpRoadCopy.includes("유모차") },
      { name: "not_unknown_issue", pass: !hasErrorCode(draftPlayMcpRoad.errors, "E_UNKNOWN_ISSUE_CODE") }
    ])
  );

  const draftPlayMcpSanitation = await callTool(client, "draft_civic_report", {
    issue_code: "environment_sanitation",
    facts: {
      what: "우리 빌라 302호 앞에 음식물 쓰레기가 계속 버려지고 있습니다. 사진에는 차량번호 12가3456도 찍혔습니다.",
      where_general: "우리 빌라 302호 앞",
      photo_note: "차량번호 12가3456이 찍힌 사진이 있습니다."
    },
    tone: "formal",
    include_neighbor_share_text: false,
    language: "ko"
  });
  const sanitationCopy = stringValue(asRecord(draftPlayMcpSanitation.draft).copy_block) ?? "";
  cases.push(
    buildCase("playmcp-environment-hint-privacy", "PlayMCP sanitation hint resolves and masks copied privacy details", draftPlayMcpSanitation, [
      { name: "draft_not_unknown", pass: stringValue(draftPlayMcpSanitation.result_type) === "draft" },
      { name: "vehicle_masked", pass: !sanitationCopy.includes("12가3456") },
      { name: "unit_masked", pass: !sanitationCopy.includes("302호") },
      { name: "not_unknown_issue", pass: !hasErrorCode(draftPlayMcpSanitation.errors, "E_UNKNOWN_ISSUE_CODE") }
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

  const classifyVehiclePrivacy = await callTool(client, "classify_civic_issue", {
    description: "OO초 앞 횡단보도 입구에 12가3456 차량이 불법주정차로 계속 서 있어요. 사진엔 아이들 얼굴도 보여서 동네방에 올려도 될지 모르겠어요.",
    language: "ko"
  });
  const sourceBasis = asRecord(classifyVehiclePrivacy.source_basis);
  const actionCard = asRecord(classifyVehiclePrivacy.action_card);
  const matchedCards = Array.isArray(sourceBasis.matched_cards) ? sourceBasis.matched_cards.map(asRecord) : [];
  const evidenceNow = stringArray(actionCard.evidence_now);
  const doNotShare = stringArray(actionCard.do_not_share);
  cases.push(
    buildCase("source-card-vehicle-public-sharing", "vehicle public-sharing risk returns official source-backed action guidance", classifyVehiclePrivacy, [
      { name: "classification", pass: stringValue(classifyVehiclePrivacy.result_type) === "classification" },
      { name: "parking_issue", pass: stringValue(asRecord(classifyVehiclePrivacy.issue).code) === "ILLEGAL_PARKING_SAFETY" },
      { name: "source_count", pass: typeof sourceBasis.source_card_count === "number" && sourceBasis.source_card_count >= 13 },
      {
        name: "illegal_parking_card",
        pass: matchedCards.some((card) => stringValue(card.source_id) === "safetyreport_illegal_parking_basic")
      },
      {
        name: "vehicle_privacy_card",
        pass: matchedCards.some((card) => stringValue(card.source_id) === "pipc_vehicle_plate_personal_info")
      },
      { name: "evidence_guidance", pass: evidenceNow.some((item) => /사진|차량번호|촬영/.test(item)) },
      { name: "public_privacy_guidance", pass: doNotShare.some((item) => /차량번호|아동|얼굴/.test(item)) },
      { name: "official_route_safetyreport", pass: hasRoute(classifyVehiclePrivacy, /안전신문고/) },
      { name: "official_route_epeople", pass: hasRoute(classifyVehiclePrivacy, /국민신문고/) },
      { name: "official_route_local_direct", pass: hasRoute(classifyVehiclePrivacy, /지역\/구청 공식 생활민원 페이지 직접 선택/) },
      { name: "privacy_legal_context", pass: legalSourceIds(classifyVehiclePrivacy).includes("pipc_vehicle_plate_personal_info") }
    ])
  );

  const draftVehiclePrivacy = await callTool(client, "draft_civic_report", {
    issue_code: "ILLEGAL_PARKING_SAFETY",
    facts: {
      what: "OO초 앞 횡단보도 입구에 12가3456 차량이 불법주정차로 계속 서 있습니다.",
      where_general: "OO초 앞 횡단보도 입구",
      impact: "아이들 통행이 위험합니다.",
      photo_note: "차량과 주변 배경이 보이는 사진을 첨부합니다. 아이 얼굴은 공개 공유문에 쓰지 않습니다."
    },
    include_neighbor_share_text: true,
    language: "ko"
  });
  const vehicleDraftCopy = stringValue(asRecord(draftVehiclePrivacy.draft).copy_block) ?? "";
  const vehicleShareText = stringValue(asRecord(draftVehiclePrivacy.share).neighbor_text) ?? "";
  const privacyRedactions = stringArray(draftVehiclePrivacy.privacy_redactions);
  cases.push(
    buildCase("answer-quality-official-public-lane", "official draft and public share are separated for illegal parking", draftVehiclePrivacy, [
      { name: "draft", pass: stringValue(draftVehiclePrivacy.result_type) === "draft" },
      { name: "copy_ready", pass: vehicleDraftCopy.startsWith("제목:") && vehicleDraftCopy.includes("요청사항:") },
      { name: "official_keeps_target_plate", pass: vehicleDraftCopy.includes("12가3456") },
      { name: "public_share_removes_plate", pass: !vehicleShareText.includes("12가3456") },
      { name: "privacy_redaction_plate", pass: privacyRedactions.some((item) => item.includes("차량번호")) },
      { name: "official_route_safetyreport", pass: hasRoute(draftVehiclePrivacy, /안전신문고/) },
      { name: "official_route_epeople", pass: hasRoute(draftVehiclePrivacy, /국민신문고/) },
      { name: "privacy_legal_context", pass: legalSourceIds(draftVehiclePrivacy).includes("pipc_vehicle_plate_personal_info") }
    ])
  );

  cases.push(
    buildCase("purpose-neighbor-help-not-implemented", "personal help request is not forced into a civic draft", classifyNeighborHelp, [
      { name: "no_civic_draft", pass: stringValue(classifyNeighborHelp.result_type) !== "draft" },
      { name: "out_of_scope", pass: stringValue(classifyNeighborHelp.result_type) === "out_of_scope" },
      { name: "out_of_scope_code", pass: stringValue(asRecord(classifyNeighborHelp.issue).code) === "OUT_OF_SCOPE" },
      { name: "not_draftable", pass: booleanValue(asRecord(classifyNeighborHelp.draft_policy).can_draft) === false },
      {
        name: "roadmap_message",
        pass:
          (stringValue(asRecord(classifyNeighborHelp.user_messages).summary) ?? "").includes("범위") &&
          (stringValue(asRecord(classifyNeighborHelp.draft_policy).reason) ?? "").includes("로드맵")
      }
    ])
  );

  const draftNeighborHelp = await callTool(client, "draft_civic_report", {
    issue_code: "unknown",
    facts: {
      what: "오늘 밤 9시에 냉장고 옮기는 것을 도와줄 사람을 찾습니다.",
      when_observed: "오늘 밤 9시",
      impact: "냉장고를 안전하게 옮기기 위해 도움이 필요합니다."
    },
    tone: "neutral",
    include_neighbor_share_text: true,
    language: "ko"
  });
  cases.push(
    buildCase("playmcp-neighbor-help-draft-out-of-scope", "direct PlayMCP personal-help draft call returns out-of-scope instead of unknown issue", draftNeighborHelp, [
      { name: "out_of_scope", pass: stringValue(draftNeighborHelp.result_type) === "out_of_scope" },
      { name: "no_draft", pass: asRecord(draftNeighborHelp.draft).title === undefined },
      { name: "roadmap_message", pass: hasErrorCode(draftNeighborHelp.errors, "E_NEIGHBOR_HELP_UNSUPPORTED") }
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
