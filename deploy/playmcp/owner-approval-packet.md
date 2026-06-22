# Owner Approval Packet

Use this packet when Jessie is ready to allow external account mutation for the
PlayMCP `동네SOS` candidate.

## Current Local State

- Local implementation path:
  `/Users/jessiek/StudioProjects/dongnesos-mcp`
- Public source repo:
  `https://github.com/kjessie00/dongnesos-mcp`
- Current PlayMCP in KC endpoint:
  `https://dongnesos-mcp-v2.playmcp-endpoint.kakaocloud.io/mcp`
- MCP endpoint path after deploy: `/mcp`
- Health endpoint path after deploy: `/healthz`
- Runtime: Node.js >= 20, Docker-ready
- Contest deploy surface: PlayMCP in KC
- Container-image deploy platform: `linux/amd64`
- Required environment:
  - `HOST=0.0.0.0`
  - `PORT` supplied by the hosting platform
- Tools exposed:
  - `classify_civic_issue`
  - `draft_civic_report`

## Required Account State

- The target Kakao account must be signed up on `https://playmcp.kakao.com/`.
- If PlayMCP main still shows `회원가입`, stop and have Jessie complete signup
  with the same Kakao account before retrying PlayMCP in KC.
- If PlayMCP in KC shows `이 서비스는 Agentic Player 10 공모전 참가자만 이용할 수
  있습니다. PlayMCP에 가입한 카카오계정으로 로그인 해주세요.`, the deployment
  gate is still account/contest access, not a code or Docker problem.
- Do not submit the official `[Player 예선 참여]` form until after the MCP server
  has been registered, reviewed, approved, and changed to full-public
  visibility. The official entry is one-time only.

## Local Gate Before External Mutation

Run:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
npm run preflight:release
npm run package:deploy
npm run verify:bundle
npm run evidence:submission
```

Expected result:

- `npm run check` passes.
- `npm run smoke:http` passes.
- `npm run smoke:dist` passes.
- `npm run smoke:docker` passes.
- `deploy/playmcp/evidence/local-release-summary.json` exists and has
  `local_ready_for_external_deploy: true`.
- `deploy/playmcp/package/*.tar.gz` exists with a sidecar manifest and SHA-256.
- `deploy/playmcp/evidence/bundle-verify.json` exists and has `ok: true`.
- `deploy/playmcp/evidence/submission-evidence.generated.md` exists and marks
  not-yet-performed remote/PlayMCP steps as `PENDING`.

## Approval Sentence

External mutation is allowed only after Jessie explicitly says:

```text
Kakao Cloud 배포와 PlayMCP 임시등록까지 진행 승인.
```

If preliminary submission should also happen in the same run, Jessie should say:

```text
Kakao Cloud 배포, PlayMCP 임시등록, 리뷰 요청, 예선 제출까지 진행 승인.
```

## External Steps After Approval

1. Deploy or rebuild this directory through PlayMCP in KC using the public Git
   source build path. If image registration is used instead, build a
   `linux/amd64` image. Public Docker Hub push requires separate confirmation
   unless Jessie has explicitly approved that artifact publication.
2. Record deployment id/revision and endpoint URL.
3. Run:

   ```bash
   MCP_URL=https://<endpoint>/mcp \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json \
   npm run smoke:endpoint
   ```

4. Generate the evidence draft:

   ```bash
   DEPLOYED_ENDPOINT_URL=https://<endpoint>/mcp \
   DEPLOYMENT_ID=<deployment-id-or-revision> \
   npm run evidence:submission
   ```

5. Fill or review `deploy/playmcp/submission-evidence.md`.
6. Register the public MCP endpoint temporarily in PlayMCP.
7. Capture the PlayMCP UI screenshot path/status.
8. Ask Jessie to review in browser.
9. Submit once only after Jessie approves final submission.

## Stop Rules

Stop and report before submission if any of these happen:

- Remote `GET /healthz` is not HTTP 200 with `ok: true`.
- `tools/list` does not return exactly two tools.
- Any tool lacks `inputSchema` or `outputSchema`.
- Emergency sample creates a draft.
- PlayMCP UI rejects the endpoint.
- Jessie asks for changes before submission.
