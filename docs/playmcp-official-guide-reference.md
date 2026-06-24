# PlayMCP / Kakao Cloud Official Guide Reference

Last refreshed: 2026-06-24 14:37 KST

This is the working source-of-truth document for DongneSOS PlayMCP deployment,
registration, review, and Kakao/KakaoCloud optimization. Keep it updated before
changing deployment, review state, Kakao API usage, or contest submission.

## 1. Current DongneSOS Hosting Status

DongneSOS is currently hosted on KakaoCloud through PlayMCP in KC. It is not
served from the local machine, GitHub Pages, Vercel, or DockerHub.

| Item | Current value |
|---|---|
| Canonical local repo | `/Users/jessiek/StudioProjects/dongnesos-mcp` |
| Public source repo | `https://github.com/kjessie00/dongnesos-mcp` |
| Live hosting surface | PlayMCP in KC / KakaoCloud managed MCP endpoint |
| Build mode | Git source build from GitHub `main` with `Dockerfile` |
| PlayMCP in KC server name | `dongnesos-mcp-v3` |
| Deployment/detail id | `487` |
| Build job | `mcp-build-apply-487` |
| MCP endpoint | `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp` |
| Health endpoint | `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz` |
| Exposed tools | `classify_civic_issue`, `draft_civic_report` |
| PlayMCP console registration | `동네SOS` / identifier `dongnesos` |
| PlayMCP MCP id | `62426279747569122` |
| Review request | Not submitted |
| Public visibility | Not public |

Fresh readback on 2026-06-24:

```bash
curl -sS https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz
```

returned:

```json
{"ok":true,"service":"dongnesos-neighborhood-sos","version":"0.1.0","tools":["classify_civic_issue","draft_civic_report"]}
```

Important current caveat:

- The v3 server is up, but it is stale against the latest local review-quality
  patch.
- Fresh strict remote smoke on 2026-06-24 failed with:
  `AssertionError [ERR_ASSERTION]: classify_civic_issue annotations missing`.
- That means the current KakaoCloud endpoint must be rebuilt from the patched
  Git source and then refreshed in the PlayMCP developer console before review.

## 2. Official Source Inventory

Primary official pages to re-check before review or submission:

- PlayMCP public site: `https://playmcp.kakao.com/`
- PlayMCP developer console: `https://playmcp.kakao.com/console`
- PlayMCP in KC: `https://playmcp.kakaocloud.io/`
- PlayMCP in KC AI index: `https://playmcp.kakaocloud.io/llms.txt`
- PlayMCP in KC AI guide: `https://playmcp.kakaocloud.io/ai/guide.md`
- AGENTIC PLAYER 10 contest page:
  `https://b.kakao.com/views/PlayMCP/AGENTIC_PlAYER_10`
- Kakao press release, AGENTIC PLAYER 10:
  `https://www.kakaocorp.com/page/detail/12059`
- Kakao press release, PlayMCP toolbox:
  `https://www.kakaocorp.com/page/detail/11817`
- Kakao press release, PlayMCP beta open:
  `https://www.kakaocorp.com/page/detail/11674`
- Official Notion guide, PlayMCP server development:
  `https://www.notion.so/MCP-2d89b97b4888808a9e1dc17a13e70187`
- Official Notion help:
  `https://www.notion.so/2189b97b4888803dbbdcef264e7eff58`
- Official Notion review policy:
  `https://www.notion.so/21b9b97b48888024922ec3dfcacf97e5`

## 3. PlayMCP in KC / KakaoCloud Hosting Rules

PlayMCP in KC is the KakaoCloud hosting portal for MCP servers. Its role is:

1. Deploy the user's MCP server on KakaoCloud.
2. Produce an Endpoint URL.
3. Let the user register that Endpoint URL in the PlayMCP console.

Official deployment methods:

- Git source build: Git URL, branch/ref, optional Dockerfile path, optional PAT
  for private HTTPS repositories.
- Existing image: registry host, image name, image tag, optional registry
  credentials.

Official decision flow:

1. If the project has source in Git and a Dockerfile, use Git source build.
2. If a container image is already pushed to a registry, use existing image
   registration.
3. After deployment becomes active, copy the Endpoint URL from the server detail
   page.
4. Register that Endpoint URL in the PlayMCP console.

Useful portal API routes documented for AI assistants:

- `GET /api/v2/mcp/my-mcp-servers`
- `POST /api/v2/mcp/builder/image-mcp-servers`

Git source build payload fields:

- `server_name`
- `description`
- `image_build_mode: "git"`
- `git_url`
- `git_ref`
- `dockerfile`
- `registry`
- `image_name`
- `image_tag`
- optional `git_pat`

Security rules:

- Do not ask the user to paste secrets into chat.
- Private Git PATs and registry passwords should be entered only in the portal
  or through an approved secure automation path.
- Validate that the repo has a Dockerfile before recommending Git source build.
- MCP server names should use lowercase letters, numbers, hyphens, and dots to
  fit the portal's Kubernetes DNS constraints.

DongneSOS implication:

- The current Git source build path is correct and preferred.
- DockerHub is not needed unless we choose an explicit image-publishing route.
- GitHub is source control only; KakaoCloud is the live runtime.

## 4. AGENTIC PLAYER 10 Contest Flow

Official preliminary flow:

1. Create an MCP server Endpoint in KakaoCloud.
2. Register that Endpoint in the PlayMCP developer console.
3. If it is not final, save as temporary registration only.
4. When final development is complete, click `등록 및 심사 요청`.
5. After approval, the initial visibility is `나에게만 공개`.
6. Change visibility to `전체 공개`; otherwise the service is excluded from
   contest entry.
7. Use the page's `[Player 예선 참여]` button for final preliminary entry.

Contest dates on the official page:

- Preliminary registration: 2026-06-15 to 2026-07-14.
- Preliminary result announcement: 2026-07-30.
- Finalist development period: 2026-07-30 to 2026-08-27.
- Public voting: 2026-08-31 to 2026-09-28.
- Final award event: 2026-10-23 at Kakao AI Campus.

Contest constraints and judging:

- Preliminary stage selects 20 services.
- Finalist services are exposed through Kakao Tools for KakaoTalk users.
- Final winners are selected through user voting plus expert judging.
- Official evaluation criteria: creativity, convenience, stability.
- KakaoCloud use is required for preliminary participation unless official
  capacity exhaustion changes the rule by notice.
- Contest MCP servers are limited to two per person.
- Provided servers are for contest participation and may be reclaimed for
  non-contest use.
- Final preliminary entry can be submitted only once.

## 5. Kakao Tools and Kakao API Strategy

The current DongneSOS server uses Kakao optimally at the hosting and registration
layer:

- KakaoCloud / PlayMCP in KC hosts the live MCP runtime.
- PlayMCP developer console registers the endpoint, status, metadata, image, and
  review state.
- PlayMCP client/LLM surfaces call the two MCP tools.

The current server does not call Kakao service APIs internally. That is an
intentional safety choice, not a missing deploy feature.

Recommended Kakao/KakaoCloud roadmap:

| Area | Current decision | Rationale |
|---|---|---|
| PlayMCP in KC | Use now | Official preliminary hosting path |
| PlayMCP console | Use now | Required registration/review layer |
| Kakao Tools | Prepare if finalist | Official FAQ says finalist services must expose through Kakao Tools |
| Kakao Tools Widget specs | Finalist track | Official FAQ says Kakao Tools supports widget specs and stricter MCP standards |
| Kakao Maps / Local APIs | Consider later with consent | Useful for place context, but only if it avoids precise home-location leakage |
| KakaoTalk data APIs | Do not add now | Needs official OAuth/consent and Kakao Tools context; never scrape or read chats |
| Kakao account auth | Only if needed | Current tool is read-only and stateless; no login needed |
| External browser scraping | Avoid | Review policy penalizes unnecessary redirects/crawling and privacy risk |

Practical next step:

- Do not add a Kakao API just to appear "Kakao-integrated".
- First make the current MCP outputs review-grade, rebuild on KakaoCloud, and
  refresh PlayMCP metadata.
- In parallel, design a finalist/Kakao Tools upgrade plan with widget-ready
  outputs and optional Kakao Maps integration behind explicit privacy rules.

## 6. Official MCP Server Development Rules

The official PlayMCP server development guide was updated on 2026-06-12.

Server requirements:

