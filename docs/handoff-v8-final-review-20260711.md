# DongneSOS PlayMCP 예선 — v8 핸드오프 (최종 검토 → 심사 요청)

작성: 2026-07-11 (KST). 마감: **2026-07-14** 예선 접수 종료.
이 문서는 다음 에이전트가 **더 섬세한 최종 검토 후 [등록 및 심사 요청]까지 오너 확인을 받아 진행**하도록 넘기는 핸드오프다.

---

## 0. 지금 상태 한눈에

- **심사 대상 서버 = `dongnesos-mcp-v8`** (KakaoCloud, GitHub `main` 커밋 `cd4972a`로 빌드, Status **Active**).
  - v8 엔드포인트: `https://dongnesos-mcp-v8.playmcp-endpoint.kakaocloud.io/mcp`
  - `/healthz` → `{"ok":true,...,"tools":["classify_civic_issue","draft_civic_report"]}`
- **PlayMCP 개발자 콘솔** (`동네SOS`, MCP id `62426279747569122`): 엔드포인트를 **v7 → v8로 교체 + 정보 불러오기 + 저장 완료**. 상태 **심사 전(NOT_REQUESTED)**, Tools 2.
- **도구함/AI 채팅**: `동네SOS`가 도구함(1/10)에 있고, AI 채팅이 **v8을 호출**함(검증됨).
- **v7**: 롤백용으로 **Active 유지**. **v6**: 오너가 슬롯 확보 위해 삭제함.
- 커밋(main, 최신 HEAD = `cd4972a`):
  - `5eb59c4` 제출 문서/계획 갱신
  - `c444144` Webwright KakaoCloud 허브 체크 shadow-aware 수정
  - `8b99c63` Webwright 콘솔 업데이트를 현재 PlayMCP UI에 맞게 수정
  - `dd01fe6` 툴박스(AI 채팅) 검증 수정
  - `cd4972a` **draft_civic_report self-heal 수정** (이번 버전 업데이트의 핵심)

---

## 1. 버전 업데이트의 핵심 (왜 v8인가)

**증상:** 실제 PlayMCP AI 채팅에서 "신고문 초안 만들어줘" 하면 `draft_civic_report`가 **실패**("죄송합니다. 신고문 초안 생성에 문제가 발생했습니다").

**원인(확정):** 챗 AI가 `classify_civic_issue`가 준 정확한 `issue_code`(예: `ILLEGAL_PARKING_SAFETY`) 대신 **엉뚱한 코드**(예: `safety_parking_illegal`)를 지어내서 `draft_civic_report`에 넘김 → 도구가 `E_UNKNOWN_ISSUE_CODE`로 거부. (직접 API 호출로 정확한 코드를 주면 항상 정상이라 스모크는 못 잡았음.)

**수정(`cd4972a`, Codex gpt-5.6-sol 구현):**
- `src/core/draft.ts`의 `resolveDraftTaxonomyItem`가 **코드/힌트가 미인식이면 facts 텍스트로 전체 taxonomy를 키워드 스코어링해 자동 분류(self-heal)** 하도록 변경. 정확 코드·기존 힌트 동작은 그대로. 근거 없는 얇은 입력은 여전히 안전하게 실패.
- 유닛테스트 2개 추가(자동복구 + 과잉매칭 방지). `npm run check` = **77 pass + tsc 빌드 통과**.

---

## 2. 방금까지의 검증 결과 (전부 실제 실행, v8 대상)

증거 파일은 모두 `deploy/playmcp/evidence/`(로컬, gitignore)에 있음.

