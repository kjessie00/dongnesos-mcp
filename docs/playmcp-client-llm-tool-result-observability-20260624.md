# PlayMCP Client LLM Tool Result Observability

Date: 2026-06-24 17:10 KST

## Short Answer

Yes, we can see real results, but there are three different meanings of
"result":

1. MCP server result: the JSON-RPC `tools/call` response returned by
   DongneSOS. This is directly observable and already automated.
2. Client tool trace: the request/response panel shown by PlayMCP AI Chat,
   ChatGPT, Claude, or another MCP client. This is observable when the client UI
   exposes tool-call details.
3. Final LLM answer: the natural-language answer written after the client LLM
   reads the tool result. This is not visible to the MCP server by default; it
   must be captured from the client transcript or screenshot.

For review evidence, do not collapse these layers into one claim. A passing raw
MCP smoke proves what our server returned. A PlayMCP/ChatGPT/Claude screenshot
proves what the user actually saw.

## Official Source Basis

- PlayMCP describes itself as Kakao's MCP tool integration platform and
  playground. It says users can connect MCP servers to Claude/ChatGPT and can
  also test tool behavior in PlayMCP's own AI Chat before connecting an external
  agent.
  Source: https://playmcp.kakao.com/llms.txt
- PlayMCP's MCP gateway guide says external agents connect to
  `https://playmcp.kakao.com/mcp` through OAuth tokens and that the gateway
  internally routes to MCP servers in the user's Toolbox.
  Source: https://playmcp.kakao.com/llms/mcp-connection-guide.md
- PlayMCP in KC states that KakaoCloud deployment produces an Endpoint URL, and
  that the user registers that Endpoint URL in the PlayMCP console.
  Source: https://playmcp.kakaocloud.io/llms.txt
- The MCP specification defines tool execution as a `tools/call` request that
  returns tool result content and optional structured content to the client.
  Source: https://modelcontextprotocol.io/specification/2025-11-25/server/tools

## What We Can Observe Reliably

### 1. Direct raw MCP server results

This is the strongest evidence for "what did DongneSOS actually return?"

Current repo scripts use the official MCP SDK client against the remote
`/mcp` endpoint:

```bash
MCP_URL=https://<endpoint>/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-<tag>.json \
npm run smoke:endpoint
```

This verifies:

- `/healthz`
- `tools/list`
- tool names
- input/output schemas
- annotations
- direct `classify_civic_issue` result
- direct `draft_civic_report` result
- emergency blocking and masking

For richer real-use output:

```bash
MCP_URL=https://<endpoint>/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-output-review-<tag>.json \
MARKDOWN_OUT=deploy/playmcp/evidence/remote-actual-output-review-<tag>.md \
npm run review:actual-output:endpoint
```

This captures raw `structuredContent` for classification and draft cases. It is
not a simulated final LLM answer; it is the actual tool return body from the MCP
server.

### Current proof from v3

On 2026-06-24, a direct raw endpoint probe was run:

```bash
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-observability-probe-v3-20260624.json \
MARKDOWN_OUT=deploy/playmcp/evidence/remote-observability-probe-v3-20260624.md \
npm run review:actual-output:endpoint
```

It wrote both JSON and Markdown evidence:

- `deploy/playmcp/evidence/remote-observability-probe-v3-20260624.json`
- `deploy/playmcp/evidence/remote-observability-probe-v3-20260624.md`

The quality gate failed because v3 is stale, but the probe proves that we can
see real remote tool results. Example observed case:

```text
sidewalk_stroller -> classification / ROAD_SIDEWALK_DAMAGE, draft / draft
tactile_paving -> classification / TACTILE_PAVING_DAMAGE, draft / draft
emergency_phone_gas -> emergency_redirect / EMERGENCY_GAS, draft / blocked_emergency
```

### 2. PlayMCP AI Chat tool trace

PlayMCP's own documentation says AI Chat is useful for trying tool behavior
before connecting external AI agents. The public PlayMCP page/search surface
also indicates that tool-call request/response values can be checked in the UI.

This is the best evidence for:

- whether PlayMCP selected the DongneSOS tool,
- what arguments PlayMCP sent to the tool,
- what response PlayMCP received,
- what final answer PlayMCP's client LLM gave to the user.

Expected capture flow after fresh endpoint rebuild:

1. Register/update `동네SOS` in the PlayMCP developer console.
2. Run `정보 불러오기`.
3. Add `동네SOS` to the PlayMCP Toolbox if needed.
4. Open PlayMCP AI Chat.
5. Send a fixed prompt:

```text
집 앞 보도블록이 깨져서 유모차가 걸려요. 어디에 말하면 좋고 신고문 초안도 준비해줘.
```

6. Expand the tool-call detail panel if available.
7. Capture:
   - screenshot of the final answer,
   - screenshot or copied text of tool-call request,
   - screenshot or copied text of tool-call response.

