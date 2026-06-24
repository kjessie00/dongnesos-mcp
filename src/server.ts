import express from "express";
import type { Server as HttpServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { assertDataIsValid } from "./data/loadData.js";
import { ClassificationOutputSchema, ClassifyInputSchema, DraftInputSchema, DraftOutputSchema } from "./schemas/toolSchemas.js";
import { formatClassifySummary, runClassifyCivicIssue } from "./tools/classify_civic_issue.js";
import { formatDraftSummary, runDraftCivicReport } from "./tools/draft_civic_report.js";

export function createServer(): McpServer {
  assertDataIsValid();
  const server = new McpServer({
    name: "dongnesos-neighborhood-sos",
    version: "0.1.0"
  });

  server.registerTool(
    "classify_civic_issue",
    {
      title: "생활불편 유형 분류",
      description:
        "생활불편 설명을 공공시설·환경·보행안전 유형으로 분류하고, 공식 접수 전 필요한 증거와 복붙 초안 준비 방향을 알려주는 도구입니다. 실제 신고 접수, 로그인, 위치 수집, 사진 분석, 자동 발송은 하지 않습니다. 긴급하거나 즉시 위험한 상황은 초안 생성 대신 공식 긴급 채널 직접 연락을 안내합니다.",
      inputSchema: ClassifyInputSchema,
      outputSchema: ClassificationOutputSchema,
      annotations: {
        title: "생활불편 유형 분류",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      }
    },
    async (args) => {
      const output = runClassifyCivicIssue(args);
      return {
        content: [{ type: "text" as const, text: formatClassifySummary(output) }],
        structuredContent: output as unknown as Record<string, unknown>
      };
    }
  );

  server.registerTool(
    "draft_civic_report",
    {
      title: "생활불편 신고 준비 초안 생성",
      description:
        "분류된 생활불편 유형과 사용자가 제공한 관찰 사실을 바탕으로 공식 채널에 직접 붙여 넣을 수 있는 신고 준비용 제목·본문·체크리스트를 생성합니다. 실제 접수, 자동 전송, 처리 결과 확인, 처벌 가능성 판단은 하지 않습니다.",
      inputSchema: DraftInputSchema,
      outputSchema: DraftOutputSchema,
      annotations: {
        title: "생활불편 신고 준비 초안 생성",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      }
    },
    async (args) => {
      const output = runDraftCivicReport(args);
      return {
        content: [{ type: "text" as const, text: formatDraftSummary(output) }],
        structuredContent: output as unknown as Record<string, unknown>
      };
    }
  );

  return server;
}

export async function startHttpServer(port = Number(process.env.PORT ?? 3000), host = process.env.HOST ?? "0.0.0.0"): Promise<HttpServer> {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "dongnesos-neighborhood-sos",
      version: "0.1.0",
      tools: ["classify_civic_issue", "draft_civic_report"]
    });
  });

  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return await new Promise<HttpServer>((resolve) => {
    const httpServer = app.listen(port, host, () => {
      const address = httpServer.address();
      const resolvedPort = typeof address === "object" && address ? address.port : port;
      // eslint-disable-next-line no-console
      console.log(`dongnesos MCP server listening on http://${host}:${resolvedPort}/mcp`);
      resolve(httpServer);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const portFlagIndex = process.argv.indexOf("--port");
  const hostFlagIndex = process.argv.indexOf("--host");
  const port = portFlagIndex >= 0 ? Number(process.argv[portFlagIndex + 1]) : Number(process.env.PORT ?? 3000);
  const host = hostFlagIndex >= 0 ? process.argv[hostFlagIndex + 1] : process.env.HOST ?? "0.0.0.0";
  await startHttpServer(port, host);
}
