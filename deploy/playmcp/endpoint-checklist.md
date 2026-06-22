# Endpoint Checklist

Use this before PlayMCP temporary registration.

## Account / Contest Gate

- [ ] The same Kakao account is logged in to `https://playmcp.kakao.com/`.
- [ ] `https://playmcp.kakao.com/` does not show `회원가입`; if it does, Jessie
      must complete PlayMCP signup before PlayMCP in KC can be used.
- [ ] `https://playmcp.kakaocloud.io/` does not show
      `이 서비스는 Agentic Player 10 공모전 참가자만 이용할 수 있습니다.`
- [ ] Do not click or submit `[Player 예선 참여]` yet. It is the one-time final
      preliminary entry after review approval and full-public visibility.

## Build

- [ ] `npm ci` or `npm install`
- [ ] `npm run check`
- [ ] `npm run smoke:http`
- [ ] `npm run smoke:dist`
- [ ] `npm run build`
- [ ] `npm start` resolves to `dist/src/server.js`
- [ ] Optional container path: `docker build -t dongnesos-mcp .`
- [ ] If using PlayMCP in KC image registration from Apple Silicon:
      `npm run image:build:amd64`
- [ ] If image registration requires Docker Hub publication, run
      `npm run image:push:playmcp` as a dry-run first; only run
      `DRY_RUN=0 CONFIRM_EXTERNAL_IMAGE_PUSH=1 npm run image:push:playmcp`
      after Jessie approves external image publication.
- [ ] Optional container runtime smoke: `npm run smoke:docker`
- [ ] Release preflight: `npm run preflight:release`
- [ ] `deploy/playmcp/evidence/local-release-summary.json` says
      `local_ready_for_external_deploy: true`.
- [ ] Source deploy bundle: `npm run package:deploy`
- [ ] Bundle manifest under `deploy/playmcp/package/` excludes
      `node_modules/`, `dist/`, local evidence, and previous package artifacts.
- [ ] Bundle extraction verification: `npm run verify:bundle`
- [ ] `deploy/playmcp/evidence/bundle-verify.json` says `ok: true`.
- [ ] Submission evidence draft: `npm run evidence:submission`
- [ ] `deploy/playmcp/evidence/submission-evidence.generated.md` records local
      proof and leaves missing remote/PlayMCP proof as `PENDING`.

## Runtime

- [ ] `PORT` is set by the hosting platform.
- [ ] `HOST=0.0.0.0`
- [ ] Container image registration uses `linux/amd64`, not Apple Silicon
      `arm64`.
- [ ] If using image registration, `deploy/playmcp/evidence/image-push.json`
      records the pushed image or dry-run plan.
- [ ] `GET /healthz` returns `ok: true`.
- [ ] `POST /mcp` accepts Streamable HTTP MCP traffic.
- [ ] `MCP_URL=https://<endpoint>/mcp EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json npm run smoke:endpoint`
- [ ] No authentication is required for the temporary review endpoint unless
      PlayMCP instructions explicitly require it.

## MCP Contract

- [ ] `tools/list` returns exactly two tools.
- [ ] Each tool in `tools/list` exposes `inputSchema` and `outputSchema`.
- [ ] `classify_civic_issue` returns structured content.
- [ ] `draft_civic_report` returns structured content.
- [ ] Emergency/immediate-danger sample blocks draft generation.
- [ ] Normal civic issue sample can draft.
- [ ] Remote smoke evidence JSON is saved under `deploy/playmcp/evidence/`.
- [ ] Container smoke evidence JSON is saved under `deploy/playmcp/evidence/`
      before remote deploy if using the Docker path.
- [ ] After remote smoke, rerun `npm run evidence:submission` with deployment
      and PlayMCP environment fields as needed.

## Product Boundaries

- [ ] No actual report submission.
- [ ] No login, cookies, or user account access.
- [ ] No photo upload or EXIF parsing.
- [ ] No GPS or precise coordinate collection.
- [ ] No KakaoTalk message read/send.
- [ ] No external government API dependency.
