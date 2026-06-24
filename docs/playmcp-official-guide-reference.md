# PlayMCP / Kakao Cloud Official Guide Reference

Last refreshed: 2026-06-24 15:45 KST

This is the working source-of-truth document for DongneSOS PlayMCP deployment,
registration, review, and Kakao/KakaoCloud optimization. Keep it updated before
changing deployment, review state, Kakao API usage, or contest submission.

Latest redeploy blocker investigation:
`docs/playmcp-kc-redeploy-blocker-investigation-20260624.md`.

## 0. Korean Quick Brief

현재 DongneSOS 서버는 로컬이나 GitHub에 떠 있는 것이 아니라
`PlayMCP in KC`가 만든 KakaoCloud 관리형 endpoint 위에서 실행된다.

- 현재 살아 있는 런타임:
  `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp`
- 헬스체크:
  `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/healthz`
- PlayMCP in KC 상세 id: `487`
- PlayMCP 개발자 콘솔 MCP id: `62426279747569122`
- GitHub source of truth:
  `https://github.com/kjessie00/dongnesos-mcp`

중요한 상태 구분:

- 서버 자체는 KakaoCloud에서 살아 있다.
- 다만 현재 v3 런타임은 최신 Git 코드보다 오래된 빌드다.
- 최신 코드에는 PlayMCP 리뷰 품질을 위한 tool annotations/output hardening이
  들어갔지만, v3 원격 smoke는 아직 그 메타데이터를 못 보여준다.
- 다음 필수 작업은 KakaoCloud Git source build로 새 endpoint를 만들고,
  PlayMCP 개발자 콘솔에서 `정보 불러오기`로 도구 정보를 갱신한 뒤 원격
  smoke/actual-use/output-review를 다시 통과시키는 것이다.

Kakao API 활용 원칙:

- 예선 리뷰 전 즉시 최적화 포인트는 KakaoCloud/PlayMCP 공식 배포, PlayMCP
  등록/도구함/AI Chat 검증, Kakao Tools 본선 대비 구조화 output이다.
- Kakao Local/Maps API는 제품 가치가 분명하지만, 현재 리뷰 후보에 즉시
  붙이면 API key, 위치정보, quota, latency, privacy 리스크가 생긴다.
- 그래서 리뷰 전에는 내부 Kakao API 호출을 추가하지 않는 것이 현재 최선이다.
  본선/후속 버전에서는 사용자 명시 동의가 있을 때만 coarse location
  normalization과 공공기관/공공장소 힌트로 제한해 붙인다.

## 1. Current DongneSOS Hosting Status

DongneSOS is currently hosted on KakaoCloud through PlayMCP in KC. It is not
served from the local machine, GitHub Pages, Vercel, DockerHub, or a separate
private server.

Short answer for deployment-location questions:

- Runtime host: PlayMCP in KC / KakaoCloud managed endpoint.
- Active endpoint today: `dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io`.
- Source of truth for code: GitHub `main` at
  `https://github.com/kjessie00/dongnesos-mcp`.
- Current blocker: the active v3 runtime is alive but stale. It does not yet
  reflect the latest local/Git commit that added review-quality metadata and
  output hardening.
- The next deploy should remain a KakaoCloud Git source build. DockerHub is not
  preferable for this project unless PlayMCP in KC Git builds repeatedly fail
  for source-build-specific reasons.

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

Deployment retry notes on 2026-06-24:

- Stale `dongnesos-mcp-v2` / detail id `375` was deleted to free one of the two
  allowed contest server slots.
- New Git source build `dongnesos-mcp-v4` / detail id `567` was accepted as
  `mcp-build-apply-567`.
- The v4 build passed repository tests and image push, but failed while creating
  the KakaoCloud KServe `InferenceService`:
  `failed calling webhook "inferenceservice.kserve-webhook-server.defaulter" ...
  context deadline exceeded`.
- `PATCH /api/v2/mcp/my-mcp-servers/567/start` returned
  `시작할 수 없는 상태입니다.`, so failed v4 must be deleted before another
  fresh build.