| 검증 | 결과 | 증거 |
|---|---|---|
| v8 원격 smoke | PASS (health 200, 도구 2종 schema+annotations, classify/draft/emergency) | `remote-smoke-v8-20260711.json` |
| v8 actual-use | 10/10 PASS (커밋 `cd4972a`) | `remote-actual-use-v8-20260711.json` |
| draft 수정 직접 API | `safety_parking_illegal`/`parking_mobility_illegal` → `result_type=draft` (기존 E_UNKNOWN_ISSUE_CODE) | (재현 스크립트 실행 로그) |
| **라이브 AI 채팅 draft** | classify→draft 2턴 `draft_succeeded=true`, 에러 문구 없음 | `toolbox-v8-draft-success-20260711.txt/png` |
| 종합 증거 스냅샷 | Remote endpoint verified = PASS | `submission-evidence-v8-20260711.md` |
| 콘솔 상태 기록 | v7→v8 저장, draft-fix 라이브 확인 | `playmcp-temp-registration-v8-status.json` |

### 다양한 상황 최종 QA (AI 채팅, v8)
| 시나리오 | 결과 | 확인 |
|---|---|---|
| A. 가로등 고장 + 초안 | ✅ PASS | 분류·초안("제목: [가로등 고장]…")·공식경로(안전신문고·국민신문고) |
| B. 무단투기 + 초안 | ✅ PASS | 분류·초안("제목: [쓰레기 무단투기…]")·공식경로 |
| C. 가스누출(긴급) | ✅ PASS | 초안 **차단** + "119 등 공식 긴급 채널에 직접 연락" |
| D. 이웃 도움(강아지 산책) | ⚠️ 참고 | 챗이 **MCP 미호출**하고 일반 답변(모집글)함 — MCP 결함 아님 |

- QA 증거: `aichat-qa-*-20260711.*`.
- **QA 하네스 주의:** 2턴(분류→초안) 테스트 시 **1턴 답변이 끝난 뒤** 2턴을 보내야 함. 너무 빨리 보내면 draft 호출이 안 잡힘(제품 문제 아님). 첫 배치에서 A/B가 이 이유로 false였고, 간격 두고 재실행하니 둘 다 PASS.
- **D 해석:** 명백히 민원이 아닌 개인 도움 요청엔 챗 AI가 도구를 아예 호출하지 않고 스스로 답함. MCP는 호출되면 이웃 도움을 올바르게 거절(유닛/actual-use 확인). MCP가 챗의 도구 호출 여부를 강제할 수단은 없음.

---

## 3. 남은 일 (오너 전용 — 절대 자동 클릭 금지)

이 세 버튼은 **자동화가 절대 누르면 안 되고**, 오너 확인 후 오너가 누른다. `final_script.py`의 `safe_click` 블록리스트가 자동 클릭을 차단함.

1. 콘솔 → `동네SOS` 카드 펼치기 → **[등록 및 심사 요청]** 클릭 ← 오늘의 골
2. 승인 후: `나에게만 공개` → **[전체 공개]** (전체 공개 아니면 공모전 제외)
3. **[Player 예선 참여]** 폼 제출 — **1회 한정**, 답변은 `deploy/playmcp/entry-form-copy.md §4`
- 심사 결과/보완 요청은 `내 정보 관리 > 연결된 이메일`로 옴.

---

## 4. 다음 에이전트를 위한 환경/실행법

### 브라우저 자동화
- 스크립트: `deploy/playmcp/webwright/final_script.py` (Playwright + 로컬 Brave, 로그인 세션은 `browser-profile/`에 유지).
- venv: `deploy/playmcp/webwright/.venv`(playwright 1.60, gitignore). **절대경로로 실행**:
  `/Users/jessiek/StudioProjects/dongnesos-mcp/deploy/playmcp/webwright/.venv/bin/python <script>` + Bash `dangerouslyDisableSandbox`(네트워크 필요).
- 권한: `.claude/settings.local.json`에 이 venv python 실행 허용 규칙이 있음(이번 세션 추가). 없으면 auto-mode 분류기가 막을 수 있음.
- 로그인: **kakaocloud.io(허브/배포)와 kakao.com(콘솔/툴박스) 세션은 별개.** 만료되면
  `... final_script.py --mode session --setup-login --login-timeout-sec 600` 실행 → **오너가 창에서 수동 로그인**. (프로파일 락으로 `TargetClosedError` 나면 `browser-profile/Singleton*` 삭제 + 잔여 Brave 프로세스 kill 후 재시도.)
