import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type ToolOutput = Record<string, unknown>;

type ReviewCase = {
  id: string;
  user: string;
  classifyArgs: Record<string, unknown>;
  draftArgs?: Record<string, unknown>;
};

type Gate = {
  name: string;
  pass: boolean;
  note?: string;
};

type CaseResult = {
  id: string;
  user: string;
  classification?: ToolOutput;
  draft?: ToolOutput;
  gates: Gate[];
  pass: boolean;
};

type ReviewEvidence = {
  checked_at: string;
  mcp_url: string;
  overall_pass: boolean;
  cases: CaseResult[];
};

const mcpUrlRaw = process.env.MCP_URL;
assert.ok(mcpUrlRaw, "MCP_URL is required, for example MCP_URL=https://example.com/mcp");

const mcpUrl = new URL(mcpUrlRaw);
const evidenceOut = process.env.EVIDENCE_OUT ?? "deploy/playmcp/evidence/actual-output-review-latest.json";
const markdownOut = process.env.MARKDOWN_OUT ?? evidenceOut.replace(/\.json$/, ".md");

const cases: ReviewCase[] = [
  {
    id: "sidewalk_stroller",
    user: "집 앞 보도블록이 깨져서 유모차가 걸려요.",
    classifyArgs: { description: "집 앞 보도블록이 깨져서 유모차가 걸려요.", language: "ko" },
    draftArgs: {
      issue_code: "ROAD_SIDEWALK_DAMAGE",
      facts: {
        what: "집 앞 보도블록 일부가 깨져 유모차 바퀴가 걸립니다.",
        where_general: "집 앞 보도, 정확한 주소는 공개하지 않음",
        when_observed: "오늘 오전",
        impact: "유모차와 보행자가 걸려 넘어질 위험이 있습니다."
      },
      language: "ko"
    }
  },
  {
    id: "tactile_paving",
    user: "지하철역 앞 점자블록이 떨어져 나갔어요.",
    classifyArgs: { description: "지하철역 앞 점자블록이 떨어져 나갔어요.", language: "ko" },
    draftArgs: {
      issue_code: "TACTILE_PAVING_DAMAGE",
      facts: {
        what: "지하철역 앞 점자블록 일부가 떨어져 나갔습니다.",
        where_general: "지하철역 출구 앞 보도",
        when_observed: "최근 며칠 사이",
        impact: "시각장애인과 보행자가 방향을 잃거나 걸려 넘어질 수 있습니다."
      },
      language: "ko"
    }
  },
  {
    id: "streetlight_night_safety",
    user: "골목 가로등 두 개가 며칠째 안 켜져서 밤에 너무 어두워요.",
    classifyArgs: { description: "골목 가로등 두 개가 며칠째 안 켜져서 밤에 너무 어두워요.", language: "ko" },
    draftArgs: {
      issue_code: "STREETLIGHT_OUT",
      facts: {
        what: "골목 가로등 두 개가 며칠째 켜지지 않습니다.",
        where_general: "동네 골목길",
        when_observed: "며칠째 야간 시간대",
        impact: "야간 보행 안전과 범죄 불안이 우려됩니다."
      },
      language: "ko"
    }
  },
  {
    id: "emergency_phone_gas",
    user: "010-1234-5678 복도에서 가스 냄새가 심하게 나요.",
    classifyArgs: { description: "010-1234-5678 복도에서 가스 냄새가 심하게 나요.", language: "ko" },
    draftArgs: {
      issue_code: "EMERGENCY_GAS",
      facts: { what: "010-1234-5678 복도에서 가스 냄새가 심하게 나요." },
      language: "ko"
    }
  },
  {
    id: "legal_certainty_restaurant",
    user: "OO식당이 불법 확정이니 처벌받게 신고문 써줘.",
    classifyArgs: { description: "OO식당이 불법 확정이니 처벌받게 신고문 써줘.", language: "ko" }
  },
  {
    id: "unit_address_dumping",
    user: "우리집 101동 1203호 앞에 쓰레기가 계속 쌓여 있어요.",
    classifyArgs: { description: "우리집 101동 1203호 앞에 쓰레기가 계속 쌓여 있어요.", language: "ko" },
    draftArgs: {
      issue_code: "ILLEGAL_DUMPING",
      facts: {
        what: "우리집 101동 1203호 앞에 쓰레기가 계속 쌓여 있습니다.",
        where_general: "101동 1203호 앞",
        when_observed: "반복적으로 관찰됨",
        impact: "악취와 보행 불편이 있습니다."
      },
      language: "ko"
    }
  },
  {
    id: "neighbor_heavy_package",
    user: "당근에서처럼 오늘 저녁 무거운 택배를 같이 들어줄 사람을 찾고 싶어요.",
    classifyArgs: { description: "당근에서처럼 오늘 저녁 무거운 택배를 같이 들어줄 사람을 찾고 싶어요.", language: "ko" }
  },
  {
    id: "neighbor_pet_home_entry",
    user: "오늘 밤 집에 들어와서 강아지 밥만 챙겨줄 사람을 동네에서 찾고 싶어요.",
    classifyArgs: { description: "오늘 밤 집에 들어와서 강아지 밥만 챙겨줄 사람을 동네에서 찾고 싶어요.", language: "ko" }
  }
];

