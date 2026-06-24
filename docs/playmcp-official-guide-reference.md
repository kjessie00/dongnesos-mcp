# PlayMCP / Kakao Cloud Official Guide Reference

Date: 2026-06-24 KST

This document is the working reference for DongneSOS PlayMCP deployment,
registration, review, and contest readiness. It consolidates official Kakao /
PlayMCP public pages, official Notion guide pages, and the current local
deployment evidence.

## 1. Current DongneSOS Hosting Status

DongneSOS is currently hosted on Kakao Cloud's PlayMCP contest deployment
surface, not on this local machine and not on GitHub Pages.

- Deployment surface: PlayMCP in KC / Kakao Cloud managed MCP endpoint
- Build mode: Git source build from `https://github.com/kjessie00/dongnesos-mcp.git`
- Current PlayMCP in KC server name: `dongnesos-mcp-v3`
- Current PlayMCP in KC deployment/detail id: `487`
- Build job: `mcp-build-apply-487`
- Current MCP endpoint: `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp`
- Current health endpoint: `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz`
- Health readback: `ok: true`, service `dongnesos-neighborhood-sos`, tools
  `classify_civic_issue`, `draft_civic_report`
- PlayMCP developer-console registration: `동네SOS / dongnesos`
- Developer-console MCP id: `62426279747569122`
- Registration status: temporary / `CREATED`, `published: false`, review request not submitted
- Registration endpoint: v3 endpoint above
- Registration evidence: `deploy/playmcp/evidence/playmcp-temp-registration-v3-status.json`

Important distinction:

- GitHub is only the source repo.
- PlayMCP in KC / Kakao Cloud is serving the live endpoint.
- PlayMCP developer console is the catalog/review/visibility registration layer.
- The current tools do not call Kakao service APIs internally. They only use
  Kakao Cloud hosting and PlayMCP registration. Any future Kakao Maps,
  KakaoTalk, Kakao Tools, or other Kakao API integration should use official
  Kakao/PlayMCP surfaces and explicit user consent, not scraping or browser
  automation.

## 2. Official Source Inventory

Use these as the source of truth before changing deployment, review, or contest
submission behavior.

- PlayMCP public site: `https://playmcp.kakao.com/`
- AGENTIC PLAYER 10 contest page:
  `https://b.kakao.com/views/PlayMCP/AGENTIC_PlAYER_10`
- Kakao press release, AGENTIC PLAYER 10:
  `https://www.kakaocorp.com/page/detail/12059`
- Kakao press release, PlayMCP toolbox:
  `https://www.kakaocorp.com/page/detail/11817`
- Kakao press release, PlayMCP beta open:
  `https://www.kakaocorp.com/page/detail/11674`
- Official Notion guide, MCP server development:
  `https://www.notion.so/MCP-2d89b97b4888808a9e1dc17a13e70187`
- Official Notion help:
  `https://www.notion.so/2189b97b4888803dbbdcef264e7eff58`
- Official Notion review policy:
  `https://www.notion.so/21b9b97b48888024922ec3dfcacf97e5`
- PlayMCP in KC AI-readable deployment index:
  `https://playmcp.kakaocloud.io/llms.txt`
- PlayMCP in KC AI deployment guide:
  `https://playmcp.kakaocloud.io/ai/guide.md`

## 3. PlayMCP in KC Deployment Guide

The PlayMCP in KC AI guide defines the hosting portal's role clearly:

- PlayMCP in KC deploys MCP servers on KakaoCloud.
- It returns an Endpoint URL.
- The Endpoint URL is then registered in the PlayMCP console.

Recommended deployment decision:

1. Use Git source build when the repo has a Dockerfile.
2. Use existing image registration when a container image already exists in a
   registry.
3. After the deployment becomes active, copy the Endpoint URL from the server
   detail page.
4. Register that Endpoint URL in the PlayMCP console.

UI flow:

1. Open `https://playmcp.kakaocloud.io/`.
2. Sign in.
3. Open `My MCP`.
4. Click `새 MCP 서버 등록`.
5. Choose `이미지 등록`.
6. Choose either `Git 소스 빌드` or `기존 이미지 활용`.
7. Submit the form and wait for the server to become active.
8. Copy the Endpoint URL.
9. Open `https://playmcp.kakao.com/console` and register the Endpoint URL.

Important deployment API routes:

- List user's MCP servers: `GET /api/v2/mcp/my-mcp-servers`
- Create image-backed MCP server:
  `POST /api/v2/mcp/builder/image-mcp-servers`

