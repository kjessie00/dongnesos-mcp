# PlayMCP in KC Registration Notes

Use this when Jessie has completed PlayMCP signup with the same Kakao account,
Kakao login succeeds, and Jessie has explicitly approved any non-Kakao registry
publication needed for deployment.

## Account Prerequisite

Before opening PlayMCP in KC, verify `https://playmcp.kakao.com/` no longer
shows the `회원가입` button for the target Kakao account. If PlayMCP in KC shows
`이 서비스는 Agentic Player 10 공모전 참가자만 이용할 수 있습니다. PlayMCP에 가입한
카카오계정으로 로그인 해주세요.`, stop and have Jessie complete PlayMCP signup
with that same Kakao account.

Do not use the official `[Player 예선 참여]` form at this stage. The official
contest page says final preliminary entry happens after endpoint creation,
PlayMCP registration, review approval, and full-public visibility, and that the
entry is one-time only.

## Current Preferred Path

The official contest guide points to PlayMCP in KC first:

1. Open `https://playmcp.kakaocloud.io/`.
2. Register a new MCP server using either Git source build or image
   registration.
3. Copy the generated Endpoint URL after the server becomes `Active`.
4. Run remote endpoint smoke:

   ```bash
   MCP_URL=https://<endpoint>/mcp \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json \
   npm run smoke:endpoint
   ```

5. Register that endpoint temporarily in the PlayMCP developer console.

## Image Registration Fields

Use this path only after confirming external image publication is acceptable.

- MCP server name: `dongnesos-mcp`
- Description: `동네 생활 불편을 분류하고 안전한 민원 신고 준비문을 만드는 PlayMCP 서버`
- Registry host: `docker.io`
- Registry user/password: leave blank if the image is public
- image_name: `kjessie00/dongnesos-mcp`
- image_tag: `playmcp-20260622`
- Required platform: `linux/amd64`

Local build and guarded push commands:

```bash
npm run image:build:amd64
npm run image:push:playmcp
DRY_RUN=0 CONFIRM_EXTERNAL_IMAGE_PUSH=1 npm run image:push:playmcp
```

The middle command is a dry-run and writes
`deploy/playmcp/evidence/image-push.json` without pushing.

## Git Source Build Fields

Current path used for the deployed candidate.

- MCP server name: `dongnesos-mcp`
- Description: `동네 생활 불편을 분류하고 안전한 민원 신고 준비문을 만드는 PlayMCP 서버`
- Git URL: `https://github.com/kjessie00/dongnesos-mcp`
- Branch/ref: `main` or the selected release tag
- Dockerfile path: `Dockerfile`
- PAT: not required for the public repo

Update/rollback rule: merge review-ready fixes to `main`, push, then rebuild the
PlayMCP in KC server before requesting review. If a pushed fix is bad, revert on
`main`, push, rebuild, and rerun `npm run smoke:endpoint` against the public
endpoint before changing PlayMCP visibility or requesting review.