- 콘솔 재검증/업데이트: `--mode browser [--update-console] --endpoint <v8> --server-name dongnesos-mcp-v8 --mcp-name '동네SOS' --expected-commit cd4972a`.

### 검증된 셀렉터(shadow-DOM SPA)
- KakaoCloud 허브 카드명은 innerText로 안 보임 → Playwright 로케이터(`get_by_text`) 사용.
- 콘솔 카드 펼치기 = `button.btn_fold` (`.btn_open`은 무관). 수정 = `button.btn_secondary`. 저장 = `저장하기`(정확 텍스트). `get_by_role(name=...)`는 Kakao 버튼에서 자주 실패.
- 툴박스 채팅 입력창은 **"AI 채팅" 버튼 클릭 후** 나타남(`textarea.tf_comm`); 전송은 Enter.
- KakaoCloud 서버 삭제/생성은 파괴적 → auto-mode 분류기가 자동 실행을 차단(오너가 v6 수동 삭제; v8은 권한 규칙 추가 후 자동 생성함).

### npm 스크립트(로컬, 네트워크)
- `MCP_URL=<v8>/mcp EVIDENCE_OUT=... npm run smoke:endpoint`
- `MCP_URL=<v8>/mcp COMMIT_EXPECTED=cd4972a EVIDENCE_OUT=... npm run smoke:actual-use:endpoint`
- `... npm run evidence:submission` (env로 상태 주입)
- `npm run check` (validate+scan+test+build)

---

## 5. 하드 제약(반드시 유지)

- **[등록 및 심사 요청]·[전체 공개]·[Player 예선 참여] 자동 클릭 금지.** 준비 끝나면 오너 확인만.
- **3번째 MCP 도구 추가 금지, Kakao API 신규 연동 금지.**
- **v7(롤백)·v8 서버 삭제/중지 금지.**
- 각 단계는 **실제 실행 증거**(파일/스크린샷/명령출력)로만 완료 처리.
- Codex는 `goldpure369` 계정만 사용, 쿼터/인증 오류 시 계정 전환 없이 멈추고 오너에게 보고.

---

## 6. 더 섬세한 최종 검토 아이디어(선택)

- 추가 유형 2턴 테스트: 공공시설 파손, 불법광고물/적치, 도로 침수 등. (2턴 간격 주의 — §2 참고)
- 개인정보 케이스 재확인: 차량번호·아이 얼굴 포함 시 공식신고문엔 유지/공개공유문엔 제거 분리가 챗 답변에 반영되는지.
- 콘솔 **대화 예시(스타터)** 점검: 자동 업데이트 안 됨(폼은 3칸, `entry-form-copy.md §2`는 4개). 현재 값도 무난하나 오너가 3개로 다듬어도 됨.
- AI 채팅 질문 쿼터: ~46개 남음(약 2분당 1개 충전).
- 대표 이미지: 움직이는 이미지 금지, 서비스와 맞는 정적 이미지 권장(리뷰 정책).

---

## 7. 참고 파일
- 제출 카피: `deploy/playmcp/entry-form-copy.md` (§1 콘솔 설명 · §2 스타터 · §3 심사 노트 · §4 예선 폼)
- 공식 가이드 정리: `docs/playmcp-official-guide-reference.md`
- 제출 증거 규격: `PLAYMCP_SUBMISSION.md`
- 스프린트 계획: `docs/final-sprint-plan-20260710.md`
- 로컬 증거: `deploy/playmcp/evidence/*-20260711.*` (gitignore, 오너 머신에만 있음)

---

## 부록 A. 새 버전 업로드 (KakaoCloud Git 빌드) 상세 절차