Git source build request shape:

- `server_name`
- `description`
- `image_build_mode: "git"`
- `git_url`
- `git_ref`
- `dockerfile`
- `registry`
- `image_name`
- `image_tag`
- optional `git_pat` for private HTTPS repositories

Existing image request shape:

- `server_name`
- `description`
- `image_build_mode: "existing"`
- `registry`
- `image_name`
- `image_tag`
- optional `registry_user`
- optional `registry_password`
- optional `skip_tls_verify`

Safety notes for AI agents:

- Do not ask users to paste secrets into chat.
- Private Git PATs and registry passwords should be entered only in the portal
  form or through an approved secure automation path.
- Validate that the repository contains a Dockerfile before recommending Git
  source build.
- MCP server names should use lowercase letters, numbers, hyphens, and dots to
  match the portal's Kubernetes DNS naming constraints.

DongneSOS implication:

- The current `dongnesos-mcp-v3` path correctly uses the Git source build route.
- GitHub remains the source of truth for code, but the live server is KakaoCloud
  hosting under the PlayMCP in KC endpoint.
- DockerHub is not preferred here because the official AI guide recommends Git
  source build when a repo with a Dockerfile exists; it also avoids adding a
  separate registry ownership/credential surface unless an image registry is
  already part of the workflow.

## 4. AGENTIC PLAYER 10 Official Flow

Official contest flow:

1. Create an MCP server endpoint in Kakao Cloud.
2. Register that endpoint in the PlayMCP developer console.
3. While testing, save as temporary registration. Do not request review while
   the server is still temporary/test-only.
4. When final development is complete, use `등록 및 심사 요청`.
5. After review approval, the initial public state is `나에게만 공개`; change it
   to `전체 공개` for contest participation.
6. Use the contest page's `[Player 예선 참여]` button for the final preliminary
   entry. The final entry can be submitted only once.

Contest notes:

- Preliminary registration period in the official page: 2026-06-15 to 2026-07-14.
- Preliminary results: 2026-07-30.
- Finalist development period: 2026-07-30 to 2026-08-27.
- Public voting: 2026-08-31 to 2026-09-28.
- Final award event: 2026-10-23 at Kakao AI Campus.
- Preliminary review selects 20 services.
- Finalists are expected to expose the service through Kakao Tools for user
  voting and final judging.
- Official evaluation criteria: creativity, convenience, stability.

Kakao Cloud requirement:

- The contest page states that preliminary participation requires Kakao Cloud,
  and contest participants receive Kakao Cloud MCP server support during the
  preliminary period.
- If prepared cloud capacity is exhausted, the official page says a separate
  notice may allow participation without cloud connection; in that case, cloud
  use itself does not affect judging.
- Contest MCP servers are limited to two per person.
- Provided servers are for contest participation only and may be reclaimed for
  non-contest use.

## 5. Kakao Tools Implication

Kakao's official AGENTIC PLAYER 10 page distinguishes PlayMCP from Kakao Tools.

- Preliminary phase: register and review through PlayMCP.
- Finalist phase: services are exposed to KakaoTalk users through Kakao Tools.
- Kakao Tools requires additional development for finalist services.
- Kakao Tools can provide enhanced answers through Widget specs and stricter MCP
  standard compliance than PlayMCP.

DongneSOS implication:

- The current PlayMCP candidate should be optimized for clear, reliable tool
  responses now.
- If DongneSOS advances, plan a Kakao Tools upgrade track: widget-ready output,
  stricter MCP spec compliance, user-facing UX cards, and tighter response
  consistency.

## 6. Official MCP Server Development Rules

From the official PlayMCP server development guide, updated 2026-06-12:

Server requirements:

- Supported MCP spec version range: minimum `2025-03-26`, maximum `2025-11-25`.
- Transport: Streamable HTTP only.
- Server type: Remote MCP only.
- URL: publicly accessible domain required.
- Runtime shape: stateless MCP server recommended, no session.
- Auth: if user authentication is needed, support OAuth or custom header auth.
- Use MCP Inspector to check standard compliance before registration/review.
- Use or reference an actively maintained SDK.
- MCP Server Name or Tool Name must not use `kakao` as prefix, suffix, or
  contained text, case-insensitive, unless separately agreed.

Tool naming:

- Tool name length: 1 to 128 characters.
- Allowed characters: English letters, digits, underscore, hyphen.
- Tool names must be unique.
- Tool names are case-sensitive.

Tool count:

