# Submission Evidence Log

Canonical generated evidence is written to
`deploy/playmcp/evidence/submission-evidence.generated.md`.

Last reviewed state: PlayMCP temporary registration Online, Tools 2, endpoint
updated to v5, review not requested. Final review request and one-time
preliminary submission remain blocked until Jessie explicitly approves them.

## Local Verification

- Commit: `9bbbcb0 feat: return source-backed action cards`
- `npm run check` result: PASS
- `npm run smoke:http` result: PASS
- `npm run smoke:dist` result: PASS
- `npm run smoke:docker` result: BLOCKED locally because Docker Desktop is
  unable to start on this machine.
- `npm run preflight:release` / `npm run verify:bundle`: BLOCKED only at the
  Docker runtime step for the same local Docker Desktop reason.
- Preferred deploy path for this run: PlayMCP in KC Git source build from the
  public GitHub `main` branch.
- Local source-card smoke evidence:
  `deploy/playmcp/evidence/local-smoke-source-card-20260629.json`
- Local actual-use smoke evidence:
  `deploy/playmcp/evidence/local-actual-use-source-card-20260629.json`

## Remote Verification

- Endpoint: `https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp`
- Deployment id / revision: `playmcp-in-kc-789`
- PlayMCP in KC server: `dongnesos-mcp-v5`
- `GET /healthz`: PASS
- MCP `tools/list`: `classify_civic_issue`, `draft_civic_report`
- MCP schema check: PASS
- MCP normal classify call: PASS
- MCP normal draft call: PASS
- MCP emergency classify call: PASS
- MCP emergency PII masking: PASS
- MCP emergency draft block: PASS
- Remote strict smoke evidence JSON:
  `deploy/playmcp/evidence/remote-smoke-v5-source-card-20260629.json`
- Remote actual-use smoke evidence JSON:
  `deploy/playmcp/evidence/remote-actual-use-v5-source-card-20260629.json`
- Remote actual-output review: PASS, 8 cases
- Remote actual-output review evidence:
  `deploy/playmcp/evidence/remote-actual-output-review-v5-source-card-20260629.md`

## PlayMCP UI

- Temporary registration status: PASS, Online, Tools 2, endpoint v5
- Console screenshot:
  `deploy/playmcp/evidence/playmcp-console-v5-updated-20260629.png`
- Toolbox status: PASS, `동네SOS` active, MCP Online, Tools 2
- Toolbox browser chat verification: PASS for the two civic-report cases tested
  on 2026-06-29; personal neighbor-help request is handled as current-scope
  boundary / roadmap, not as a civic report.
- Toolbox evidence screenshots:
  - `deploy/playmcp/evidence/playmcp-toolbox-v5-chat-source-card-privacy-20260629.png`
  - `deploy/playmcp/evidence/playmcp-toolbox-v5-chat-source-card-park-glass-20260629.png`
  - `deploy/playmcp/evidence/playmcp-toolbox-v5-chat-neighbor-help-boundary-20260629.png`
- Review request status: NOT_REQUESTED
- Preliminary submission timestamp: PENDING

## Owner Review

- Jessie reviewed: PENDING
- Required changes: PENDING
- Final submit approved: false
