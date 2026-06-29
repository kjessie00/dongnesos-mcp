import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface SmokeEvidence {
  checked_at: string;
  mcp_url: string;
  health_url: string;
  health?: {
    status: number;
    body: unknown;
  };
  tools?: Array<{
    name: string;
    has_input_schema: boolean;
    has_output_schema: boolean;
    has_annotations: boolean;
    annotations_ok: boolean;
  }>;
  classify?: {
    result_type?: string;
    issue_code?: string;
    can_draft?: boolean;
    source_card_count?: number;
    has_action_card?: boolean;
  };
  draft?: {
    result_type?: string;
    has_copy_block: boolean;
  };
  emergency_classify?: {
    result_type?: string;
    issue_code?: string;
    can_draft?: boolean;
    pii_detected?: boolean;
    pii_masked?: boolean;
  };
  emergency_draft?: {
    result_type?: string;
    has_draft: boolean;
  };
}

const mcpUrlRaw = process.env.MCP_URL;
assert.ok(mcpUrlRaw, "MCP_URL is required, for example MCP_URL=https://example.com/mcp");

const mcpUrl = new URL(mcpUrlRaw);
const healthUrl = new URL(process.env.HEALTH_URL ?? "/healthz", mcpUrl.origin);
const evidenceOut = process.env.EVIDENCE_OUT;
const evidence: SmokeEvidence = {
  checked_at: new Date().toISOString(),
  mcp_url: mcpUrl.toString(),
  health_url: healthUrl.toString()
};

const healthResponse = await fetch(healthUrl);
const healthBody = await healthResponse.json();
evidence.health = {
  status: healthResponse.status,
  body: healthBody
};
assert.equal(healthResponse.status, 200);
assert.equal((healthBody as { ok?: unknown }).ok, true);

const client = new Client({ name: "dongnesos-endpoint-smoke", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(mcpUrl);

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["classify_civic_issue", "draft_civic_report"]);
  evidence.tools = tools.tools.map((tool) => ({
    name: tool.name,
    has_input_schema: Boolean(tool.inputSchema),
    has_output_schema: Boolean(tool.outputSchema),
    has_annotations: Boolean(tool.annotations),
    annotations_ok:
      tool.annotations?.readOnlyHint === true &&
      tool.annotations?.destructiveHint === false &&
      tool.annotations?.openWorldHint === false &&
      tool.annotations?.idempotentHint === true &&
      typeof tool.annotations?.title === "string" &&
      tool.annotations.title.length > 0
  }));
  for (const tool of evidence.tools) {
    assert.equal(tool.has_input_schema, true, `${tool.name} inputSchema missing`);
    assert.equal(tool.has_output_schema, true, `${tool.name} outputSchema missing`);
    assert.equal(tool.has_annotations, true, `${tool.name} annotations missing`);
    assert.equal(tool.annotations_ok, true, `${tool.name} annotations incomplete`);
  }

  const classification = await client.callTool({
    name: "classify_civic_issue",
    arguments: {
      description: "집 앞 보도블록이 깨져서 유모차가 걸려요.",
      language: "ko"
    }
  });
  const classificationContent = classification.structuredContent as {
    result_type?: string;
    issue?: { code?: string };
    draft_policy?: { can_draft?: boolean };
    source_basis?: { source_card_count?: number; matched_cards?: unknown[] };
    action_card?: { next_action?: string; source_summary?: string };
  };
  evidence.classify = {
    result_type: classificationContent.result_type,
    issue_code: classificationContent.issue?.code,
    can_draft: classificationContent.draft_policy?.can_draft,
    source_card_count: classificationContent.source_basis?.source_card_count,
    has_action_card:
      typeof classificationContent.action_card?.next_action === "string" &&
      classificationContent.action_card.next_action.length > 0 &&
      typeof classificationContent.action_card?.source_summary === "string"
  };
  assert.equal(evidence.classify.result_type, "classification");
  assert.equal(evidence.classify.issue_code, "ROAD_SIDEWALK_DAMAGE");
  assert.equal(evidence.classify.can_draft, true);
  assert.ok((evidence.classify.source_card_count ?? 0) >= 13);
  assert.equal(evidence.classify.has_action_card, true);

  const draft = await client.callTool({
    name: "draft_civic_report",
    arguments: {
      issue_code: "ROAD_SIDEWALK_DAMAGE",
      facts: {
        what: "보도블록 일부가 깨져서 유모차 바퀴가 걸릴 수 있습니다.",
        where_general: "○○초등학교 정문 앞 보도",
        when_observed: "오늘 아침"
      },
      language: "ko"
    }
  });
  const draftContent = draft.structuredContent as {
    result_type?: string;
    draft?: { copy_block?: string };
  };
  evidence.draft = {
    result_type: draftContent.result_type,
    has_copy_block: Boolean(draftContent.draft?.copy_block)
  };
  assert.equal(evidence.draft.result_type, "draft");
  assert.equal(evidence.draft.has_copy_block, true);

  const emergency = await client.callTool({
    name: "classify_civic_issue",
    arguments: {
      description: "010-1234-5678 복도에서 가스 냄새가 심하게 나요.",
      language: "ko"
    }
  });
  const emergencyContent = emergency.structuredContent as {
    result_type?: string;
    issue?: { code?: string };
    draft_policy?: { can_draft?: boolean };
    safety?: { pii_detected?: boolean; masked_description?: string };
  };
  evidence.emergency_classify = {
    result_type: emergencyContent.result_type,
    issue_code: emergencyContent.issue?.code,
    can_draft: emergencyContent.draft_policy?.can_draft,
    pii_detected: emergencyContent.safety?.pii_detected,
    pii_masked:
      typeof emergencyContent.safety?.masked_description === "string" &&
      emergencyContent.safety.masked_description.includes("[전화번호 비공개]") &&
      !emergencyContent.safety.masked_description.includes("010-1234-5678")
  };
  assert.equal(evidence.emergency_classify.result_type, "emergency_redirect");
  assert.equal(evidence.emergency_classify.issue_code, "EMERGENCY_GAS");
  assert.equal(evidence.emergency_classify.can_draft, false);
  assert.equal(evidence.emergency_classify.pii_detected, true);
  assert.equal(evidence.emergency_classify.pii_masked, true);

  const emergencyDraft = await client.callTool({
    name: "draft_civic_report",
    arguments: {
      issue_code: "EMERGENCY_GAS",
      facts: {
        what: "복도에서 가스 냄새가 심하게 나요."
      },
      language: "ko"
    }
  });
  const emergencyDraftContent = emergencyDraft.structuredContent as {
    result_type?: string;
    draft?: unknown;
  };
  evidence.emergency_draft = {
    result_type: emergencyDraftContent.result_type,
    has_draft: Boolean(emergencyDraftContent.draft)
  };
  assert.equal(evidence.emergency_draft.result_type, "blocked_emergency");
  assert.equal(evidence.emergency_draft.has_draft, false);

  if (evidenceOut) {
    mkdirSync(dirname(evidenceOut), { recursive: true });
    writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  console.log(`Endpoint MCP smoke OK: ${mcpUrl.toString()} health + tools/list schemas + normal/emergency calls`);
  if (evidenceOut) {
    console.log(`Evidence written: ${evidenceOut}`);
  }
} finally {
  await client.close();
}
