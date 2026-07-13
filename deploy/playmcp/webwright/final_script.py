#!/usr/bin/env python3
"""Webwright-style PlayMCP deployment and toolbox verification CLI."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


DEFAULT_ENDPOINT = "https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp"
DEFAULT_REPO_ROOT = "/Users/jessiek/StudioProjects/dongnesos-mcp"
DEFAULT_SOURCE_BRAVE_PROFILE = "/Users/jessiek/Library/Application Support/BraveSoftware/Brave-Browser/Profile 9"
DEFAULT_PROMPT = (
    "OO초 앞 횡단보도 입구에 12가3456 차량이 불법주정차로 계속 서 있어요. "
    "사진엔 아이들 얼굴도 같이 나왔고, 동네방에 올려도 되는지 모르겠어요. "
    "어디에 어떻게 신고 준비하면 좋을까요?"
)
VERIFY_VIEWPORT = {"width": 1280, "height": 1800}
DEFAULT_LOGIN_VIEWPORT_HEIGHT = 900
DEFAULT_LOGIN_TIMEOUT_SEC = 600
KAKAOCLOUD_LOGIN_MARKERS = ["KakaoCloud MCP Hub", "My MCP Servers", "MCP Hub"]
PLAYMCP_CONSOLE_MARKERS = ["개발자 콘솔", "Developer Console", "Console"]
PLAYMCP_TOOLBOX_MARKERS = ["도구함", "Toolbox", "PlayMCP Toolbox", "AI 채팅", "내 MCP"]
CONSOLE_CLICK_BLOCKLIST = ("심사", "심사 요청", "삭제", "전체 공개", "공개 전환", "player", "예선")
STARTER_FIELD_TERMS = ("starter", "스타터", "시작 메시지", "추천 메시지", "대화 예시")


def _workspace_dir() -> Path:
    here = Path(__file__).resolve()
    if here.parent.name.startswith("run_") and here.parent.parent.name == "final_runs":
        return here.parent.parent.parent
    return here.parent


def _next_run_dir(workspace: Path) -> Path:
    final_runs = workspace / "final_runs"
    final_runs.mkdir(parents=True, exist_ok=True)
    ids: list[int] = []
    for child in final_runs.iterdir():
        if child.is_dir() and child.name.startswith("run_"):
            try:
                ids.append(int(child.name.removeprefix("run_")))
            except ValueError:
                pass
    run_dir = final_runs / f"run_{max(ids, default=0) + 1}"
    run_dir.mkdir(parents=True)
    shutil.copy2(Path(__file__).resolve(), run_dir / "final_script.py")
    return run_dir


def _resolve_run_dir() -> Path:
    here = Path(__file__).resolve()
    if here.parent.name.startswith("run_") and here.parent.parent.name == "final_runs":
        return here.parent
    return _next_run_dir(_workspace_dir())


RUN_DIR = _resolve_run_dir()
WORKSPACE = _workspace_dir()
SCREENSHOTS = RUN_DIR / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
LOG = RUN_DIR / "final_script_log.txt"
LOG.write_text("", encoding="utf-8")


def log_line(line: str) -> None:
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"{line}\n")
    print(line)


def log_step(step: int, message: str) -> None:
    log_line(f"step {step} action: {message}")


def safe_name(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9가-힣._-]+", "_", value).strip("_")[:80] or "step"


async def safe_click(locator: Any, label: str) -> None:
    """Click a console control only after checking its supplied and resolved labels."""
    try:
        resolved = await locator.evaluate(
            """element => [
                element.innerText,
                element.getAttribute('aria-label'),
                element.getAttribute('title'),
            ].filter(Boolean).join(' ')"""
        )
    except Exception:
        resolved = ""
    candidate_label = f"{label} {resolved}".casefold()
    blocked = next((item for item in CONSOLE_CLICK_BLOCKLIST if item.casefold() in candidate_label), None)
    if blocked:
        raise RuntimeError(f"Refusing unsafe PlayMCP console click ({blocked}): {label!r} / {resolved!r}")
    await locator.click(timeout=10_000)


async def screenshot(page: Any, step: int, label: str) -> str:
    path = SCREENSHOTS / f"final_execution_{step}_{safe_name(label)}.png"
    await page.screenshot(path=str(path))
    return str(path)


def fetch_json(url: str, timeout: int = 20) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": "dongnesos-webwright/0.1"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def run_command(step: int, command: list[str], cwd: Path, env: dict[str, str]) -> dict[str, Any]:
    log_step(step, f"run command: {' '.join(command)}")
    started = time.time()
    proc = subprocess.run(command, cwd=cwd, env=env, text=True, capture_output=True)
    result = {
        "command": command,
        "cwd": str(cwd),
        "returncode": proc.returncode,
        "duration_sec": round(time.time() - started, 2),
        "stdout_tail": proc.stdout[-4000:],
        "stderr_tail": proc.stderr[-4000:],
    }
    with (RUN_DIR / f"command_{step}.json").open("w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    if proc.returncode != 0:
        raise RuntimeError(f"command failed at step {step}: {' '.join(command)}\n{proc.stderr[-2000:]}")
    return result


def refresh_profile_from_brave(source_profile_dir: Path, profile_dir: Path) -> None:
    if not source_profile_dir.exists():
        raise RuntimeError(f"source Brave profile does not exist: {source_profile_dir}")
    brave_root = source_profile_dir.parent
    local_state = brave_root / "Local State"
    if not local_state.exists():
        raise RuntimeError(f"Brave Local State not found next to source profile: {local_state}")

    log_step(0, f"refresh Webwright browser profile from read-only Brave profile copy: {source_profile_dir}")
    if profile_dir.exists():
        shutil.rmtree(profile_dir)
    profile_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(local_state, profile_dir / "Local State")
    target_default = profile_dir / "Default"
    excludes = [
        "--exclude=Cache/",
        "--exclude=Code Cache/",
        "--exclude=GPUCache/",
        "--exclude=GrShaderCache/",
        "--exclude=ShaderCache/",
        "--exclude=DawnCache/",
        "--exclude=Crashpad/",
        "--exclude=BrowserMetrics/",
        "--exclude=Singleton*",
        "--exclude=*.lock",
    ]
    subprocess.run(
        ["rsync", "-a", "--delete", *excludes, f"{source_profile_dir}/", f"{target_default}/"],
        check=True,
        text=True,
        capture_output=True,
    )


def run_api_checks(endpoint: str, expected_commit: str, repo_root: Path) -> dict[str, Any]:
    health_url = endpoint.replace("/mcp", "/healthz")
    health = fetch_json(health_url)
    if health.get("ok") is not True:
        raise RuntimeError(f"health check failed: {health}")

    stamp = time.strftime("%Y%m%dT%H%M%S")
    evidence_dir = repo_root / "deploy/playmcp/evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    env_base = os.environ.copy()
    env_base["MCP_URL"] = endpoint

    smoke_out = evidence_dir / f"webwright-remote-smoke-{stamp}.json"
    env = env_base | {"EVIDENCE_OUT": str(smoke_out)}
    run_command(1, ["npm", "run", "smoke:endpoint"], repo_root, env)

    actual_out = evidence_dir / f"webwright-remote-actual-use-{stamp}.json"
    env = env_base | {"COMMIT_EXPECTED": expected_commit, "EVIDENCE_OUT": str(actual_out)}
    run_command(2, ["npm", "run", "smoke:actual-use:endpoint"], repo_root, env)

    review_out = evidence_dir / f"webwright-remote-output-review-{stamp}.json"
    review_md = evidence_dir / f"webwright-remote-output-review-{stamp}.md"
    env = env_base | {"EVIDENCE_OUT": str(review_out), "MARKDOWN_OUT": str(review_md)}
    run_command(3, ["npm", "run", "review:actual-output:endpoint"], repo_root, env)

    actual = json.loads(actual_out.read_text(encoding="utf-8"))
    review = json.loads(review_out.read_text(encoding="utf-8"))
    if actual.get("overall_pass") is not True:
        raise RuntimeError(f"actual-use smoke failed: {actual_out}")
    if review.get("overall_pass") is not True:
        raise RuntimeError(f"actual-output review failed: {review_out}")

    return {
        "health_url": health_url,
        "health": health,
        "smoke_evidence": str(smoke_out),
        "actual_use_evidence": str(actual_out),
        "output_review_evidence": str(review_out),
        "output_review_markdown": str(review_md),
        "overall_pass": True,
    }


class LoginRequired(RuntimeError):
    pass


async def body_text(page: Any) -> str:
    try:
        return await page.locator("body").inner_text(timeout=10_000)
    except PlaywrightTimeoutError:
        return ""


async def page_haystack(page: Any) -> str:
    try:
        title = await page.title()
    except Exception:
        title = ""
    return f"{title}\n{await body_text(page)}"


async def capture_login_blocker(page: Any, step: int, label: str) -> None:
    try:
        await screenshot(page, step, label)
    except Exception:
        pass


async def require_logged_in(
    page: Any,
    expected_text: str | list[str],
    setup_login: bool,
    step: int,
    login_timeout_sec: int = DEFAULT_LOGIN_TIMEOUT_SEC,
) -> None:
    expected_texts = [expected_text] if isinstance(expected_text, str) else expected_text
    haystack = await page_haystack(page)
    if any(token in haystack for token in expected_texts):
        return
    if setup_login:
        log_step(step, f"waiting up to {login_timeout_sec}s for manual login until page contains one of {expected_texts!r}")
        try:
            await page.wait_for_function(
                """needles => {
                    const haystack = `${document.title || ''}\n${document.body ? document.body.innerText : ''}`;
                    return needles.some(needle => haystack.includes(needle));
                }""",
                arg=expected_texts,
                timeout=login_timeout_sec * 1000,
            )
            return
        except PlaywrightTimeoutError as exc:
            await capture_login_blocker(page, step, "login_required_timeout")
            raise LoginRequired(f"LOGIN_REQUIRED: login did not complete for {page.url}") from exc
    if any(token in haystack for token in ("로그인", "Login", "카카오계정", "PlayMCP에 가입한")):
        await capture_login_blocker(page, step, "login_required")
        raise LoginRequired(f"LOGIN_REQUIRED: {page.url}")
    await capture_login_blocker(page, step, "login_required_unexpected_page")
    raise LoginRequired(f"LOGIN_REQUIRED_OR_UNEXPECTED_PAGE: expected one of {expected_texts!r} at {page.url}")


async def enable_stay_logged_in_if_present(page: Any) -> bool:
    candidates = [
        "input[id^='staySignedIn']",
        "input[name='staySignedIn']",
        "label#label-staySignedIn",
        "text=Stay Logged In",
        "text=로그인 상태 유지",
    ]
    for selector in candidates:
        loc = page.locator(selector).first
        try:
            if await loc.count() == 0:
                continue
            if not await loc.is_visible(timeout=1000):
                continue
            tag = await loc.evaluate("el => el.tagName.toLowerCase()")
            if tag == "input":
                checked = await loc.evaluate("el => !!el.checked")
                if not checked:
                    await loc.check(force=True)
                return True
            await loc.click()
            return True
        except Exception:
            continue
    return False


def brave_executable() -> str | None:
    path = Path("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser")
    return str(path) if path.exists() else None


async def open_context(profile_dir: Path, headless: bool, viewport: dict[str, int]):
    playwright = await async_playwright().start()
    executable = brave_executable()
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(profile_dir),
        headless=headless,
        executable_path=executable,
        viewport=viewport,
        args=[
            "--disable-blink-features=AutomationControlled",
            f"--window-size={viewport['width']},{viewport['height']}",
        ],
    )
    return playwright, context


async def prepare_login(
    profile_dir: Path,
    headless: bool,
    login_viewport_height: int,
    login_timeout_sec: int,
) -> None:
    login_viewport = {"width": 1280, "height": login_viewport_height}
    playwright, context = await open_context(profile_dir, headless=headless, viewport=login_viewport)
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        log_step(
            4,
            f"setup login using temporary viewport {login_viewport['width']}x{login_viewport['height']} to avoid Kakao Account vertical centering",
        )
        await page.goto("https://playmcp.kakaocloud.io/my-mcp", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        stay_enabled = await enable_stay_logged_in_if_present(page)
        if stay_enabled:
            log_step(4, "enabled Kakao Stay Logged In before manual login")
        await screenshot(page, 4, "login_setup_kakaocloud")
        await require_logged_in(page, KAKAOCLOUD_LOGIN_MARKERS, True, 4, login_timeout_sec)
        await page.wait_for_timeout(2000)
        await context.storage_state(path=str(RUN_DIR / "storage_state_after_kakaocloud_login.json"))
        await screenshot(page, 4, "login_setup_kakaocloud_complete")

        await page.goto("https://playmcp.kakao.com/toolbox", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        stay_enabled = await enable_stay_logged_in_if_present(page)
        if stay_enabled:
            log_step(4, "enabled Kakao Stay Logged In before manual toolbox login")
        await screenshot(page, 4, "login_setup_playmcp_toolbox")
        await require_logged_in(page, PLAYMCP_TOOLBOX_MARKERS, True, 4, login_timeout_sec)
        await page.wait_for_timeout(2000)
        await context.storage_state(path=str(RUN_DIR / "storage_state_after_toolbox_login.json"))
        await screenshot(page, 4, "login_setup_playmcp_toolbox_complete")
    finally:
        await context.close()
        await playwright.stop()


async def verify_kakao_cloud(page: Any, server_name: str, setup_login: bool) -> dict[str, Any]:
    await page.goto("https://playmcp.kakaocloud.io/my-mcp", wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    await require_logged_in(page, KAKAOCLOUD_LOGIN_MARKERS, setup_login, 4)
    # The KakaoCloud hub renders server cards where innerText cannot see the name
    # (shadow/normalized text), so use a shadow-aware locator instead of `in text`.
    server_locator = page.get_by_text(server_name, exact=False)
    try:
        await server_locator.first.wait_for(timeout=15_000)
    except PlaywrightTimeoutError:
        pass
    server_visible = await server_locator.count() > 0
    text = await body_text(page)
    await screenshot(page, 4, "kakaocloud_mcp_hub")
    has_failure = bool(re.search(r"실패\s*[1-9]", text)) or bool(re.search(r"\bFailed\b", text))
    status_ok = server_visible and not has_failure
    if not status_ok:
        raise RuntimeError(f"KakaoCloud Hub did not show healthy {server_name}")
    return {"server_visible": server_visible, "status_ok": status_ok, "url": page.url}


async def visible_form_fields(page: Any) -> list[dict[str, Any]]:
    return await page.locator("input, textarea").evaluate_all(
        """els => els.map((e, index) => ({
            index,
            tag: e.tagName,
            type: e.getAttribute('type') || '',
            value: e.value || '',
            placeholder: e.getAttribute('placeholder') || '',
            aria: e.getAttribute('aria-label') || '',
            name: e.getAttribute('name') || '',
            id: e.id || '',
            labels: Array.from(e.labels || []).map(label => label.innerText || label.textContent || '').join(' '),
            visible: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
        }))"""
    )


def field_metadata(field: dict[str, Any]) -> str:
    return " ".join(str(field.get(key, "")) for key in ("value", "placeholder", "aria", "name", "id", "labels")).casefold()


def is_starter_field(field: dict[str, Any]) -> bool:
    return bool(field.get("visible")) and any(term in field_metadata(field) for term in STARTER_FIELD_TERMS)


def selector_regression_guard() -> None:
    current_ui_probe = {
        "visible": True,
        "placeholder": "대화 예시를 입력하세요",
        "value": "보도블록이 깨졌는데 어디에 말해?",
    }
    if not is_starter_field(current_ui_probe):
        raise RuntimeError("PlayMCP starter selector regression: current '대화 예시' placeholder was not recognized")


def load_console_copy() -> tuple[str, list[str]]:
    copy_path = WORKSPACE.parent / "entry-form-copy.md"
    copy_text = copy_path.read_text(encoding="utf-8")
    description_match = re.search(r"## 1\.[^\n]*\n(?P<copy>.*?)(?=\n## 2\.)", copy_text, re.DOTALL)
    starter_match = re.search(r"## 2\.[^\n]*\n(?P<copy>.*?)(?=\n## 3\.)", copy_text, re.DOTALL)
    if not description_match or not starter_match:
        raise RuntimeError(f"PlayMCP entry copy sections were not found in {copy_path}")
    description = "\n".join(
        re.sub(r"^> ?", "", line) for line in description_match.group("copy").splitlines() if line.startswith(">") or not line
    ).strip()
    starters = re.findall(r"^\d+\.\s+`([^`]+)`$", starter_match.group("copy"), re.MULTILINE)
    if not description or len(starters) != 4:
        raise RuntimeError(f"PlayMCP entry copy is incomplete in {copy_path}")
    return description, starters


async def mcp_card_toggle(page: Any, mcp_name: str) -> Any:
    """Return the expand toggle belonging to the requested MCP card, never a guessed card."""
    toggles = page.locator("button.btn_fold")
    count = await toggles.count()
    matching_indexes: list[int] = []
    for index in range(count):
        toggle = toggles.nth(index)
        in_mcp_card = await toggle.evaluate(
            """(element, name) => {
                let current = element;
                for (let depth = 0; current && depth < 12; depth += 1) {
                    const text = current.innerText || current.textContent || '';
                    if (text.includes(name)) return true;
                    current = current.parentElement || current.getRootNode().host || null;
                }
                return false;
            }""",
            mcp_name,
        )
        if in_mcp_card:
            matching_indexes.append(index)
    if len(matching_indexes) != 1:
        raise RuntimeError(
            f"PlayMCP console card expand toggle was not uniquely found for {mcp_name!r} "
            f"({len(matching_indexes)} matching button.btn_fold controls)"
        )
    return toggles.nth(matching_indexes[0])


async def console_text_button(page: Any, label: str) -> Any:
    """Find a uniquely labelled console button without relying on accessibility names."""
    exact_text = page.get_by_text(label, exact=True)
    button_from_text = exact_text.locator("xpath=ancestor-or-self::button[1]")
    if await button_from_text.count() == 1:
        return button_from_text

    exact_button = page.locator("button").filter(has_text=re.compile(rf"^{re.escape(label)}$"))
    if await exact_button.count() == 1:
        return exact_button
    raise RuntimeError(f"PlayMCP console button was not uniquely found: {label!r}")


async def verify_or_update_console(
    page: Any,
    mcp_name: str,
    endpoint: str,
    setup_login: bool,
    update_console: bool,
) -> dict[str, Any]:
    await page.goto("https://playmcp.kakao.com/console?tab=draft", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)
    await require_logged_in(page, PLAYMCP_CONSOLE_MARKERS, setup_login, 5)
    await screenshot(page, 5, "playmcp_console_draft")
    mcp_locator = page.get_by_text(mcp_name, exact=False).first
    try:
        await mcp_locator.wait_for(state="visible", timeout=10_000)
    except PlaywrightTimeoutError:
        draft_tab = page.get_by_role("tab", name=re.compile(r"임시 등록된 MCP"))
        if await draft_tab.count() == 0:
            draft_tab = page.get_by_role("button", name=re.compile(r"임시 등록된 MCP"))
        if await draft_tab.count() == 0:
            raise RuntimeError(f"PlayMCP console did not show MCP name or draft tab for {mcp_name!r}")
        await safe_click(draft_tab.first, "임시 등록된 MCP")
        await mcp_locator.wait_for(state="visible", timeout=10_000)

    text = await body_text(page)
    result: dict[str, Any] = {"mcp_visible": True, "endpoint_visible": endpoint in text, "updated": False}
    if not update_console:
        return result

    forbidden_before = await body_text(page)
    if "심사 요청" in forbidden_before:
        log_step(6, "review submission controls detected; update path will avoid them")

    # The card is collapsed by default. Its icon-only button.btn_fold reveals 수정.
    edit_button = page.locator("button.btn_secondary")
    if await edit_button.count() != 1:
        edit_button = await console_text_button(page, "수정")
    for _ in range(2):
        if await edit_button.is_visible():
            break
        toggle = await mcp_card_toggle(page, mcp_name)
        await safe_click(toggle, f"{mcp_name} 카드 펼치기")
        await page.wait_for_timeout(750)
    if not await edit_button.is_visible():
        await screenshot(page, 6, "console_card_expand_failed")
        raise RuntimeError(f"PlayMCP console edit button was not revealed for {mcp_name!r}")

    await safe_click(edit_button, "수정")
    await page.wait_for_timeout(1500)

    fields = await visible_form_fields(page)
    log_line(f"console edit form fields: {json.dumps(fields, ensure_ascii=False)}")
    endpoint_index = None
    for field in fields:
        combined = field_metadata(field)
        if field["visible"] and ("mcp endpoint" in combined or "endpoint" in combined or "엔드포인트" in combined):
            endpoint_index = int(field["index"])
            break
    if endpoint_index is None:
        for field in fields:
            combined = field_metadata(field)
            if field["visible"] and ("playmcp-endpoint" in combined or "/mcp" in combined):
                endpoint_index = int(field["index"])
                break
    if endpoint_index is None:
        await screenshot(page, 6, "console_endpoint_field_not_found")
        raise RuntimeError("PlayMCP console endpoint input was not found")

    endpoint_field = page.locator("input, textarea").nth(endpoint_index)
    endpoint_before = await endpoint_field.input_value()
    result["endpoint_before"] = endpoint_before
    log_line(f"console endpoint before update: {endpoint_before}")
    await screenshot(page, 6, "console_edit_form")
    await endpoint_field.fill(endpoint)
    await screenshot(page, 6, "console_endpoint_filled")
    refresh_button = await console_text_button(page, "정보 불러오기")
    if not await refresh_button.is_visible():
        raise RuntimeError("PlayMCP console information refresh button was not found")
    await safe_click(refresh_button, "정보 불러오기")
    result["metadata_refreshed"] = True
    await page.wait_for_timeout(3000)

    description_updated = False
    starters_updated = False
    copy_skip_reason = ""
    try:
        description, starters = load_console_copy()
        fields = await visible_form_fields(page)
        description_fields = [
            field
            for field in fields
            if field["visible"]
            and field["tag"] == "TEXTAREA"
            and any(term in field_metadata(field) for term in ("설명", "description", "서비스 소개"))
        ]
        if len(description_fields) == 1:
            await page.locator("input, textarea").nth(int(description_fields[0]["index"])).fill(description)
            description_updated = True
        else:
            copy_skip_reason = f"description field was not uniquely identified ({len(description_fields)} candidates)"

        starter_fields = [field for field in fields if is_starter_field(field)]
        result["starter_slots_detected"] = len(starter_fields)
        if 3 <= len(starter_fields) <= len(starters):
            for field, starter in zip(starter_fields, starters):
                await page.locator("input, textarea").nth(int(field["index"])).fill(starter)
            starters_updated = True
        else:
            starter_reason = f"starter fields were not uniquely identified ({len(starter_fields)} candidates)"
            copy_skip_reason = "; ".join(part for part in (copy_skip_reason, starter_reason) if part)
    except Exception as exc:
        copy_skip_reason = f"copy update skipped: {exc}"
        log_line(copy_skip_reason)
    result["description_updated"] = description_updated
    result["starters_updated"] = starters_updated
    if copy_skip_reason:
        result["copy_update_skipped_reason"] = copy_skip_reason

    save_button = await console_text_button(page, "저장하기")
    if not await save_button.is_visible():
        raise RuntimeError("PlayMCP console save button was not found")
    await safe_click(save_button, "저장하기")
    await page.wait_for_timeout(3000)
    await screenshot(page, 7, "console_endpoint_saved")
    result["updated"] = True
    result["endpoint_saved"] = True
    saved_fields = await visible_form_fields(page)
    result["endpoint_visible"] = endpoint in await body_text(page) or any(
        field["visible"] and field.get("value") == endpoint for field in saved_fields
    )
    (RUN_DIR / "console_update_result.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return result


async def find_composer(page: Any):
    selectors = [
        "textarea",
        "[contenteditable='true']",
        "div[role='textbox']",
        "input[type='text']",
    ]
    for selector in selectors:
        loc = page.locator(selector)
        count = await loc.count()
        for index in range(count - 1, -1, -1):
            candidate = loc.nth(index)
            try:
                if await candidate.is_visible(timeout=1000):
                    return candidate
            except Exception:
                continue
    raise RuntimeError("Toolbox composer was not found")


async def verify_toolbox(page: Any, mcp_name: str, prompt: str, setup_login: bool) -> dict[str, Any]:
    await page.goto("https://playmcp.kakao.com/toolbox", wait_until="domcontentloaded")
    await page.wait_for_timeout(3500)
    await require_logged_in(page, PLAYMCP_TOOLBOX_MARKERS, setup_login, 8)
    before = await body_text(page)
    if mcp_name not in before:
        log_step(8, f"{mcp_name} not visible before chat; continuing because it may be selected in hidden tools drawer")
    await screenshot(page, 8, "toolbox_before_prompt")

    # The chat composer only renders after opening the AI 채팅 panel.
    if await page.get_by_role("button", name="AI 채팅").count() > 0:
        await safe_click(page.get_by_role("button", name="AI 채팅").first, "AI 채팅")
        await page.wait_for_timeout(4000)

    composer = await find_composer(page)
    await composer.click()
    await composer.fill(prompt)
    await page.keyboard.press("Enter")
    log_step(9, "sent toolbox privacy-sensitive parking prompt")

    expected_tokens = ["안전신문고", "국민신문고", "개인정보"]
    try:
        await page.wait_for_function(
            """tokens => tokens.every(token => document.body && document.body.innerText.includes(token))""",
            arg=expected_tokens,
            timeout=120_000,
        )
    except PlaywrightTimeoutError:
        await screenshot(page, 9, "toolbox_answer_timeout")
        raise RuntimeError("Toolbox answer did not include expected quality tokens before timeout")

    await page.wait_for_timeout(3000)
    text = await body_text(page)
    await screenshot(page, 10, "toolbox_answer")
    tail = text[-8000:]
    gates = {
        "has_safetyreport": "안전신문고" in tail,
        "has_epeople": "국민신문고" in tail,
        "has_privacy_context": "개인정보" in tail and ("차량번호" in tail or "얼굴" in tail),
        "has_copy_ready_guidance": any(token in tail for token in ("복사", "붙여넣", "신고문", "신고 준비문")),
        "no_classified_wording": not re.search(r"분류되었|분류됩니다", tail),
    }
    pass_all = all(gates.values())
    if not pass_all:
        raise RuntimeError(f"Toolbox quality gates failed: {gates}")
    (RUN_DIR / "toolbox_answer_tail.txt").write_text(tail, encoding="utf-8")
    return {"gates": gates, "pass": True, "answer_tail_path": str(RUN_DIR / "toolbox_answer_tail.txt")}


async def run_browser_checks(
    endpoint: str,
    server_name: str,
    mcp_name: str,
    profile_dir: Path,
    headless: bool,
    setup_login: bool,
    update_console: bool,
    toolbox_prompt: str,
    login_viewport_height: int,
    login_timeout_sec: int,
) -> dict[str, Any]:
    profile_dir.mkdir(parents=True, exist_ok=True)
    if setup_login:
        await prepare_login(
            profile_dir,
            headless=headless,
            login_viewport_height=login_viewport_height,
            login_timeout_sec=login_timeout_sec,
        )

    playwright, context = await open_context(profile_dir, headless=headless, viewport=VERIFY_VIEWPORT)
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        results = {
            "kakao_cloud": await verify_kakao_cloud(page, server_name, False),
            "console": await verify_or_update_console(page, mcp_name, endpoint, False, update_console),
        }
        # A later answer-quality failure must not hide a completed console save.
        (RUN_DIR / "console_update_result.json").write_text(
            json.dumps(results["console"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        try:
            results["toolbox"] = await verify_toolbox(page, mcp_name, toolbox_prompt, False)
        except Exception as exc:
            results["toolbox"] = {"pass": False, "error": str(exc)}
            results["toolbox_error"] = str(exc)
            log_line(f"toolbox verification failed after console result was captured: {exc}")
        return results
    finally:
        await context.close()
        await playwright.stop()


async def verify_session_persistence(
    profile_dir: Path,
    headless: bool,
    setup_login: bool,
    login_viewport_height: int,
    login_timeout_sec: int,
) -> dict[str, Any]:
    if setup_login:
        await prepare_login(
            profile_dir,
            headless=headless,
            login_viewport_height=login_viewport_height,
            login_timeout_sec=login_timeout_sec,
        )

    playwright, context = await open_context(profile_dir, headless=headless, viewport=VERIFY_VIEWPORT)
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://playmcp.kakaocloud.io/my-mcp", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        await require_logged_in(page, KAKAOCLOUD_LOGIN_MARKERS, False, 11)
        kc_text = await page_haystack(page)
        await screenshot(page, 11, "session_reopen_kakaocloud_logged_in")

        await page.goto("https://playmcp.kakao.com/toolbox", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await require_logged_in(page, PLAYMCP_TOOLBOX_MARKERS, False, 12)
        toolbox_text = await page_haystack(page)
        await screenshot(page, 12, "session_reopen_toolbox_logged_in")

        return {
            "kakaocloud_logged_in": any(token in kc_text for token in KAKAOCLOUD_LOGIN_MARKERS),
            "toolbox_logged_in": any(token in toolbox_text for token in PLAYMCP_TOOLBOX_MARKERS),
            "session_persisted_after_reopen": True,
        }
    finally:
        await context.close()
        await playwright.stop()


def verify_playmcp_flow(
    endpoint: str = DEFAULT_ENDPOINT,
    server_name: str = "dongnesos-mcp-v7",
    mcp_name: str = "동네SOS",
    expected_commit: str = "0c16cb2",
    repo_root: str = DEFAULT_REPO_ROOT,
    profile_dir: str = str(WORKSPACE / "browser-profile"),
    source_brave_profile_dir: str = DEFAULT_SOURCE_BRAVE_PROFILE,
    refresh_profile_from_brave: bool = False,
    mode: str = "all",
    update_console: bool = False,
    setup_login: bool = False,
    headless: bool = False,
    toolbox_prompt: str = DEFAULT_PROMPT,
    login_viewport_height: int = DEFAULT_LOGIN_VIEWPORT_HEIGHT,
    login_timeout_sec: int = DEFAULT_LOGIN_TIMEOUT_SEC,
) -> dict[str, Any]:
    """Verify DongneSOS PlayMCP deployment, console registration, and toolbox answer quality.

    Args:
        endpoint: Deployed MCP endpoint URL ending in /mcp.
            Default: "https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp".
        server_name: KakaoCloud MCP Hub server card name to verify.
            Default: "dongnesos-mcp-v7".
        mcp_name: PlayMCP console/toolbox display name to verify.
            Default: "동네SOS".
        expected_commit: Git short SHA expected by the actual-use smoke script.
            Default: "0c16cb2".
        repo_root: Absolute path to the dongnesos-mcp repository.
            Default: "/Users/jessiek/StudioProjects/dongnesos-mcp".
        profile_dir: Persistent Playwright browser profile directory for logged-in PlayMCP sessions.
            Default: "deploy/playmcp/webwright/browser-profile".
        source_brave_profile_dir: Logged-in Brave profile directory copied into the ignored Webwright profile when refresh_profile_from_brave is true.
            Default: "/Users/jessiek/Library/Application Support/BraveSoftware/Brave-Browser/Profile 9".
        refresh_profile_from_brave: If true, rebuild the ignored Webwright browser profile from source_brave_profile_dir before checks.
            Default: false.
        mode: Which verification surface to run: "api", "session", "browser", or "all".
            Default: "all".
        update_console: If true, update the PlayMCP console endpoint field and save. Never clicks review submission controls.
            Default: false.
        setup_login: If true, wait up to four minutes for manual login in the Webwright browser profile.
            Default: false.
        headless: If true, run browser checks without a visible browser window.
            Default: false.
        toolbox_prompt: User prompt sent to PlayMCP toolbox for answer-quality verification.
            Default: privacy-sensitive illegal-parking case.
        login_viewport_height: Temporary headed browser height used only for manual login setup.
            Default: 900.
        login_timeout_sec: Seconds to wait for manual login during setup.
            Default: 600.

    Returns:
        dict with keys ``run_dir`` (str), ``api`` (dict or null), ``browser`` (dict or null),
        and ``overall_pass`` (bool).
    """
    selector_regression_guard()
    repo = Path(repo_root).expanduser().resolve()
    profile = Path(profile_dir).expanduser()
    if not profile.is_absolute():
        if profile.parts and profile.parts[0] == "deploy":
            profile = (repo / profile).resolve()
        else:
            profile = (WORKSPACE / profile).resolve()
    source_profile = Path(source_brave_profile_dir).expanduser().resolve()

    log_line(
        "step 0 params: "
        f"endpoint={endpoint} server_name={server_name} mcp_name={mcp_name} "
        f"expected_commit={expected_commit} repo_root={repo} profile_dir={profile} "
        f"source_brave_profile_dir={source_profile} refresh_profile_from_brave={refresh_profile_from_brave} "
        f"mode={mode} update_console={update_console} setup_login={setup_login} headless={headless} "
        f"login_viewport_height={login_viewport_height} login_timeout_sec={login_timeout_sec}"
    )

    result: dict[str, Any] = {"run_dir": str(RUN_DIR), "api": None, "session": None, "browser": None, "overall_pass": False}
    if refresh_profile_from_brave:
        refresh_profile_from_brave_fn = globals()["refresh_profile_from_brave"]
        refresh_profile_from_brave_fn(source_profile, profile)
    if mode in ("api", "all"):
        result["api"] = run_api_checks(endpoint, expected_commit, repo)
    if mode == "session":
        result["session"] = asyncio.run(
            verify_session_persistence(profile, headless, setup_login, login_viewport_height, login_timeout_sec)
        )
    if mode in ("browser", "all"):
        result["browser"] = asyncio.run(
            run_browser_checks(
                endpoint,
                server_name,
                mcp_name,
                profile,
                headless,
                setup_login,
                update_console,
                toolbox_prompt,
                login_viewport_height,
                login_timeout_sec,
            )
        )
    result["overall_pass"] = not bool((result["browser"] or {}).get("toolbox_error"))
    with (RUN_DIR / "result.json").open("w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    log_line(f"FINAL_RESPONSE: {json.dumps(result, ensure_ascii=False)}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=verify_playmcp_flow.__doc__.splitlines()[0])
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Deployed MCP endpoint URL ending in /mcp.")
    parser.add_argument("--server-name", default="dongnesos-mcp-v7", help="KakaoCloud MCP Hub server card name.")
    parser.add_argument("--mcp-name", default="동네SOS", help="PlayMCP console/toolbox display name.")
    parser.add_argument("--expected-commit", default="0c16cb2", help="Git short SHA expected by actual-use smoke.")
    parser.add_argument("--repo-root", default=DEFAULT_REPO_ROOT, help="Absolute path to dongnesos-mcp repo.")
    parser.add_argument("--profile-dir", default=str(WORKSPACE / "browser-profile"), help="Persistent Playwright browser profile dir.")
    parser.add_argument(
        "--source-brave-profile-dir",
        default=DEFAULT_SOURCE_BRAVE_PROFILE,
        help="Logged-in Brave profile directory copied into the ignored Webwright profile when requested.",
    )
    parser.add_argument(
        "--refresh-profile-from-brave",
        action="store_true",
        help="Rebuild the ignored Webwright browser profile from --source-brave-profile-dir before checks.",
    )
    parser.add_argument("--mode", choices=("api", "session", "browser", "all"), default="all", help="Verification surface to run.")
    parser.add_argument("--update-console", action="store_true", help="Opt in to updating the PlayMCP console endpoint and saving.")
    parser.add_argument("--setup-login", action="store_true", help="Wait for manual login in the Webwright browser profile when needed.")
    parser.add_argument("--headless", action="store_true", help="Run browser checks without a visible window.")
    parser.add_argument("--toolbox-prompt", default=DEFAULT_PROMPT, help="Prompt sent to PlayMCP toolbox.")
    parser.add_argument(
        "--login-viewport-height",
        type=int,
        default=DEFAULT_LOGIN_VIEWPORT_HEIGHT,
        help="Temporary headed browser height used only for manual login setup.",
    )
    parser.add_argument(
        "--login-timeout-sec",
        type=int,
        default=DEFAULT_LOGIN_TIMEOUT_SEC,
        help="Seconds to wait for manual login during setup.",
    )
    args = parser.parse_args()
    try:
        verify_playmcp_flow(**vars(args))
        return 0
    except LoginRequired as exc:
        payload = {"run_dir": str(RUN_DIR), "overall_pass": False, "blocker": str(exc)}
        (RUN_DIR / "result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        log_line(f"FINAL_RESPONSE: {json.dumps(payload, ensure_ascii=False)}")
        return 20
    except Exception as exc:
        payload = {"run_dir": str(RUN_DIR), "overall_pass": False, "error": repr(exc)}
        (RUN_DIR / "result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        log_line(f"FINAL_RESPONSE: {json.dumps(payload, ensure_ascii=False)}")
        raise


if __name__ == "__main__":
    sys.exit(main())
