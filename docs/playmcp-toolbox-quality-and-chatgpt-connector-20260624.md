# PlayMCP Toolbox Quality And ChatGPT Connector Check - 2026-06-24

## Verdict

Current PlayMCP toolbox output is not review-ready.

The real `https://playmcp.kakao.com/toolbox` side chat can see `동네SOS` and call tools, but the currently connected remote endpoint is stale and fails the intended output behavior in 4 of 5 practical user scenarios.

Latest local code has been patched to handle the newly observed PlayMCP client call shapes.

## Real PlayMCP Toolbox State

Observed at `https://playmcp.kakao.com/toolbox`:

- `동네SOS`
- `활성화 됨`
- `MCP Online`
- `Tools 2`
- Toolbox URL: `https://playmcp.kakao.com/mcp`
- AI side chat opened with `남은 질문 50개`

Evidence directory:

```text
deploy/playmcp/evidence/playmcp-toolbox-quality-20260624T1900KST/
```

## Toolbox Quality Matrix

| Case | Prompt intent | PlayMCP result | Verdict |
| --- | --- | --- | --- |
| `sidewalk_report_draft` | 보도블록 파손, 신고문 초안 요청 | `classify_civic_issue` and `draft_civic_report` called, but draft returned unknown issue | FAIL |
| `illegal_dumping_privacy` | 음식물쓰레기/차량번호/호수 포함, 개인정보 가림 요청 | classification worked, draft returned unknown issue; raw private details appeared in request/tool trace | FAIL |
| `emergency_gas_smell` | 가스 냄새/어지러움 긴급 판단 | classified as emergency and directed to 119/offical emergency channel | PASS |
| `neighbor_help_heavy_box` | 당근식 냉장고 운반 도움 모집글 | PlayMCP called `draft_civic_report` directly with `issue_code: "unknown"`; output was unknown issue, not roadmap/out-of-scope | FAIL |
| `unclear_noise` | 불명확한 소음 민원 | no tool call; general LLM asked clarifying questions | FAIL for MCP evidence, partial UX pass |

Summary JSON:

```text
deploy/playmcp/evidence/playmcp-toolbox-quality-20260624T1900KST/summary.json
```

Result:

```text
pass_count=1
fail_count=4
```

## New Root Cause Found

The previous harness missed real PlayMCP client argument shapes.

Observed `draft_civic_report` calls:

```json
{
  "issue_code": "road_walkway",
  "facts": {
    "what": "집 앞 보도블록이 깨져서 유모차가 걸려요."
  }
}
```

```json
{
  "issue_code": "environment_sanitation",
  "facts": {
    "what": "우리 빌라 302호 앞에 음식물 쓰레기가 계속 버려지고 있습니다. 사진에는 차량번호 12가3456도 찍혔습니다.",
    "where_general": "우리 빌라 302호 앞",
    "photo_note": "차량번호 12가3456이 찍힌 사진이 있습니다."
  }
}
```

```json
{
  "issue_code": "unknown",
  "facts": {
    "what": "오늘 밤 9시에 냉장고 옮기는 것을 도와줄 사람을 찾습니다.",
    "when_observed": "오늘 밤 9시",
    "impact": "냉장고를 안전하게 옮기기 위해 도움이 필요합니다."
  }
}
```

The stale remote endpoint treats these as `E_UNKNOWN_ISSUE_CODE`.

## Local Patch Applied

Changed files:

- `src/core/draft.ts`
- `src/core/pii.ts`
- `test/unit/draft.test.ts`
- `scripts/smoke_actual_use_endpoint.ts`

Patch behavior:

- `draft_civic_report` now resolves PlayMCP category-hint issue codes such as `road_walkway` and `environment_sanitation` into taxonomy items using the provided facts text.
- `draft_civic_report` now routes direct personal-help draft calls with `issue_code: "unknown"` to `out_of_scope` with `E_NEIGHBOR_HELP_UNSUPPORTED`, instead of returning a generic unknown issue error.
- PII masking now catches standalone unit strings such as `302호`, not only `101동 1203호`.
- Endpoint actual-use smoke now includes PlayMCP client-shaped cases so this does not regress silently.

## Local Verification

Passed:

```bash
npm run check
```

Passed local MCP transport smoke:

```bash
MCP_URL=http://127.0.0.1:3141/mcp \
  EVIDENCE_OUT=deploy/playmcp/evidence/local-playmcp-toolbox-compat-smoke-basic-20260624T1905KST.json \
  npm run smoke:endpoint
```

Passed expanded actual-use smoke with 8 cases:

```bash
MCP_URL=http://127.0.0.1:3141/mcp \
  EVIDENCE_OUT=deploy/playmcp/evidence/local-playmcp-toolbox-compat-smoke-20260624T1905KST.json \
  npm run smoke:actual-use:endpoint
```

Passed local output review:

```bash
MCP_URL=http://127.0.0.1:3141/mcp \
  EVIDENCE_OUT=deploy/playmcp/evidence/local-playmcp-toolbox-compat-output-review-20260624T1905KST.json \
  MARKDOWN_OUT=deploy/playmcp/evidence/local-playmcp-toolbox-compat-output-review-20260624T1905KST.md \
  npm run review:actual-output:endpoint
```

## ChatGPT Connector Guide

Notion guide checked:

```text
https://pineapple-cub-4dd.notion.site/ChatGPT-2ae9b97b48888039ad60eca4d15da38d
```

Saved evidence:

```text
deploy/playmcp/evidence/chatgpt-connector-guide-20260624T1900KST/notion-chatgpt-connector-guide.json
deploy/playmcp/evidence/chatgpt-connector-guide-20260624T1900KST/notion-chatgpt-connector-guide.png
```

Required ChatGPT setup from the guide:

1. Copy PlayMCP toolbox URL: `https://playmcp.kakao.com/mcp`.
2. Open ChatGPT `Settings > Apps & Connectors`.
3. Create a Connector named `PlayMCP`.
4. Set MCP server URL to `https://playmcp.kakao.com/mcp`.
5. Authentication must be `OAuth`; no OAuth Client ID/Secret is entered.
6. Login with the Kakao account used for PlayMCP and approve OAuth.
7. In each ChatGPT chat, enable developer mode and select `[+] > More > PlayMCP Connector`.
8. If toolbox tools change, use `Settings > Apps & Connectors > PlayMCP > Refresh`.

Important guide warning:

- ChatGPT may mark MCP as `Not Safe`.
- ChatGPT Connector is paid-plan only.
- Enterprise/Edu/Business workspaces may require Owner/Admin settings and `Publish to Workspace`.

## DeepSearchTeam / ChatGPT Readiness

DeepSearchTeam skill route was used.

Confirmed:

```bash
/Users/jessiek/.pyenv/versions/3.11.7/bin/python -c "import sys, pathlib, dst; print(sys.executable); print(pathlib.Path(dst.__file__).resolve())"
```

Output confirmed pyenv 3.11.7 and the real DeepSearchTeam repo import.

Confirmed profile exists:

```bash
/Users/jessiek/.pyenv/versions/3.11.7/bin/python -m dst profiles list
```

`goldpure369` exists and is available.

Blocked read-only profile check:

```text
Real Brave profile CDP launch is blocked because Brave already owns the same user-data root.
user_data_root=/Users/jessiek/Library/Application Support/BraveSoftware/Brave-Browser
pids=[75054]
```

No Brave process was terminated.

## ChatGPT Connector Test Gate

Actual ChatGPT connector creation was not performed because it changes ChatGPT account settings and grants OAuth access between ChatGPT and PlayMCP.

Needed explicit approval before mutation:

```text
ChatGPT Apps & Connectors에 PlayMCP 커넥터 생성 및 PlayMCP OAuth 연결 승인.
필요하면 goldpure369 Brave 종료 또는 stable-copy 브라우저로 연결 테스트 진행 승인.
```

After approval, rerun the same five quality prompts through ChatGPT with `[+] > More > PlayMCP Connector` selected. The expected result should match the local patched behavior, not the stale current PlayMCP remote behavior.

## Next

1. Commit and push this patch.
2. Create a fresh PlayMCP in KC Git source build from the new commit.
3. Refresh PlayMCP console/toolbox.
4. Re-run the five real `https://playmcp.kakao.com/toolbox` side-chat cases.
5. Only after toolbox passes, perform the ChatGPT Connector OAuth setup and run the same cases in ChatGPT.
