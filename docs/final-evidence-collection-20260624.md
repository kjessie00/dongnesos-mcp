# Final Evidence Collection - 2026-06-24

## Verdict

Do not submit for review yet.

Latest local code at `d7cfaee` passes the product-quality harness, but the current PlayMCP-connected remote endpoint does not produce the intended final user result. The PlayMCP client URL used for real-client evidence is `https://playmcp.kakao.com`.

## Evidence Summary

| Surface | Verdict | Evidence |
| --- | --- | --- |
| Local latest MCP server | PASS | `deploy/playmcp/evidence/final-local-smoke-d7cfaee-20260624T1846KST.json`, `deploy/playmcp/evidence/final-local-actual-use-d7cfaee-20260624T1846KST.json`, `deploy/playmcp/evidence/final-local-actual-output-review-d7cfaee-20260624T1846KST.json` |
| Remote v3 endpoint smoke | FAIL | `deploy/playmcp/evidence/final-remote-v3-smoke-20260624T1846KST.log` |
| Remote v3 actual output | FAIL | `deploy/playmcp/evidence/final-remote-v3-actual-output-review-20260624T1846KST.json`, `.md`, `.log` |
| PlayMCP AI Chat | FAIL current output | `deploy/playmcp/evidence/final-ui-playmcp-ai-chat-tool-call-20260624T1854KST.json`, `.png`, `.snapshot.txt` |
| GPT-5.4-mini quality review | CONFIRMS BLOCK | `.agent/review/final-quality-review-gpt54mini-20260624.md` |

## What Passed Locally

`npm run check` passed:

- Data validation: 28 taxonomy items
- Policy scan
- 68 tests
- TypeScript build

Local latest endpoint smoke passed against `http://127.0.0.1:3137/mcp`.

Local actual-use and actual-output review passed all 8 cases:

- `sidewalk_stroller`
- `tactile_paving`
- `streetlight_night_safety`
- `emergency_phone_gas`
- `legal_certainty_restaurant`
- `unit_address_dumping`
- `neighbor_heavy_package`
- `neighbor_pet_home_entry`

The local `sidewalk_stroller` result produced the intended copy-ready draft:

```text
[보도블록 파손] 보도블록 파손 점검 요청

안녕하세요. 생활불편 사항 접수 전 정리한 내용입니다.

- 내용: 집 앞 보도블록 일부가 깨져 유모차 바퀴가 걸립니다.
- 위치: 집 앞 보도, 정확한 주소는 공개하지 않음
- 관찰 일시: 오늘 오전
- 영향: 유모차와 보행자가 걸려 넘어질 위험이 있습니다.
- 요청: 보행 안전을 위해 현장 확인 후 필요한 보수 여부를 검토해 주시기 바랍니다.
```

## What Failed Remotely

Remote smoke against `https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp` failed:

```text
AssertionError [ERR_ASSERTION]: classify_civic_issue annotations missing
```

Remote actual-output review had `overall_pass: false`.

Representative failing case, `sidewalk_stroller`:

- Classification worked.
- Draft generation produced copy-ready text, but privacy/title gates failed in the current remote build.
- Failed gates: `no_raw_unsafe_text`, `title_privacy_clean`, `neighbor_share_privacy_clean`.

Remote personal-help cases also failed the current contract because they were not cleanly routed as out-of-scope/roadmap.

## PlayMCP AI Chat Evidence

Real client tested at `https://playmcp.kakao.com`.

State before test:

- `동네SOS`
- `활성화 됨`
- `MCP Online`
- `Tools 2`
- Toolbox URL: `https://playmcp.kakao.com/mcp`

Prompt sent:

```text
집 앞 보도블록이 깨져서 유모차가 걸려요. 어디에 말하면 좋고 신고문 초안도 준비해줘.
```

PlayMCP AI Chat did call both tools:

- `classify_civic_issue` - `동네SOS` - `성공`
- `draft_civic_report` - `동네SOS` - `성공`

But the `draft_civic_report` response was:

```text
알 수 없는 생활불편 유형입니다. classify_civic_issue를 먼저 호출해 주세요.
```

The final natural-language answer only explained where to report. It did not include the requested report draft. Therefore, the actual result seen by a PlayMCP user is not yet aligned with the intended product behavior.

Console note: after the AI Chat test, the developer console still showed `Tool call 0`, so the console counter is not used as proof. The direct AI Chat `TOOL 호출` panel is the call proof.

## GPT-5.4-mini Review

Codex CLI `gpt-5.4-mini` was used as an independent quality reviewer over the collected evidence.

Its verdict:

- Latest local output quality: `PASS`
- Current remote PlayMCP v3 output quality: `FAIL`
- PlayMCP review readiness: `NO`

Main findings:

- Remote smoke is missing `classify_civic_issue` annotations.
- Remote output still leaks raw unsafe/privacy text in copy-ready surfaces.
- Remote personal-help requests are misrouted as clarification instead of explicit out-of-scope/roadmap.

## Next Gate

Before review submission:

1. Create a fresh KakaoCloud/PlayMCP Git source build from `d7cfaee` or newer.
2. Confirm the deployed remote endpoint exposes the same schemas and annotations as local.
3. Re-run:

```bash
MCP_URL=https://<new-playmcp-endpoint>/mcp npm run smoke:endpoint
MCP_URL=https://<new-playmcp-endpoint>/mcp COMMIT_EXPECTED=<short-sha> npm run smoke:actual-use:endpoint
MCP_URL=https://<new-playmcp-endpoint>/mcp npm run review:actual-output:endpoint
```

4. Re-test `https://playmcp.kakao.com` AI Chat with the same prompt and verify that the final answer includes the report draft body.
5. Only submit for review after both harness output and PlayMCP AI Chat output pass.