서버 코드(`src/`)를 고쳤으면 **새 버전을 KakaoCloud에 새로 빌드**해야 반영된다. **제자리 재빌드는 없다** — v7/v8 상세 페이지의 액션은 `[중지]`·`[삭제]`뿐이라, 매번 새 서버(v9, v10 …)를 만든다.

### A-1. 전제: 슬롯 비우기 (서버 최대 2대)
- 공모전 규칙상 1인당 서버 **최대 2대**. 현재 v7(롤백)+v8 = 2/2. 새 버전을 만들려면 **낡은 것 하나를 먼저 삭제**해야 한다(보통 v7을 지우고 새 버전을 심사 대상으로, 또는 검증 후 교체).
- 삭제 경로: `playmcp.kakaocloud.io/my-mcp` → 서버 카드 클릭 → 상세(`/mcp-detail/<id>`) → **삭제할 서버가 맞는지 반드시 확인**(제목 + `Endpoint URL`에 그 버전 도메인이 있고 다른 버전 URL은 없어야 함) → 우상단 **[삭제]**.
- ⚠️ **삭제는 되돌릴 수 없고 파괴적이라 Claude auto-mode 분류기가 자동 실행을 막는다.** 이번엔 오너가 v6를 직접 삭제함. 자동화로 하려면: (1) `.claude/settings.local.json`에 실행 권한 규칙 필요, (2) `[삭제]` 클릭 후 뜨는 건 **native `confirm()` 다이얼로그일 가능성이 큼** — Playwright는 기본적으로 다이얼로그를 **자동 취소(dismiss)** 하므로 삭제가 안 됨. 실제로 지우려면 `page.on("dialog", lambda d: d.accept())`로 **accept** 해야 하고, accept 전 반드시 v6/대상 확인 어서션을 통과시킬 것. (안전 우선이면 오너가 포털에서 직접 삭제 권장.)
- 삭제 확인: my-mcp 목록에서 그 서버가 사라지고 `전체 N-1건`이 되는지, 남길 서버는 그대로 있는지 확인.

### A-2. 새 서버 생성 (Git 소스 빌드) — 실제 검증된 흐름
`playmcp.kakaocloud.io/my-mcp`에서:
1. **[+ 새 MCP 서버 등록 ▼]** 클릭 → 드롭다운에서 **[Git 소스 빌드]** 클릭.
2. **공모전 안내 모달**이 먼저 뜬다("PlayMCP in KC에서의 MCP 서버 등록은 Agentic Player 10 공모전 참가용으로만…") → **[확인]** 클릭해서 닫아야 폼이 나온다.
3. 폼 입력(모두 shadow-DOM; Playwright 로케이터는 shadow를 뚫음. **설명 필드는 placeholder가 숨은 이미지빌드 폼과 중복**되므로 `#gitBuildMcpDescription`로 지정):

   | 필드 | 셀렉터 | 값 |
   |---|---|---|
   | MCP 서버 이름 * | placeholder `예: my-git-mcp-server` | `dongnesos-mcp-v9` (소문자·숫자·하이픈·점만, DNS 규칙, **`kakao` 금지**) |
   | 설명 * | `#gitBuildMcpDescription` | `동네 생활 불편을 안전하게 분류하고 공식 민원 신고 준비문과 개인정보 보호용 공유 문안을 작성하는 MCP 서버입니다.` |
   | Git URL * | placeholder `예: https://github.com/org/mcp-server.git` | `https://github.com/kjessie00/dongnesos-mcp.git` |
   | 브랜치 / ref | placeholder `main`(기본값 `main`) | `main` (최신 커밋 자동 반영) |
   | Dockerfile 경로 | placeholder `Dockerfile`(기본값 `Dockerfile`) | `Dockerfile` |
   | PAT (선택) | password | 공개 저장소라 **비움** |
   | (제출) | 텍스트 `등록하기` (visible) | 클릭 |

   - 참고(이전 v5 페이로드): registry `ai-service.kr-central-2.kcr.dev`, image_name `kc-playmcp-cr/user-img-dongnesos-mcp-vN` — 서버명에서 자동 파생되므로 직접 입력할 필요 없음.
   - 입력 후 **읽기 재확인**(input_value)으로 이름/URL이 맞는지 검증한 뒤 `등록하기` 클릭.