- Official development guide: do not exceed 20 tools; recommended 3 to 10 tools.
- Review policy: MCP server must contain at least one tool; 3 to 20 is described
  as an appropriate range.
- Practical implication: two tools is not below the review-policy minimum, but
  it is below the development-guide recommended range. Do not add a third tool
  just to satisfy a recommendation unless it improves user value and output
  clarity.

Required tool properties:

- `name`
- `description`
- `inputSchema`
- `annotations`

The guide says `annotations` should specify all of:

- `title`
- `readOnlyHint`
- `destructiveHint`
- `openWorldHint`
- `idempotentHint`

Description guidance:

- English description is recommended.
- Include the MCP/service name in the description.
- If using a proper noun service name, include both English and Korean where
  relevant.
- Keep each tool description within 1,024 characters.
- Avoid overly long descriptions because they can reduce tool-call quality and
  affect selection against other tools.
- Kakao Tools automatically includes the PlayMCP prefix in tool names, so the
  raw tool name does not need to contain the MCP name.

Result guidance:

- Keep result size minimal.
- For errors and non-widget JSON responses, provide refined text/Markdown
  rather than passing raw API responses through.
- Raw API payloads are discouraged because they add irrelevant data and can
  reduce answer quality.

OAuth guidance:

- After registering an OAuth MCP, configure the OAuth client redirect URI.
- Redirect URI pattern:
  `https://playmcp.kakao.com/api/v1/applied-mcps/{mcpId}/authorize/oauth:callback`
- Replace `{mcpId}` with the registered MCP id.
- If personal data is passed to Kakao, the guide recommends a third-party
  personal-information-provision consent screen.

Operations:

- Tool response speed target: average within 100 ms; p99 within 3,000 ms.
- Tool answers must not induce ad exposure.

## 7. Official Review Policy Highlights

Basic review:

- MCP Server must include at least one tool.
- Too many tools can make AI tool selection difficult.
- Spec violations or abnormal behavior can cause rejection.
- Policy violations after approval can cause tools to be disabled or
  registration to be withdrawn.
- If a third-party service's credentials are used, the relationship between the
  registrant and credential provider may affect review.
- Automatically generated MCP servers from third-party platforms such as Zapier
  MCP may be rejected because ownership and policy compliance are hard to verify.
- Repeatedly submitting structurally identical MCPs can be restricted.
- MCPs that only provide functionality an LLM can already do through web search
  may be rejected or limited, unless the MCP clearly extends or adds capability.
- Internal quality thresholds include stability, creativity, and response
  consistency.
- MCP name and description must clearly communicate function; abstract or vague
  wording can trigger revision requests.
- If using the tool requires a paid account/subscription, that can be a rejection
  reason.

Tool behavior:

- Test every tool before review.
- Slow responses or frequent timeouts can cause rejection.
- Even if a tool works, excessive redirects, crawling delays, or unnecessary
  external calls can cause rejection because of performance impact.
- Outbound links may be included when needed.
- Excessive commercial links, purchase inducements, or reward offers can cause
  rejection.
- Vulgar, political, sexual, or socially unacceptable content can cause rejection.
- Dangerous file downloads or malicious-use surfaces can cause rejection or
  non-public treatment.
- Tool response text above 24k is treated as an error and can cause rejection.

Name/description:

- `kakao` may not be used as server/tool name prefix or suffix without prior
  consultation.
- Tool description should be detailed enough for LLM understanding; Korean or
  English is recommended.
- Name should be concise and represent the service. Avoid redundant generic
  keywords such as `AI`, `Bot`, `Service`.

Privacy:

- Do not collect or request personal data unrelated to tool function.
- Do not transmit user auth data or sensitive data externally except when
  strictly necessary.
- OAuth / Token / Key information must be used only for the tool's stated
  purpose.
- Tools that request or return the following can be rejected:
  resident registration number, driver's license number, passport number,
  alien registration number, card number, bank account number.

Review process:

- Review is completed within seven business days, average one to two days.
- Status and supplement requests are sent to the email in `내 정보 관리 > 연결된 이메일`.
- Additional review inquiries should use the PlayMCP Discord.
- If tool information changes after approval/publication, run `정보 불러오기` again
  in MCP information edit so the updated tool info is reflected.

Other review notes:

- If an approved public MCP becomes unstable or repeatedly fails to respond, the
  operator can disable it.
- MCP representative images cannot be animated images.
- Representative images should match the service's purpose and should not be
  low-quality or inappropriate.
- PlayMCP currently does not handle MCP `Resource` and `Prompt` information.