- A follow-up v5 create attempt was blocked because the PlayMCP in KC browser
  session returned `401 인증되지 않았습니다` and then
  `503 Authentication service unavailable`.
- Until PlayMCP in KC authentication recovers, the live review candidate remains
  v3, and remote e2e cannot prove the latest Git commit.

Local evidence files for this state:

- `deploy/playmcp/evidence/local-endpoint-smoke-f375d40-20260624.json`
- `deploy/playmcp/evidence/local-actual-use-f375d40-20260624.json`
- `deploy/playmcp/evidence/local-actual-output-review-f375d40-20260624.md`
- `deploy/playmcp/evidence/playmcp-in-kc-v4-create-20260624.json`
- `deploy/playmcp/evidence/playmcp-in-kc-v4-poll-20260624.json`
- `deploy/playmcp/evidence/playmcp-in-kc-v4-start-retry-20260624.json`
- `deploy/playmcp/evidence/playmcp-in-kc-v5-quick-retry-20260624.json`

Specialist review after this retry:

- DeepSearchTeam / StockAI Pro Chat completed on `goldpure369`, model label
  `Pro`, conversation `https://chatgpt.com/c/6a3b74f0-19a0-83e8-aa99-afed956b8b3c`.
- Verdict: `CONDITIONAL PASS`.
- Local MCP product/output readiness: `PASS`.
- Repo patch required now: `false`.
- Remote / PlayMCP review readiness: `BLOCKED` until a fresh endpoint is
  created and remote smoke, actual-use smoke, and actual-output review pass.
- Pro Chat classified the v4 KServe webhook timeout and v5 auth/session
  failures as deployment/account/platform blockers, not as current repo-code
  blockers.

## 2. Official Source Inventory

Primary official pages to re-check before review, endpoint rebuild, Kakao API
addition, or contest submission:

| Source | URL | What it controls for DongneSOS |
|---|---|---|
| PlayMCP public site | `https://playmcp.kakao.com/` | Public MCP browsing, toolbox, AI chat, developer entry |
| PlayMCP AI index | `https://playmcp.kakao.com/llms.txt` | Official agent-readable map of PlayMCP, toolbox, AI chat, gateway, console, guides |
| MCP gateway guide | `https://playmcp.kakao.com/llms/mcp-connection-guide.md` | OTT, OAuth token exchange, `mcporter`, gateway endpoint connection |
| PlayMCP developer console | `https://playmcp.kakao.com/console` | Endpoint registration, `정보 불러오기`, temporary registration, review request |
| PlayMCP in KC | `https://playmcp.kakaocloud.io/` | KakaoCloud MCP runtime deployment portal |
| PlayMCP in KC AI index | `https://playmcp.kakaocloud.io/llms.txt` | Official agent-readable map of KakaoCloud hosting flow |
| PlayMCP in KC AI guide | `https://playmcp.kakaocloud.io/ai/guide.md` | Git source build vs existing image build decision, API payload shape |
| AGENTIC PLAYER 10 contest page | `https://b.kakao.com/views/PlayMCP/AGENTIC_PlAYER_10` | Contest flow, dates, eligibility, FAQ, final entry button |
| Kakao press: AGENTIC PLAYER 10 | `https://www.kakaocorp.com/page/detail/12059` | Official contest framing, Kakao Tools exposure, dates, awards |
| Kakao press: PlayMCP toolbox | `https://www.kakaocorp.com/page/detail/11817` | Toolbox concept, ChatGPT/Claude connector flow, Kakao account auth |
| Kakao press: PlayMCP beta open | `https://www.kakaocorp.com/page/detail/11674` | Platform role, registered MCP testing, Kakao service examples |
| Kakao Tech: PlayMCP platform dev | `https://tech.kakao.com/posts/734` | PlayMCP internal flow, Streamable HTTP, tools/list, tools/call, testing guidance |
| Kakao Tech: MCP Player 10 results | `https://tech.kakao.com/posts/818` | Prior winners, judging hints, Kakao Tools direction, managed deployment Q&A |
| Official Notion: service help | `https://kko.kakao.com/playmcp_guide` | Help hub and connection docs |
| Official Notion: review policy | `https://kko.kakao.com/playmcp_review` | Review acceptance/rejection policy |
| Official Notion: server development guide | `https://www.notion.so/MCP-2d89b97b4888808a9e1dc17a13e70187` | PlayMCP MCP server implementation rules |
| Official Notion: Claude connection | `https://kko.kakao.com/connectclaude` | Claude connector setup |
| Official Notion: ChatGPT connection | `https://kko.kakao.com/connectchatgpt` | ChatGPT connector setup |
| Official Notion: PlayMCP AI chat connection | `https://kko.kakao.com/connectplaymcp` | PlayMCP AI chat/toolbox behavior |
| Official Discord | `https://kko.kakao.com/playmcp_discord` | Developer support/escalation |
| Kakao Developers REST API reference | `https://developers.kakao.com/docs/latest/en/rest-api/reference` | Generic Kakao API request/response/auth rules |
| Kakao Developers Local API concepts | `https://developers.kakao.com/docs/latest/en/local/common` | Kakao Local capability, app activation, quotas |
| Kakao Developers Local API REST | `https://developers.kakao.com/docs/en/local/dev-guide` | Address/place/coordinate endpoints and request fields |
| Kakao Developers Login REST | `https://developers.kakao.com/docs/en/kakaologin/rest-api` | Kakao OAuth flow if persistent user identity is added later |
| Kakao Maps API | `https://apis.map.kakao.com/` | Map rendering if a frontend/widget path needs it |
| Kakao Maps Web API guide | `https://apis.map.kakao.com/web/guide/` | Browser map integration details |
| Kakao Talk Channel REST API | `https://developers.kakao.com/docs/latest/en/kakaotalk-channel/rest-api` | Future support-channel integration only |
| Kakao Talk Share | `https://developers.kakao.com/docs/latest/en/kakaotalk-share/common` | Future user-initiated share cards only |
| Kakao Utility API status | `https://developers.kakao.com/docs/latest/en/reference/utility` | Kakao service status checks if we add Kakao API dependencies |
| KakaoCloud service catalog | `https://docs.kakaocloud.com/en/service` | KakaoCloud service options: Secrets Manager, Kubernetes Engine, Kubeflow, Object Storage |
| KakaoCloud LLM endpoint tutorial | `https://docs.kakaocloud.com/en/tutorial/machine-learning-ai/llm-endpoint` | KServe/InferenceService background for platform-deploy failures |

Official docs extracted on 2026-06-24:

- `playmcp.kakao.com/llms.txt` says PlayMCP is the MCP tool-linking platform and
  playground; registered/approved MCP servers have ids, names, descriptions,
  tool lists, and starter messages; a user's toolbox holds up to 10 MCP servers.
- The PlayMCP MCP gateway endpoint is `https://playmcp.kakao.com/mcp`, uses
  Bearer access tokens, and routes internally to the user's toolbox servers.
- The developer console is the official surface for registering/editing MCP
  servers and checking review state.
- `playmcp.kakaocloud.io/ai/guide.md` says PlayMCP in KC deploys MCP servers on
  KakaoCloud and produces endpoint URLs that must be registered in the PlayMCP
  console.
- The official hosting decision flow prefers Git source build when a Git repo
  with a Dockerfile exists; existing-image registration is for already-pushed
  container images.
- Official Notion docs are public through the `kko.kakao.com` links, but the
  rendered pages are Notion-backed. If a detail is decision-critical, re-fetch
  the page chunk or verify in a logged-in browser before changing production
  behavior.

Direct source refresh performed on 2026-06-24 15:45 KST:

- `https://playmcp.kakao.com/llms.txt` fetched successfully. It confirms
  PlayMCP's roles: registered MCP server catalog, toolbox, AI chat, developer
  console, and OAuth MCP gateway.