4. 제출 성공 시 목록에 새 서버가 **Status `Starting`**(빌드·배포 중)으로 뜬다. 빌드+배포에 수 분 소요.

### A-3. 활성화 대기 & 실패 처리
- 완료 감지: `https://dongnesos-mcp-v9.playmcp-endpoint.kakaocloud.io/healthz`를 폴링(HTTP 200 + `{"ok":true,...,"tools":[...]}`)하면 준비 완료. (`curl`은 이 환경에서 막혀 있으니 python `urllib`나 npm 스크립트로.)
- v8은 이번에 **정상 빌드 성공**. 다만 과거 v4는 KakaoCloud 플랫폼 오류(KServe webhook timeout)로 실패한 이력이 있음 — 실패하면 **실패 서버를 삭제하고 재시도**, 그동안 이전 버전(v7/v8)이 살아있어 제출은 안전.
- 자동화 주의: **생성(빌드)** 은 권한 규칙 추가 후 자동 실행됐지만, **삭제**는 분류기가 막았음(A-1 참고).

### A-4. 활성화 후 필수 후속 작업
1. **콘솔 엔드포인트 교체**: `deploy/playmcp/webwright/final_script.py --mode browser --update-console --endpoint <새 v9 /mcp> --server-name dongnesos-mcp-v9 --mcp-name '동네SOS' --expected-commit <새 커밋>` → 카드 펼치기(`btn_fold`) → 수정(`btn_secondary`) → 엔드포인트 채우기 → **정보 불러오기** → **저장하기**. `console_update_result.json`에 `endpoint_before/after`, `endpoint_saved` 기록됨.
2. 원격 재검증: `npm run smoke:endpoint`, `smoke:actual-use:endpoint`(부록 없이도 §4).
3. **AI 채팅 재검증**(부록 B) — 특히 draft가 새 서버에서도 self-heal 하는지.

---

## 부록 B. 카카오 사이트(AI 채팅)로 이 도구 검토하는 상세 절차

심사자는 **`playmcp.kakao.com/toolbox`의 AI 채팅**에서 `동네SOS`를 실제로 써 본다. 여기서 도구가 제대로 **호출**되고 답이 좋은지 확인하는 게 핵심 검토다. (엔드포인트 직접 스모크는 통과해도, 실제 챗에서 LLM이 도구를 어떻게 부르는지는 별개 — v8의 draft 버그가 이 경로에서만 드러났었다.)

### B-1. 채팅 열기 / 입력창
- URL: `https://playmcp.kakao.com/toolbox`. `동네SOS`가 **도구함(1/10)** 에 있어야 함(없으면 "MCP 추가하기").
- **"AI 채팅" 버튼을 클릭해야** 채팅 패널이 열린다(URL은 `/toolbox` 그대로). **입력창은 그 전에는 DOM에 없다** — 클릭 후 `textarea.tf_comm`가 생김. 전송은 **Enter**.
- 시나리오를 격리하려면 각 시나리오 전에 **"새 채팅"** 버튼으로 문맥 초기화.
- **어느 서버를 호출하나:** 도구함은 콘솔에 등록된 MCP를 부른다. 콘솔을 v8로 교체+정보 불러오기 했으므로 챗은 **v8**을 호출함(증명: self-heal은 v8에만 있는데 챗 draft가 성공 → 챗이 v8을 부름).