- Supported MCP spec version range: minimum `2025-03-26`, maximum `2025-11-25`.
- Transport: Streamable HTTP only.
- Server type: remote MCP only.
- URL: publicly accessible domain required.
- Stateless MCP server is recommended.
- If user authentication is needed, support OAuth or custom header auth.
- Check standard compliance with MCP Inspector before registration/review.
- Use or reference an actively maintained SDK.
- MCP Server Name or Tool Name must not contain `kakao` as prefix, suffix, or
  middle text, case-insensitive, unless separately agreed.

Tool naming:

- Tool name length: 1 to 128 characters.
- Allowed characters: English letters, digits, underscore, hyphen.
- Tool names must be unique.
- Tool names are case-sensitive.

Tool count:

- Development guide: do not exceed 20 tools; 3 to 10 is recommended.
- Review policy: at least one tool is required; 3 to 20 is described as
  appropriate.
- DongneSOS has two tools. This satisfies the policy minimum but is below the
  guide recommendation. Do not add a third tool unless it improves user value.

Required tool properties:

- `name`
- `description`
- `inputSchema`
- `annotations`

Required annotation fields:

- `title`
- `readOnlyHint`
- `destructiveHint`
- `openWorldHint`
- `idempotentHint`

Description guidance:

- English descriptions are recommended.
- Include the MCP/service name in the description.
- If using a proper noun service name, include both English and Korean where
  relevant.
- Keep each tool description within 1,024 characters.
- Avoid overly long descriptions because they can reduce tool-call quality.
- Kakao Tools automatically adds the PlayMCP prefix, so raw tool names do not
  need to include the MCP name.

Result guidance:

- Keep result size minimal.
- For errors and non-widget JSON responses, provide refined text/Markdown
  instead of dumping raw API responses.
- Raw API payloads add irrelevant data and can reduce answer quality.

OAuth guidance:

- OAuth redirect URI pattern:
  `https://playmcp.kakao.com/api/v1/applied-mcps/{mcpId}/authorize/oauth:callback`
- Replace `{mcpId}` with the registered MCP id.
- If personal data is passed to Kakao, the guide recommends a third-party
  personal-information-provision consent screen.

Operations:

- Tool response speed target: average within 100 ms.
- Tool response p99 must be within 3,000 ms.
- Tool answers must not induce ad exposure.

## 7. Official Review Policy Highlights

Basic review:

- MCP Server must include at least one tool.
- Too many tools make AI tool selection difficult.
- Spec violations or abnormal behavior can cause rejection.
- Policy violations after approval can cause tools to be disabled or
  registration to be withdrawn.
- Third-party service credentials can affect review depending on ownership and
  authorization.
- Automatically generated MCP servers from third-party platforms can be rejected
  because ownership and compliance are hard to verify.
- Repeated structurally identical MCP submissions can be restricted.
- MCPs that only provide what an LLM can already do through web search may be
  rejected or limited unless the extension purpose is clear.
- Internal quality thresholds include stability, creativity, and response
  consistency.
- MCP name and description must clearly communicate the function.
- Requiring a paid account/subscription to use the tool can be a rejection
  reason.

Tool behavior:

- Test every tool before review.
- Slow responses or frequent timeouts can cause rejection.
- Excessive redirects, crawling delays, or unnecessary external calls can cause
  rejection because of performance impact.
- Outbound links may be included when needed.
- Excessive commercial links, purchase inducement, or rewards can cause
  rejection.
- Vulgar, political, sexual, or socially unacceptable content can cause
  rejection.
- Dangerous file downloads or malicious-use surfaces can cause rejection or
  non-public treatment.
- Tool response text above 24k is treated as an error and can cause rejection.

Privacy:

- Do not collect or request personal data unrelated to tool function.
- Do not transmit user authentication data or sensitive data externally except
  when strictly necessary.
- OAuth / token / key information must be used only for the stated tool purpose.
- Tools that request or return resident registration numbers, driver's license
  numbers, passport numbers, alien registration numbers, card numbers, or bank
  account numbers can be rejected.

Review process:

- Review is completed within seven business days, average one to two days.
- Review state and supplement requests are sent to the email in
  `내 정보 관리 > 연결된 이메일`.
- Additional review questions should use the PlayMCP Discord.
- If tool information changes after approval/publication, run `정보 불러오기`
  again in MCP information edit so the updated tool info is reflected. This can
  trigger re-review.

Other:

- If an approved public MCP becomes unstable, the operator can disable it.
- Representative images cannot be animated.
- Representative images must match the service and should not be low-quality or
  inappropriate.
- PlayMCP currently does not handle MCP `Resource` and `Prompt` information.

## 8. DongneSOS Compliance Matrix

| Requirement | Current status | Evidence / note |
|---|---|---|
| Remote public URL | Up but stale | v3 `/healthz` returns `ok: true`; strict smoke fails missing annotations |
| KakaoCloud hosting | Pass | Hosted through PlayMCP in KC endpoint |
| Streamable HTTP | Pass | `src/server.ts` uses `StreamableHTTPServerTransport` |
| Stateless | Pass | No persistent session dependency in the MCP tools |
| Active SDK | Pass | `@modelcontextprotocol/sdk` is used |
| No `kakao` in server/tool names | Pass | `dongnesos-neighborhood-sos`, `classify_civic_issue`, `draft_civic_report` |
| Tool count | Acceptable but below recommendation | 2 tools; policy minimum is 1, guide recommends 3-10 |
| `inputSchema` / `outputSchema` | Pass | Existing remote smoke validates schemas |
| Tool `annotations` | Local pass / remote pending | Local code patched; v3 remote still missing annotations until rebuild |
| Response size below 24k | Likely pass | Actual-output evidence is compact; keep regression guard |
| No unnecessary external calls | Pass | Core tools do not call external APIs |
| No ads/commercial links | Pass | No purchase/ad/reward behavior |
| PII handling | Pass for tested cases | Phone/unit masking tested |
| Emergency handling | Pass for tested cases | Emergency samples block draft and redirect |
| PlayMCP temporary registration | Pass | Registered as `동네SOS` / `dongnesos` |
| Review request state | Not submitted | Owner-gated |
| Final contest entry | Not submitted | One-time owner-gated action |

## 9. Required Actions Before Review Request

Do not click `등록 및 심사 요청` until all items below pass.

1. Commit and push the latest local review-quality patch to GitHub `main`.
2. Rebuild or recreate the PlayMCP in KC server from that Git source.
3. Confirm the new KakaoCloud endpoint is active.
4. In PlayMCP developer console, update the MCP endpoint if changed and run
   `정보 불러오기` so tool schema/metadata/annotations are refreshed.
5. Re-run strict remote smoke:

   ```bash
   MCP_URL=https://<endpoint>/mcp \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-post-quality-loop-final.json \
   npm run smoke:endpoint
   ```

6. Re-run remote actual-use smoke:

   ```bash
   MCP_URL=https://<endpoint>/mcp \
   COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-post-quality-loop-final.json \
   npm run smoke:actual-use:endpoint
   ```

7. Re-run actual-output review evidence:

   ```bash
   MCP_URL=https://<endpoint>/mcp \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-output-review-post-quality-loop-final.json \
   MARKDOWN_OUT=deploy/playmcp/evidence/remote-actual-output-review-post-quality-loop-final.md \
   npm run review:actual-output:endpoint
   ```

8. Run specialist review on the final remote outputs.
9. Ask Jessie for explicit approval before review request.
10. After approval, request PlayMCP review.
11. After review approval, change visibility to `전체 공개`.
12. Ask Jessie for explicit approval before one-time `[Player 예선 참여]`.

## 10. Reference Commands

Local repo status:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
git status --short --branch
```

Health:

```bash
curl -sS https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz
```

Current strict remote smoke check:

```bash
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-doc-refresh-expected-stale.json \
npm run smoke:endpoint
```

Submission evidence refresh:

```bash
DEPLOYED_ENDPOINT_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
DEPLOYMENT_ID=playmcp-in-kc-487 \
REMOTE_SMOKE_EVIDENCE=deploy/playmcp/evidence/remote-smoke-v3-post-registration-20260623T141620Z.json \
PLAYMCP_TEMP_REGISTRATION_STATUS='PASS: temporary registration Online, Tools 2, endpoint updated to v3, review not requested' \
PLAYMCP_TEMP_REGISTRATION_EVIDENCE='deploy/playmcp/evidence/playmcp-temp-registration-v3-status.json' \
PLAYMCP_REVIEW_REQUEST_STATUS='NOT_REQUESTED' \
JESSIE_FINAL_SUBMIT_APPROVED='false' \
npm run evidence:submission
```