- `https://playmcp.kakaocloud.io/llms.txt` fetched successfully. It confirms
  PlayMCP in KC's role as the KakaoCloud hosting portal that creates endpoint
  URLs for PlayMCP console registration.
- `https://playmcp.kakaocloud.io/ai/guide.md` fetched successfully. It confirms
  Git source build as the recommended route when a repo has a Dockerfile, and
  existing-image registration when an image is already in a registry.
- `https://playmcp.kakao.com/llms/mcp-connection-guide.md` fetched
  successfully. It confirms the external-agent gateway endpoint
  `https://playmcp.kakao.com/mcp`, OTT exchange flow, OAuth Bearer token use,
  and `mcporter` configuration.
- `https://b.kakao.com/views/PlayMCP/AGENTIC_PlAYER_10` opened successfully.
  It confirms the four-step contest flow, two contest server limit, temporary
  registration warning, full-public requirement after review, one-time final
  entry, and judging criteria.
- `kko.kakao.com` Notion redirect links are useful official links, but plain
  `curl` returns the Notion app shell rather than clean body text. Use them as
  canonical links and verify decision-critical details in the logged-in browser
  or through rendered page extraction before changing review/submission state.

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
- The failed `dongnesos-mcp-v4` build passed image build/push but failed during
  KakaoCloud KServe `InferenceService` creation. KakaoCloud's own ML serving
  docs describe KServe `InferenceService` as the resource used to serve models
  and Docker-built custom serving logic, so this error belongs to the
  platform/runtime creation layer, not to GitHub source control.

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
intentional safety choice, not a missing deploy feature. For the preliminary
round, official KakaoCloud hosting, PlayMCP registration, strict MCP metadata,
stable output quality, and privacy-safe civic triage are higher-value than
adding a Kakao API without a clear user-facing benefit.

Decision rule for Kakao/KakaoCloud optimization:

1. Use official KakaoCloud / PlayMCP surfaces immediately when they are part of
   the required contest path.
2. Use Kakao APIs only when they improve a real DongneSOS workflow and can be
   operated with explicit user consent, minimal data, and predictable latency.
3. Do not add APIs that merely decorate the submission, increase privacy risk,
   slow tool calls, or duplicate what PlayMCP/LLM already provides.

Recommended Kakao/KakaoCloud roadmap:

| Area | Current decision | Rationale |
|---|---|---|
| PlayMCP in KC | Use now | Official preliminary hosting path; this is where the server actually runs |
| PlayMCP console | Use now | Required registration/review layer; `정보 불러오기` refreshes tool metadata |
| PlayMCP toolbox / AI chat | Use for real-use validation | Official docs say PlayMCP AI chat uses toolbox tools by default |
| PlayMCP MCP gateway | Do not add to this server | Gateway is for external agents consuming a user's toolbox, not for DongneSOS backend logic |
| Kakao Tools | Prepare if finalist | Official contest materials say finalist services are exposed to KakaoTalk users through Kakao Tools |
| Kakao Tools Widget specs | Finalist track | Prior Kakao Tech Q&A says richer JSON/widget rendering is planned/available in Kakao Tools contexts |
| Kakao Maps / Local APIs | High-value later with consent | Local API can search places and convert address/coordinates; useful for district normalization and office hints |
| Kakao API status Utility API | Medium | Useful only if we add Kakao API dependencies and need monitoring |
| KakaoCloud Secrets Manager | High if API keys are added | KakaoCloud catalog lists it for centrally managing API keys/passwords |
| KakaoCloud Object Storage | Medium later | Useful if we add non-sensitive public-office datasets or generated evidence archives |
| KakaoCloud Kubeflow/KServe | Platform layer only | PlayMCP in KC already uses this kind of serving layer; do not self-manage unless required |
| Kakao Login | Low now / medium later | Needed only for persistent profiles, consented helper matching, or account-specific state |
| KakaoTalk data APIs | Do not add now | Needs official OAuth/consent and Kakao Tools context; never scrape or read chats |
| Kakao Talk Share | Low now / medium finalist | Use only as user-initiated sharing, not automated messaging |
| Kakao Talk Channel API | Low now | Support/update channel only; not core civic triage |
| External browser scraping | Avoid | Review policy penalizes unnecessary redirects/crawling and privacy risk |