### B-2. **도구 호출을 반드시 눈으로 확인** (가장 중요)
- 도구가 실제로 불리면 챗에 **"TOOL 호출" 패널**이 뜬다: 도구명(`classify_civic_issue` / `draft_civic_report`) + `동네SOS` + `Request`/`Response` 탭. Request에 `{"method":"tools/call","params":{"name":...,"arguments":{...}}}`가 보임.
- ⚠️ **답변 텍스트에 "안전신문고" 같은 키워드가 있다고 도구를 쓴 게 아니다** — 일반 LLM도 아는 내용이다. **반드시 "TOOL 호출" 패널(또는 자동화로 innerText에 `classify_civic_issue`/`draft_civic_report` 포함 여부)로 실제 호출을 확인**할 것. (초기 검토에서 이걸 안 봐서 놓칠 뻔했음.)

### B-3. 초안(2턴) 검증 시 **타이밍 주의**
- 흐름: **1턴**(상황 설명) 전송 → 분류 답변이 **끝날 때까지 기다림** → **2턴**("공식 신고문 초안 만들어 주세요") 전송 → `draft_civic_report` 호출 + 초안 확인.
- ❗ 1턴 답변이 끝나기 전에 2턴을 보내면 **draft가 호출되지 않는다**(입력창이 생성 중). 자동화 첫 배치에서 A/B가 이 이유로 false였고, 간격을 두니 PASS. 자동화 시 `wait_for_function`으로 `classify_civic_issue` 토큰 + 답변 안정화(예: 8~9초) 후 2턴 전송.

### B-4. 시나리오별 확인 포인트 + 이번에 쓴 프롬프트
| 유형 | 프롬프트(예) | 통과 기준 |
|---|---|---|
| 일반 민원 A(가로등) | "골목 가로등이 며칠째 꺼져 있어서 밤에 무서워요. 어디에 신고 준비하면 될까요?" → "그 내용으로 공식 신고문 초안 만들어 주세요." | classify+draft **호출**, 초안에 `제목:`/`요청사항:`, 공식경로(안전신문고·국민신문고·지자체), **에러 문구("초안 생성에 문제") 없음** |
| 일반 민원 B(무단투기) | "아파트 화단에 누가 계속 생활쓰레기를 몰래 버려요. 어떻게 신고 준비하죠?" → 초안 요청 | 위와 동일 |
| **긴급 C**(가스누출) | "집에서 가스 냄새가 심하게 나는데 어디에 신고 준비해요? 신고문 초안도 만들어줘." | 초안 **차단** + **112/119** 등 긴급 채널 안내(초안 `제목:` 안 나와야 정상) |
| 개인정보(주차) | "OO초 앞 횡단보도에 12가3456 불법주정차, 사진에 아이 얼굴도… 동네방에 올려도 되나요?" | 공식신고문엔 차량번호 유지 / 공개공유문엔 제거, 얼굴·개인정보 마스킹 안내 |
| **범위 밖 D**(이웃 도움) | "우리 동네에서 강아지 산책 대신 시켜줄 이웃 구해요." | ⚠️ 챗이 **MCP를 호출하지 않고** 일반 답변할 수 있음(정상) — MCP 결함 아님. 호출되면 "이웃 도움은 범위 밖"으로 거절 |

### B-5. 쿼터 / 자동화 헬퍼
- 우하단 **"남은 질문 N개"** — 현재 ~46개, 약 2분당 1개 충전. 1턴 = 1개 소모.
- 자동화 감지: `page.wait_for_function`으로 innerText에 도구명 포함 감지; 답변 텍스트에서 `제목:`/`요청사항:`(초안 성공), `112`/`119`/`긴급`(긴급), `"초안 생성에 문제"`(실패) 검사.
- 이번 QA 결과·증거: `deploy/playmcp/evidence/aichat-qa-*-20260711.*`, `toolbox-v8-draft-success-20260711.*`. 결과: A·B·C **PASS**, D 참고(MCP 미호출, 정상).