## 8. DongneSOS Compliance Matrix

| Requirement | Current status | Evidence / note |
|---|---|---|
| Remote publicly accessible URL | Pass | v3 endpoint under `playmcp-endpoint.kakaocloud.io` |
| Streamable HTTP | Pass | `src/server.ts` uses `StreamableHTTPServerTransport` |
| Stateless | Pass | `sessionIdGenerator: undefined`, new server/transport per `/mcp` POST |
| Active SDK | Pass | `@modelcontextprotocol/sdk@1.29.0` |
| No `kakao` in server/tool name | Pass | `dongnesos-neighborhood-sos`, `classify_civic_issue`, `draft_civic_report` |
| Tool count | Acceptable but below guide recommendation | 2 tools; policy minimum is 1, guide recommends 3-10 |
| `inputSchema` / `outputSchema` | Pass | remote smoke confirms both present |
| Tool `annotations` | Gap | current `src/server.ts` has no `annotations` fields |
| Description length | Likely pass | current descriptions are under 1,024 chars |
| Description language | Acceptable but improvable | Korean descriptions; guide recommends English where possible |
| Response size below 24k | Likely pass | actual-output evidence is compact; still add max-size regression if needed |
| No unnecessary external calls | Pass | core tools do not call external APIs |
| No ads/commercial links | Pass | no ad or purchase behavior |
| PII handling | Pass for tested cases | phone/unit masking evidence exists |
| Emergency handling | Pass for tested cases | gas case blocks draft and redirects |
| Review request state | Not submitted | still temporary; answer-quality patch pending |
| Public visibility | Not public | `published: false` |

## 9. Immediate DongneSOS Actions Before Review Request

Required before review request:

1. Add official `annotations` to both tools:
   - `title`
   - `readOnlyHint: true`
   - `destructiveHint: false`
   - `openWorldHint: false`
   - `idempotentHint: true`
2. Patch actual-output quality findings:
   - Neighbor-help requests should return explicit out-of-scope / roadmap
     messaging, not generic civic clarification.
   - Remove privacy meta text from draft titles.
   - Fix Korean particles such as `관찰 일시을`.
   - Fix awkward neutralization text such as `확인 필요이니`.
3. Re-run:
   - `npm run check`
   - `npm run preflight:release`
   - remote `npm run smoke:endpoint`
   - remote `npm run smoke:actual-use:endpoint`
   - fresh actual-output review evidence.
4. Rebuild on PlayMCP in KC if runtime code changed.
5. Update PlayMCP developer-console registration using `정보 불러오기`.
6. Only then request PlayMCP review.

Recommended before review request:

1. Consider bilingual, shorter tool descriptions.
2. Add a response-size guard test below 24k.
3. Add a latency spot check against the live endpoint, targeting p99 under 3,000 ms.
4. Keep the current two-tool design unless a third tool meaningfully improves
   the product. Do not add a tool just to satisfy the 3-10 recommendation.

## 10. Kakao / Kakao Cloud Optimization Direction

For this contest, "use Kakao optimally" should mean:

- Use Kakao Cloud / PlayMCP in KC as the live serving surface during preliminaries.
- Keep PlayMCP developer-console metadata accurate and rerun `정보 불러오기` after
  any tool schema or description change.
- Avoid external scraping or browser automation for Kakao surfaces.
- Use official Kakao APIs only when they materially improve DongneSOS:
  - Kakao Maps / location surfaces could be considered later for official place
    context, but only with explicit privacy boundaries and no precise home
    location leakage.
  - KakaoTalk / Kakao Tools integration belongs to a finalist/Kakao Tools track,
    not the current two-tool preliminary server unless official specs require it.
  - Widget output should be planned for Kakao Tools finalist development because
    official contest FAQ says Kakao Tools supports widget specs and stricter MCP
    standards.

Current strategic read:

- DongneSOS is already using the required Kakao Cloud hosting route.
- It is not yet using Kakao service APIs inside tool behavior.
- The next high-value work is not adding a Kakao API blindly. It is making the
  current MCP output meet PlayMCP/Kakao Tools quality gates, then planning a
  Kakao Tools widget/finalist upgrade path.

## 11. Reference Commands

Local status:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
git status --short --branch
```

Health:

```bash
curl -sS https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz
```

Remote smoke:

```bash
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-v3-latest.json \
npm run smoke:endpoint
```

Remote actual-use smoke:

```bash
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-p1-v3-latest.json \
npm run smoke:actual-use:endpoint
```

Submission evidence:

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
