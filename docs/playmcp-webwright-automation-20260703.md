# PlayMCP Webwright Automation Notes

Date: 2026-07-03

## Goal

Replace coordinate-based browser control with Webwright-style Playwright automation for:

- KakaoCloud PlayMCP in KC deployment checks
- PlayMCP developer console endpoint verification/update
- PlayMCP toolbox real chat answer-quality verification

Primary script:

```bash
/Users/jessiek/.pyenv/shims/python deploy/playmcp/webwright/final_script.py --help
```

## Current v7 API Evidence

The v7 endpoint passed the API-level gates:

```bash
/Users/jessiek/.pyenv/shims/python deploy/playmcp/webwright/final_script.py \
  --mode api \
  --endpoint https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
  --expected-commit 0c16cb2
```

Evidence from run:

- `deploy/playmcp/webwright/final_runs/run_3/final_script_log.txt`
- `deploy/playmcp/evidence/webwright-remote-smoke-20260703T141500.json`
- `deploy/playmcp/evidence/webwright-remote-actual-use-20260703T141500.json`
- `deploy/playmcp/evidence/webwright-remote-output-review-20260703T141500.json`
- `deploy/playmcp/evidence/webwright-remote-output-review-20260703T141500.md`

Result: `overall_pass=true` for actual-use and output-review gates.

## Login UI Root Cause

Kakao Account login centers the login form vertically inside the browser viewport. With the Webwright standard verification viewport `1280x1800`, the form starts around y=541 and the login button around y=908, creating a large blank top area and poor manual-login UX on the physical screen.

Diagnosis artifact:

- `deploy/playmcp/webwright/screenshots/login-diagnosis-1280x1800.png`

Fix:

- `--setup-login` now opens a temporary `1280x900` browser window only for login setup.
- After login is detected, the script closes that setup browser and restarts real verification with the standard `1280x1800` viewport.

## Session Copy Attempt

Copying the logged-in Brave `Profile 9` into the ignored Webwright profile did not restore Kakao login. Cookie names were present in the source profile, but the copied profile still redirected to `accounts.kakao.com/login`. Treat copied Chrome/Brave profile sessions as unreliable for Kakao auth.

Therefore the reliable path is:

1. Run the script with `--setup-login`.
2. Log in once in the 1280x900 Webwright browser.
3. Reuse `deploy/playmcp/webwright/browser-profile/` for future runs.

The browser profile directory is ignored by git and must not be committed.

## Session Persistence Review

The session persistence mechanism is `chromium.launch_persistent_context(user_data_dir=...)`; exported `storage_state_after_*.json` files are evidence only, not the primary persistence path.

Fixes added after review:

- Login setup enables Kakao `Stay Logged In` when that checkbox is present.
- Login detection checks page title plus body text.
- KakaoCloud success markers include `KakaoCloud MCP Hub` and `My MCP Servers`.
- PlayMCP toolbox success markers include Korean UI text such as `도구함`, plus `Toolbox`, `AI 채팅`, and `내 MCP`.
- `--mode session` closes the setup browser, reopens the same ignored profile, and verifies both KakaoCloud and toolbox login state.

Verified command:

```bash
/Users/jessiek/.pyenv/shims/python deploy/playmcp/webwright/final_script.py \
  --mode session \
  --profile-dir /Users/jessiek/StudioProjects/dongnesos-mcp/deploy/playmcp/webwright/browser-profile-session-test \
  --login-viewport-height 900 \
  --login-timeout-sec 120
```

Evidence:

- `deploy/playmcp/webwright/final_runs/run_18/result.json`
- `deploy/playmcp/webwright/final_runs/run_18/screenshots/final_execution_11_session_reopen_kakaocloud_logged_in.png`
- `deploy/playmcp/webwright/final_runs/run_18/screenshots/final_execution_12_session_reopen_toolbox_logged_in.png`

Result: `session_persisted_after_reopen=true`.

## Browser Verification Command

Use this once to establish the dedicated Webwright login profile and continue browser verification:

```bash
/Users/jessiek/.pyenv/shims/python deploy/playmcp/webwright/final_script.py \
  --mode browser \
  --endpoint https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
  --server-name dongnesos-mcp-v7 \
  --mcp-name '동네SOS' \
  --expected-commit 0c16cb2 \
  --setup-login \
  --update-console \
  --login-viewport-height 900 \
  --login-timeout-sec 1800
```

After a successful login profile exists, use:

```bash
/Users/jessiek/.pyenv/shims/python deploy/playmcp/webwright/final_script.py \
  --mode browser \
  --endpoint https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
  --server-name dongnesos-mcp-v7 \
  --mcp-name '동네SOS' \
  --expected-commit 0c16cb2 \
  --update-console
```

## Important Safety Rule

The script may update/save the PlayMCP console endpoint when `--update-console` is set, but it is designed not to click review or final submission controls.