Concrete Kakao API design options:

### Option A: no internal Kakao API for preliminary review

Keep the current stateless MCP server and use Kakao only through:

1. PlayMCP in KC runtime hosting.
2. PlayMCP console registration.
3. PlayMCP AI chat/toolbox validation.
4. Kakao Tools preparation in docs/submission.

This is the recommended immediate path because it reduces privacy, secret,
latency, quota, and review risk.

### Option B: consented Kakao Local enrichment after remote rebuild passes

Add an optional enrichment path only when the user intentionally provides a
place/address or district hint:

1. `classify_civic_issue` remains usable with no location.
2. If a coarse location is provided, call Kakao Local API with a short timeout.
3. Normalize to district/road/administrative-area hints only.
4. Never persist raw coordinates.
5. Never require Kakao Local success to draft a report.
6. Return a fallback if Kakao Local quota/network fails.

This can improve purpose fit because DongneSOS is neighborhood/civic-report
oriented, but it must not turn into precise home-location collection.

### Option C: helper-matching / "neighbor help" future track

If DongneSOS later supports personal-neighborhood help requests inspired by
local community apps, design it as a separate consent-gated workflow:

1. Separate civic-report tools from helper-coordination tools.
2. Require explicit user-provided task type, approximate area, time window, and
   safety constraints.
3. Use Kakao Login only if persistent identity/consent is required.
4. Use Kakao Local only for coarse area normalization or nearby public place
   suggestions.
5. Use Kakao Talk Share only for user-initiated share cards.
6. Do not expose contact details, exact home address, unit number, door code, or
   private household access data in tool output.
7. Do not broker paid work, emergency care, medical/legal decisions, or unsafe
   in-person meetings without a stronger policy layer.

This is a finalist/product-expansion design, not a pre-review blocker.

Potential Kakao API additions, ranked by fit:

| Candidate | Fit | When to add | Required guardrails |
|---|---:|---|---|
| Kakao Maps / Local API | High later | When we add optional address normalization, nearby public-office hints, or map-ready civic issue context | No precise home address storage; coarse location output by default; API timeout/fallback; never block core draft |
| Kakao Maps Web API / marker-ready output | High for finalist widget | When Kakao Tools widget specs are available and map display improves the answer | Widget-only enrichment; avoid sending raw coordinates unless user supplies them intentionally |
| Kakao API status Utility API | Medium | For deployment monitoring if Kakao API dependencies are added | Health evidence only; no user data |
| Kakao Login | Low now / medium later | Only if persistent personal history, favorites, or consent-gated helper matching becomes necessary | OAuth consent, data minimization, deletion path, no login for basic usage |
| Kakao Talk Channel API | Low now | Only for an official support/update channel, not for core MCP behavior | No unsolicited messaging; channel relationship and consent checks |
| Kakao Talk Share | Low now / medium for finalist UX | If final Kakao Tools/user-share flow benefits from share cards | SDK-only surface; no private chat reading; no auto-send |
| Kakao Navi | Low | Only if a future helper/visit flow needs directions | User-initiated link-out only; avoid revealing private addresses |

Practical next step:

- Do not add a Kakao API just to appear "Kakao-integrated".
- First make the current MCP outputs review-grade, rebuild on KakaoCloud, and
  refresh PlayMCP metadata.
- In parallel, design a finalist/Kakao Tools upgrade plan with widget-ready
  outputs and optional Kakao Maps/Local integration behind explicit privacy
  rules.
- If we add the "neighbor personal help" feature later, design it as a
  consent-gated coordination layer first. Kakao APIs should support identity,
  map context, or share surfaces only after the safety model is clear; the MCP
  must not infer, expose, or broker private household access by default.

## 5B. Kakao / KakaoCloud Optimization Blueprint