This proves client-visible behavior. It still does not prove every future LLM
answer, because client LLM behavior can vary by model, prompt, and context.

### 3. PlayMCP gateway / external agent direct test

PlayMCP gateway is at:

```text
https://playmcp.kakao.com/mcp
```

The official gateway guide routes external agents through Toolbox membership
and OAuth tokens obtained from a user-generated One Time Token. This path can
prove that an external MCP client can call the server through PlayMCP, not only
through the raw KakaoCloud endpoint.

Use this only with a fresh owner-generated OTT. Do not inspect or export
browser cookies, localStorage, or existing token files.

Evidence to capture:

- `mcporter list mcp-gateway`
- `tools/list` through the gateway
- `tools/call` through the gateway
- response body

This is stronger than raw endpoint smoke for integration, but weaker than a
real ChatGPT/Claude screenshot for final user-facing answer quality.

### 4. ChatGPT / Claude client transcript

When PlayMCP is connected to ChatGPT or Claude, the actual user-facing outcome
must be captured from that client:

- final assistant answer,
- visible tool-use indicator,
- expanded tool detail if the client exposes it,
- prompt used,
- time and account/profile.

The MCP server does not receive the final LLM answer. It only receives tool-call
requests and returns tool-call responses. Therefore, server logs alone cannot
prove that the final ChatGPT/Claude answer was faithful to the tool result.

## What We Cannot Reliably See By Default

| Claim | Default visibility | Why |
|---|---:|---|
| DongneSOS returned a specific JSON result | High | Direct MCP client can call the endpoint |
| PlayMCP called DongneSOS with specific args | Medium to high | Needs PlayMCP tool trace UI or gateway capture |
| ChatGPT/Claude used the tool result faithfully | Medium | Needs transcript/screenshot; not visible to server |
| PlayMCP developer console tool-call count means output quality is good | Low | Count/status is not payload evidence |
| KakaoCloud runtime logs contain full tool payloads | Unknown | Current evidence shows build/failure logs, not proven per-request logs |

## Recommended Evidence Ladder For DongneSOS

Use all levels when preparing final review evidence.

### Level A: Server-contract proof

Run after fresh rebuild:

```bash
MCP_URL=https://<fresh-endpoint>/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-final.json \
npm run smoke:endpoint
```

Pass condition: tools, schemas, annotations, core calls, emergency block all
pass.

### Level B: Actual tool-output proof

Run:

```bash
MCP_URL=https://<fresh-endpoint>/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-output-review-final.json \
MARKDOWN_OUT=deploy/playmcp/evidence/remote-actual-output-review-final.md \
npm run review:actual-output:endpoint
```

Pass condition: output-review gates pass, and Markdown contains representative
classification/draft JSON.

### Level C: PlayMCP UI proof

Capture PlayMCP developer console and AI Chat evidence:

- registration: `동네SOS` / `dongnesos`, Online, Tools `2`,
- `정보 불러오기` completed,
- AI Chat prompt transcript,
- tool-call request/response panel,
- final answer.

### Level D: External client proof

If time permits, capture one ChatGPT or Claude flow connected through PlayMCP:

- account/profile used,
- prompt,
- visible tool call,
- final answer,
- mismatch notes if the client paraphrases or omits a warning.

## Recommended Observability Improvement

Current DongneSOS has good black-box endpoint tests, but the server itself does
not emit per-tool trace logs. If we want stronger post-deploy diagnosis, add a
privacy-safe trace layer in a future patch.

Recommended fields:

```json
{
  "event": "mcp_tool_call",
  "trace_id": "uuid",
  "tool": "classify_civic_issue",
  "result_type": "classification",
  "issue_code": "ROAD_SIDEWALK_DAMAGE",
  "can_draft": true,
  "pii_detected": false,
  "duration_ms": 12,
  "input_hash": "sha256:...",
  "timestamp": "2026-06-24T08:10:00.000Z"
}
```

Rules:

- Do not log raw user descriptions.
- Do not log phone numbers, unit numbers, precise addresses, photos, or names.
- Use a hash for correlation only.
- Include `trace_id` in `structuredContent` or `content` only if the schema is
  intentionally extended and reviewed.
- Keep logging optional with an environment flag, for example
  `DONGNESOS_TRACE_LOG=1`.

This would let us match:

```text
client screenshot trace_id <-> server log trace_id <-> raw MCP evidence file
```

## Practical Conclusion

We can already see actual tool results by calling the deployed MCP endpoint
directly. For contest/review confidence, that should be treated as necessary but
not sufficient. The final evidence pack should also include PlayMCP AI Chat or
ChatGPT/Claude client transcript evidence, because the user-facing answer is
generated by the client LLM after it receives our tool result.

Current caveat: `dongnesos-mcp-v3` is stale, so it is useful for demonstrating
observability mechanics but not acceptable as final review evidence. Final
evidence must be regenerated against the next fresh active endpoint.
