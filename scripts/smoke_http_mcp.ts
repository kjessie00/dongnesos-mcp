import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { startHttpServer } from "../src/server.js";

const server = await startHttpServer(0, "127.0.0.1");

try {
  const address = server.address();
  assert.ok(address && typeof address === "object", "expected bound TCP address");

  const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
  const client = new Client({ name: "dongnesos-local-smoke", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(url);

  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["classify_civic_issue", "draft_civic_report"]);
  for (const tool of tools.tools) {
    assert.ok(tool.inputSchema, `${tool.name} inputSchema missing`);
    assert.ok(tool.outputSchema, `${tool.name} outputSchema missing`);
  }

  const classification = await client.callTool({
    name: "classify_civic_issue",
    arguments: {
      description: "집 앞 보도블록이 깨져서 유모차가 걸려요.",
      language: "ko"
    }
  });
  const classificationContent = classification.structuredContent as {
    issue?: { code?: string };
    draft_policy?: { can_draft?: boolean };
  };
  assert.equal(classificationContent.issue?.code, "ROAD_SIDEWALK_DAMAGE");
  assert.equal(classificationContent.draft_policy?.can_draft, true);

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
  assert.equal(draftContent.result_type, "draft");
  assert.match(String(draftContent.draft?.copy_block), /신고 준비용 초안/);

  await client.close();
  console.log(`HTTP MCP smoke OK: ${url.toString()} tools/list schemas + classify + draft`);
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