This is the implementation blueprint to keep Kakao integration strong without
adding low-value or risky API calls before PlayMCP review.

### Stage 0: current review candidate

Use Kakao surfaces at the platform layer only:

- KakaoCloud runtime: PlayMCP in KC Git source build.
- KakaoCloud endpoint domain: `*.playmcp-endpoint.kakaocloud.io`.
- PlayMCP developer console: temporary registration, endpoint metadata refresh,
  review state, visibility state.
- PlayMCP toolbox / AI chat: real user-flow validation.
- Kakao Tools: design target for finalist output compatibility.

Do not add internal Kakao API calls in this stage:

- No Kakao Login.
- No KakaoTalk read/write APIs.
- No Kakao Local/Maps calls.
- No automatic civic submission.
- No precise home-location capture.

Reasoning:

- The contest explicitly requires KakaoCloud hosting for preliminary entry.
- PlayMCP review heavily rewards stable, fast, privacy-safe tools.
- Kakao Local/Maps can improve location workflows, but it introduces a REST API
  key, quota behavior, failure paths, latency, and location privacy questions.
- The current MCP can already satisfy the civic-report preparation goal without
  external data. Adding a weak API integration now would be decorative rather
  than product-critical.

### Stage 1: optional Kakao Local enrichment after remote rebuild passes

Add this only after the latest Git source is running remotely and passes
`smoke:endpoint`, `smoke:actual-use:endpoint`, and
`review:actual-output:endpoint`.

Feature intent:

- Convert user-provided coarse address/place text into district-level context.
- Suggest likely public-office categories or nearby public places only when it
  improves report preparation.
- Make the output clearer for Kakao Tools/widget rendering later.

Allowed Kakao APIs:

- Kakao Local `search/address`: normalize a user-provided address string.
- Kakao Local `geo/coord2regioncode`: convert explicitly provided coordinates
  to administrative region only.
- Kakao Local `search/keyword`: find public offices or public landmarks for
  context, not private homes or personal contacts.
- Kakao Utility `api-status`: optional monitoring if Kakao API dependency is
  enabled.

Implementation rules:

- Gate with `KAKAO_LOCAL_ENABLED=false` by default.
- Store `KAKAO_REST_API_KEY` only through a secure deployment mechanism such as
  KakaoCloud Secrets Manager or the PlayMCP in KC portal if it provides a secure
  env/secret field. Never commit it.
- Keep a hard timeout, target 500-800 ms, and never let Local API failure block
  the core MCP answer.
- Do not persist raw query text, raw coordinates, or full address results.
- Reduce output to coarse fields such as province/city/district/dong, issue
  office category, and optional public-place hint.
- Prefer administrative region over exact road address for final tool output.
- Add tests for timeout, empty result, quota/error result, and privacy redaction.
- Keep tool response p99 under the PlayMCP review target.

Suggested output envelope:

```json
{
  "kakao_enrichment": {
    "enabled": true,
    "status": "used | skipped | fallback | error",
    "source": "kakao_local",
    "coarse_region": {
      "sido": "서울",
      "sigungu": "강남구",
      "eup_myeon_dong": "역삼동"
    },
    "privacy_level": "coarse_only",
    "notes": ["exact address omitted"]
  }
}
```

### Stage 2: Kakao Tools finalist upgrade

Prepare for the official note that finalist services are exposed through Kakao
Tools and may use richer widget specs than PlayMCP.

Expected work:

- Keep the two current MCP tools stable.
- Add widget-ready structured output fields without changing the plain-text
  usefulness of responses.
- Add a compact "next action" schema: report destination, evidence checklist,
  safety warning, and draft summary.
- If Kakao Tools exposes map/widget specs, map only coarse issue area or public
  office candidates, not private home coordinates.
- Re-run MCP standard compliance and PlayMCP tool metadata refresh after any
  output shape change.

### Stage 3: helper-matching / personal neighborhood help expansion

This is not a pre-review feature. If added later, treat it as a separate
consent-gated product lane, not as a civic-report shortcut.