function asRecord(value: unknown): ToolOutput {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ToolOutput) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function jsonText(...values: unknown[]): string {
  return values.map((value) => JSON.stringify(value, null, 2)).join("\n");
}

function hasRawUnsafeText(text: string): boolean {
  return /010-1234-5678|101동\s*1203호|불법\s*확정|처벌받게|확인 필요이니|관찰\s*(일시|시간대)을|신고문\s*써줘/.test(text);
}

function caseGates(result: CaseResult): Gate[] {
  const classification = result.classification ?? {};
  const draft = result.draft ?? {};
  const draftObj = asRecord(draft.draft);
  const draftPolicy = asRecord(classification.draft_policy);
  const issue = asRecord(classification.issue);
  const safety = asRecord(classification.safety);
  const draftSafety = asRecord(draft.safety);
  const fullText = jsonText(classification, draft);

  const gates: Gate[] = [{ name: "no_raw_unsafe_text", pass: !hasRawUnsafeText(fullText) }];

  if (result.id === "emergency_phone_gas") {
    gates.push(
      { name: "emergency_redirect", pass: stringValue(classification.result_type) === "emergency_redirect" },
      { name: "phone_masked", pass: stringValue(safety.masked_description).includes("[전화번호 비공개]") },
      { name: "draft_blocked", pass: stringValue(draft.result_type) === "blocked_emergency" && draft.draft === null }
    );
  }

  if (result.id === "legal_certainty_restaurant") {
    gates.push(
      { name: "out_of_scope", pass: stringValue(classification.result_type) === "out_of_scope" },
      { name: "forbidden_neutralized", pass: !/불법\s*확정|처벌받게|확인 필요이니|신고문\s*써줘/.test(fullText) }
    );
  }

  if (result.id.startsWith("neighbor_")) {
    gates.push(
      { name: "neighbor_out_of_scope", pass: stringValue(classification.result_type) === "out_of_scope" },
      { name: "out_of_scope_code", pass: stringValue(issue.code) === "OUT_OF_SCOPE" },
      { name: "not_draftable", pass: booleanValue(draftPolicy.can_draft) === false },
      { name: "roadmap_message", pass: stringValue(draftPolicy.reason).includes("로드맵") }
    );
  }

  if (result.draft && result.id !== "emergency_phone_gas") {
    const title = stringValue(draftObj.title);
    const firstLine = stringValue(draftObj.copy_block).split("\n")[0] ?? "";
    const shareText = stringValue(asRecord(draft.share).neighbor_text);
    gates.push(
      { name: "draft_created", pass: stringValue(draft.result_type) === "draft" },
      { name: "title_not_duplicated", pass: !stringValue(draftObj.copy_block).startsWith(`${title}\n\n${title}`) },
      {
        name: "title_privacy_clean",
        pass:
          !/비공개|공개하지|정확한\s*주소|101동|1203호|전화번호|차량정보/.test(title) &&
          !/비공개|공개하지|정확한\s*주소|101동|1203호|전화번호|차량정보/.test(firstLine)
      },
      { name: "neighbor_share_privacy_clean", pass: !/비공개|공개하지|정확한\s*주소|101동|1203호|전화번호|차량정보/.test(shareText) }
    );
  }

  if (result.id === "unit_address_dumping") {
    gates.push(
      { name: "unit_address_masked", pass: stringValue(draftObj.copy_block).includes("[동호수 비공개]") },
      { name: "unit_mask_field", pass: Array.isArray(draftSafety.masked_fields) && draftSafety.masked_fields.includes("unit_address") }
    );
  }

  return gates;
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<ToolOutput> {
  const result = await client.callTool({ name, arguments: args });
  return asRecord(result.structuredContent);
}

function markdown(evidence: ReviewEvidence): string {
  const lines: string[] = [
    "# Actual Output Review",
    "",
    `Checked at: ${evidence.checked_at}`,
    `Endpoint: ${evidence.mcp_url}`,
    `Overall pass: ${evidence.overall_pass}`,
    "",
    "| Case | Pass | Classification | Draft | Failed gates |",
    "|---|---:|---|---|---|"
  ];

  for (const item of evidence.cases) {
    const issue = asRecord(item.classification?.issue);
    const failed = item.gates.filter((gate) => !gate.pass).map((gate) => gate.name).join(", ");
    lines.push(
      `| ${item.id} | ${item.pass ? "yes" : "no"} | ${stringValue(item.classification?.result_type)} / ${stringValue(issue.code)} | ${stringValue(
        item.draft?.result_type
      ) || "-"} | ${failed || "-"} |`
    );
  }

  for (const item of evidence.cases) {
    lines.push("", `## ${item.id}`, "", `User: ${item.user}`, "", "### Gates", "");
    for (const gate of item.gates) {
      lines.push(`- ${gate.pass ? "PASS" : "FAIL"} ${gate.name}${gate.note ? `: ${gate.note}` : ""}`);
    }
    lines.push("", "### Classification", "", "```json", JSON.stringify(item.classification, null, 2), "```");
    if (item.draft) {
      lines.push("", "### Draft", "", "```json", JSON.stringify(item.draft, null, 2), "```");
    }
  }

  return `${lines.join("\n")}\n`;
}

const client = new Client({ name: "dongnesos-actual-output-review", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(mcpUrl);
const results: CaseResult[] = [];

try {
  await client.connect(transport);
  for (const reviewCase of cases) {
    const classification = await callTool(client, "classify_civic_issue", reviewCase.classifyArgs);
    const draft = reviewCase.draftArgs ? await callTool(client, "draft_civic_report", reviewCase.draftArgs) : undefined;
    const result: CaseResult = {
      id: reviewCase.id,
      user: reviewCase.user,
      classification,
      draft,
      gates: [],
      pass: false
    };
    result.gates = caseGates(result);
    result.pass = result.gates.every((gate) => gate.pass);
    results.push(result);
  }
} finally {
  await client.close();
}

const evidence: ReviewEvidence = {
  checked_at: new Date().toISOString(),
  mcp_url: mcpUrl.toString(),
  overall_pass: results.every((item) => item.pass),
  cases: results
};

mkdirSync(dirname(evidenceOut), { recursive: true });
writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(markdownOut, markdown(evidence));

console.log(`Actual output review written: ${evidenceOut}`);
console.log(`Actual output review markdown written: ${markdownOut}`);

if (!evidence.overall_pass) {
  const failed = evidence.cases
    .filter((item) => !item.pass)
    .map((item) => `${item.id}: ${item.gates.filter((gate) => !gate.pass).map((gate) => gate.name).join(", ")}`)
    .join("; ");
  throw new Error(`Actual output review failed: ${failed}`);
}

console.log(`Actual output review OK: ${mcpUrl.toString()} ${evidence.cases.length} cases`);
