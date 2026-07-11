# PlayMCP Submission Evidence

## Candidate

- Product: `동네SOS / 이거 어디에 말해?`
- Server: `dongnesos-neighborhood-sos`
- MCP endpoint: `https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp`
- Health endpoint: `https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/healthz`
- Runtime: Node.js >= 20
- SDK: `@modelcontextprotocol/sdk@1.29.0`
- Contest deploy surface: PlayMCP in KC
- Required image architecture for container-image deploy: `linux/amd64`
- Public source repo: `https://github.com/kjessie00/dongnesos-mcp`
- Current PlayMCP in KC server: `dongnesos-mcp-v7` (detail id: verify in console; v6 also active, account limit 2/2)
- Current review state: temporary registration Online, Tools 2, console endpoint must be verified/updated to v7, review not requested
- Contest deadline: preliminary entry closes 2026-07-14; review avg 1-2 business days, so review request must go out by 2026-07-10

## Required Local Evidence

Record the fresh command output before deployment:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
npm run check
npm run smoke:http
npm run smoke:dist
npm run smoke:docker
npm run preflight:release
npm run package:deploy
npm run verify:bundle
npm run evidence:submission
MCP_URL=https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json \
npm run smoke:endpoint
MCP_URL=https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-p1.json \
npm run smoke:actual-use:endpoint
DEPLOYED_ENDPOINT_URL=https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
DEPLOYMENT_ID=playmcp-in-kc-v7 \
PLAYMCP_TEMP_REGISTRATION_STATUS='PENDING: verify console endpoint points to v7, then record readback' \
PLAYMCP_TEMP_REGISTRATION_EVIDENCE='deploy/playmcp/evidence/playmcp-temp-registration-v7-status.json' \
PLAYMCP_REVIEW_REQUEST_STATUS='NOT_REQUESTED' \
JESSIE_REVIEWED='PENDING' \
JESSIE_FINAL_SUBMIT_APPROVED='false' \
npm run evidence:submission
```

## Account / Contest Gate

- PlayMCP signup must be completed at `https://playmcp.kakao.com/` with the same
  Kakao account used for PlayMCP in KC.
- If PlayMCP in KC blocks with `이 서비스는 Agentic Player 10 공모전 참가자만 이용할
  수 있습니다. PlayMCP에 가입한 카카오계정으로 로그인 해주세요.`, resolve the
  PlayMCP account/participant gate first; do not debug the local server.
- The official `[Player 예선 참여]` form is not the temporary-registration step.
  It is the one-time final preliminary entry after endpoint creation, PlayMCP
  registration, review approval, and full-public visibility.

Expected local proof:

- 28 taxonomy items validated.
- Policy scan passes with no external API, submit, location, photo/EXIF, or
  KakaoTalk read surface in core/tool code.
- 61+ node tests pass.
- TypeScript build passes.
- HTTP MCP smoke confirms exactly two tools and successful `classify` + `draft`
  calls.
- MCP `tools/list` exposes both `inputSchema` and `outputSchema` for each tool.
- Compiled production start smoke confirms `dist/src/server.js` serves
  `/healthz`.
- Docker build/run smoke confirms the container serves `/healthz`.
- Release preflight writes `deploy/playmcp/evidence/local-release-summary.json`
  with command status, critical file hashes, and pending external gates.
- Deploy packaging writes a source tarball and manifest under
  `deploy/playmcp/package/`, excluding `node_modules`, `dist`, local evidence,
  and previous package artifacts.
- Bundle verification extracts the latest tarball into a temporary directory,
  runs `npm ci`, `npm run preflight:release`, and `npm run evidence:submission`,
  then writes `deploy/playmcp/evidence/bundle-verify.json`.
- Submission evidence generation writes
  `deploy/playmcp/evidence/submission-evidence.generated.md`, marking any
  missing remote or PlayMCP proof as `PENDING`.
- Remote endpoint smoke records health, tools schema exposure, normal classify,
  normal draft, emergency classify, and emergency draft-block evidence.
- Remote actual-use smoke records P1 user-story regressions: no duplicate draft
  title, streetlight crime-anxiety drafting, apartment-unit masking,
  out-of-scope forbidden-claim neutralization, and personal-help
  non-classification.

## Required Remote Evidence

After Kakao Cloud deployment, capture:

- Deployed endpoint URL: `https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp`
- Deployment id / revision: `dongnesos-mcp-v7` (confirm detail id in PlayMCP in KC console)
- `GET /healthz` response: PASS
- Production start smoke: PASS
- MCP `tools/list` response showing exactly:
  - `classify_civic_issue`
  - `draft_civic_report`
- MCP `tools/list` schema check: PASS
- MCP `classify_civic_issue` sample call response: PASS
- MCP `draft_civic_report` sample call response: PASS
- Emergency sample showing draft blocked: PASS
- Emergency sample showing PII masked before redirect: PASS
- `deploy/playmcp/evidence/remote-smoke.json` path: recorded
- `deploy/playmcp/evidence/remote-actual-use-p1.json` path: PASS after the
  endpoint has been rebuilt from the current Git commit
- PlayMCP temporary registration status/evidence: verify v7 / `deploy/playmcp/evidence/playmcp-temp-registration-v7-status.json`
- Jessie review result: PENDING
- One-time preliminary submission timestamp: PENDING

Owner approval and stop rules are recorded in
`deploy/playmcp/owner-approval-packet.md`.

## Review Notes

- Do not submit a stdio-only server.
- Do not add a third MCP tool without reopening product scope.
- Do not add actual government submission, KakaoTalk read/send, photo upload,
  EXIF parsing, GPS collection, or external API lookup for the preliminary
  version.
- If PlayMCP UI accepts `Pro` without `Pro 확장`, treat the `Pro` label as the
  successful reviewer lane.
- Actual-use QA and the future `이웃 도움 교류` design are documented in
  `docs/actual-use-and-neighbor-help-design.md`. That neighbor-help mode is a
  roadmap extension only; it must not be represented as implemented in the
  current two-tool review candidate.
