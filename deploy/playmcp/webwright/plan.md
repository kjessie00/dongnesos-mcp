# Task

Automate PlayMCP/KakaoCloud deployment checks and real toolbox answer-quality verification with Webwright-style Playwright scripts instead of coordinate-based Computer Use.

# Parameters

| name | type | source phrase from task | default | allowed / format |
|---|---|---|---|---|
| endpoint | str | target deployed MCP endpoint | `https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp` | absolute HTTPS URL ending in `/mcp` |
| server_name | str | KakaoCloud MCP server name | `dongnesos-mcp-v7` | visible server card name |
| mcp_name | str | PlayMCP registered MCP name | `동네SOS` | visible MCP display name |
| expected_commit | str | deployed commit expected by smoke | `0c16cb2` | git short SHA |
| repo_root | path | local repo root | `/Users/jessiek/StudioProjects/dongnesos-mcp` | absolute path |
| profile_dir | path | persistent browser login profile | `deploy/playmcp/webwright/browser-profile` | ignored local directory |
| source_brave_profile_dir | path | logged-in Brave profile to copy for Webwright | `/Users/jessiek/Library/Application Support/BraveSoftware/Brave-Browser/Profile 9` | absolute path; copied read-only into ignored profile |
| refresh_profile_from_brave | bool | copy `source_brave_profile_dir` before checks | `false` | opt-in only |
| mode | str | which check to run | `all` | `api`, `browser`, or `all` |
| update_console | bool | whether to mutate PlayMCP console endpoint | `false` | opt-in only |
| setup_login | bool | allow manual login wait in the Webwright browser profile | `false` | opt-in only |
| headless | bool | run browser without a visible window | `false` | `true` or `false` |
| login_viewport_height | int | temporary browser height for manual Kakao login setup | `900` | pixels; verification still uses 1800 |
| login_timeout_sec | int | manual login wait time | `600` | seconds |

# Critical Points

- [ ] CP1: API deployment check runs against the exact `endpoint` and verifies `/healthz`, MCP `tools/list`, normal classification, draft creation, emergency masking, and emergency draft blocking.
- [ ] CP2: Actual-use smoke runs against the exact `endpoint`, checks `expected_commit`, and passes all representative cases.
- [ ] CP3: Actual-output review runs against the exact `endpoint` and passes every answer-quality gate, including official links, privacy/legal context, copy-ready draft structure, and out-of-scope neighbor-help safety.
- [ ] CP4: KakaoCloud MCP Hub browser check captures evidence that `server_name` is visible and not failed.
- [ ] CP5: PlayMCP developer console browser check captures evidence that `mcp_name` is visible; when `update_console=true`, endpoint update uses the edit form only and never clicks review/final submission.
- [ ] CP6: Toolbox browser check sends the privacy-sensitive parking test prompt with `mcp_name` available and captures a response that includes official route links, legal/privacy context, copy-ready reporting guidance, and avoids unnecessary classification wording.
- [ ] CP7: Every browser run writes `final_script_log.txt` plus screenshots in `final_runs/run_<id>/`, and login-required states stop with an explicit `LOGIN_REQUIRED` result after `login_timeout_sec` instead of silent success.
- [ ] CP8: Manual login setup avoids Kakao Account's oversized 1800px vertical-centering layout by using a temporary 1280x900 browser window, then restarts verification with 1280x1800 screenshots.
- [ ] CP9: Optional Brave profile import copies only into ignored Webwright profile storage and does not mutate the source Brave profile or commit cookies.