Kakao fit:

- Kakao Login: only if persistent identity, consent history, or saved
  preferences are required.
- Kakao Local: only for coarse area normalization and nearby public meeting
  place suggestions.
- Kakao Talk Share: only for user-initiated share cards.
- Kakao Talk Channel: only for support/announcement channels.

Hard stops:

- No reading KakaoTalk or community-app chats.
- No brokering private home entry, pet/child/elder care, emergency medical/legal
  decisions, or unsafe in-person meetings.
- No exact address, unit number, door code, phone number, or payment detail in
  MCP output.
- No paid-work marketplace behavior until legal, tax, platform, and trust/safety
  design are explicit.

## 5C. Kakao API Fit Matrix For DongneSOS

| Kakao surface | Current use | Future fit | Decision |
|---|---|---|---|
| PlayMCP in KC | Hosting live MCP server | Required preliminary infra | Use now |
| PlayMCP console | Temporary registration, metadata, review state | Required review/publication path | Use now |
| PlayMCP AI chat/toolbox | Real-use validation | User-facing testing and connector flow | Use now after endpoint refresh |
| Kakao Tools | Not directly accessible yet | Finalist exposure, widget output, user vote | Design for now, implement after specs |
| Kakao Local API | Not used | Coarse region normalization, public-office hints | Add after remote rebuild only if value is clear |
| Kakao Maps Web/SDK | Not used | Widget/map visualization if finalist specs allow | Defer |
| Kakao Utility API | Not used | Dependency/status monitoring | Optional if Local API is added |
| KakaoCloud Secrets Manager | Not used | Store Kakao REST API key securely | Use if any Kakao API key is added |
| KakaoCloud Object Storage | Not used | Non-sensitive public-office dataset/evidence archive | Optional later |
| Kakao Login | Not used | Persistent profile or helper-matching consent | Defer |
| Kakao Talk Share | Not used | User-initiated sharing only | Defer |
| Kakao Talk Channel | Not used | Support/update channel only | Defer |
| KakaoTalk data/message APIs | Not used | High risk for this product | Do not add for review candidate |

## 5D. PlayMCP Toolbox / External Agent Connection Notes

Use this section when validating real user flows outside the raw endpoint smoke
tests.

PlayMCP toolbox:

- A toolbox can contain up to 10 MCP servers.
- PlayMCP AI chat uses the toolbox by default; no separate setup is required in
  PlayMCP AI chat.
- The old "applied MCP" wording has changed to toolbox. Prefer "도구함에 추가"
  over the old "AI 채팅에 적용" phrasing.
- PlayMCP AI chat prioritizes MCP use.

Claude connector:

- Claude Pro/Max users connect from Claude settings > connectors, search or
  choose PlayMCP, then complete Kakao account OAuth.
- Claude Team/Enterprise requires owner/admin connector addition before members
  connect individually.
- Claude connector availability depends on Claude's paid-plan policy.

ChatGPT connector:

- ChatGPT users copy the PlayMCP toolbox URL from PlayMCP > toolbox.
- In ChatGPT Settings > Apps & Connectors, create a connector with PlayMCP as
  name and the copied toolbox URL as MCP server URL.
- Authentication is OAuth; do not enter OAuth client id or secret.
- Enterprise/Edu/Business owners may need to publish the connector to the
  workspace and enable developer mode.
- If toolbox contents change, refresh the PlayMCP connector in ChatGPT.
- If ChatGPT marks a toolbox MCP as unsafe, reduce/adjust toolbox contents and
  retry.

External agent gateway:

- Gateway endpoint: `https://playmcp.kakao.com/mcp`.
- The gateway requires an OAuth Bearer token.
- The official agent flow uses an OTT from PlayMCP toolbox's OpenClaw
  connection flow, exchanges it at
  `POST https://playmcp.kakao.com/api/v1/auths/otts:exchange`, then stores
  credentials in `~/.mcporter/credentials.json`.
- Do not paste OTT/access/refresh tokens into repo files or docs.

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
