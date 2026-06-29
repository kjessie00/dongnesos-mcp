# PlayMCP Toolbox v5 Quality Verification - 2026-06-29

## Verdict

The PlayMCP toolbox path is now usable for review preparation, with one scoped
product caveat.

The deployed v5 endpoint and the real `https://playmcp.kakao.com/toolbox` side
chat both exercised the intended DongneSOS differentiator: the user gets a
compact civic-action answer with tool-backed classification, official-channel
guidance, evidence/photo cautions, and public-sharing privacy limits. This is
materially stronger than a generic search summary because the answer turns a
messy local situation into the next safe action.

The neighbor-help exchange idea is not implemented as a matching/post drafting
tool. Current behavior is acceptable for the MVP only because it states the
scope boundary and gives conservative safety guidance.

## Deployment Under Test

```text
Repository: https://github.com/kjessie00/dongnesos-mcp
Commit: 9bbbcb0 feat: return source-backed action cards
PlayMCP in KC server: dongnesos-mcp-v5
Endpoint: https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp
PlayMCP client: https://playmcp.kakao.com/toolbox
PlayMCP account/browser: kjessie007 in Brave
```

## Contract Evidence

Passed:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-v5-source-card-20260629.json \
npm run smoke:endpoint
```

Passed:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-v5-source-card-20260629.json \
npm run smoke:actual-use:endpoint
```

Passed:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
npm run review:actual-output:endpoint
```

The output-review artifact was copied to:

```text
deploy/playmcp/evidence/remote-actual-output-review-v5-source-card-20260629.md
deploy/playmcp/evidence/remote-actual-output-review-v5-source-card-20260629.json
```

## Browser Evidence

Console registration:

```text
deploy/playmcp/evidence/playmcp-console-v5-updated-20260629.png
```

Toolbox cases:

```text
deploy/playmcp/evidence/playmcp-toolbox-v5-chat-source-card-privacy-20260629.png
deploy/playmcp/evidence/playmcp-toolbox-v5-chat-source-card-park-glass-20260629.png
deploy/playmcp/evidence/playmcp-toolbox-v5-chat-neighbor-help-boundary-20260629.png
```

## Quality Matrix

| Case | Prompt intent | Tool behavior | Final-answer quality | Verdict |
| --- | --- | --- | --- | --- |
| `illegal_parking_privacy` | School-crosswalk illegal parking with vehicle number and children's faces in photo | `classify_civic_issue` and `draft_civic_report` both called successfully | Gives safety parking classification, official channel guidance, photo caution, and tells user not to publicly share vehicle number or children's faces | PASS |
| `park_glass_hazard` | Broken glass near park bench, children passing, copy-ready district-office report | `classify_civic_issue` and `draft_civic_report` both called successfully | Gives location, situation, photo caution, local office channel, and public-sharing caution | PASS with note |
| `neighbor_help_boundary` | Danggeun-style personal help request and safe disclosure question | No civic tool call needed | States DongneSOS does not directly support personal-help matching; recommends approximate location, no phone/address at first, and platform messages | SCOPE PASS |

## Quality Notes

- The v5 toolbox is no longer failing the stale-v3 issue where
  `draft_civic_report` returned `unknown issue` for PlayMCP-shaped calls.
- The final illegal-parking answer now demonstrates the intended service
  difference against ordinary search: it bundles official route, evidence,
  privacy lane, and next action.
- The park-glass case is user-facing pass, but the internal tool trace showed
  some privacy-oriented source names that are less specific than the park
  hazard. This is not a launch blocker, but the next source-card improvement
  should prioritize more facility-specific cards for park hazards, broken
  glass, and public-facility cleanup.
- The neighbor-help exchange remains a future feature. A production version
  should add dedicated tools such as `classify_neighbor_help_request` and
  `draft_neighbor_help_post` only after safety taxonomy, non-goals, and
  privacy boundaries are implemented.

## Review Readiness

Ready for owner review request preparation:

- KakaoCloud/PlayMCP in KC deployment path: PASS
- PlayMCP temporary registration endpoint: PASS
- Remote MCP contract: PASS
- Actual-use regression: PASS
- Real PlayMCP toolbox answer quality: PASS for current civic-report MVP

Not yet done:

- ChatGPT Connector OAuth setup and ChatGPT-side transcript test.
- PlayMCP review request / preliminary contest submission. These remain
  owner-gated and were not clicked during this verification.
