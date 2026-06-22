# PlayMCP Submission Evidence

## Candidate

- Product: `동네SOS / 이거 어디에 말해?`
- Server: `dongnesos-neighborhood-sos`
- MCP endpoint: `https://<kakao-cloud-endpoint>/mcp`
- Health endpoint: `https://<kakao-cloud-endpoint>/healthz`
- Runtime: Node.js >= 20
- SDK: `@modelcontextprotocol/sdk@1.29.0`
- Contest deploy surface: PlayMCP in KC
- Required image architecture for container-image deploy: `linux/amd64`

## Required Local Evidence

Record the fresh command output before deployment:

```bash
cd neighborhood-sos-mcp
npm run check
npm run smoke:http
npm run smoke:dist
npm run smoke:docker
npm run image:build:amd64
npm run image:push:playmcp
npm run preflight:release
npm run package:deploy
npm run verify:bundle
npm run evidence:submission
MCP_URL=https://<kakao-cloud-endpoint>/mcp EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json npm run smoke:endpoint
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
- 48+ node tests pass.
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

## Required Remote Evidence

After Kakao Cloud deployment, capture:

- Deployed endpoint URL:
- Deployment id / revision:
- `GET /healthz` response:
- Production start smoke:
- MCP `tools/list` response showing exactly:
  - `classify_civic_issue`
  - `draft_civic_report`
- MCP `tools/list` schema check:
- MCP `classify_civic_issue` sample call response:
- MCP `draft_civic_report` sample call response:
- Emergency sample showing draft blocked:
- `deploy/playmcp/evidence/remote-smoke.json` path:
- PlayMCP temporary registration status/screenshot:
- Jessie review result:
- One-time preliminary submission timestamp:

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
