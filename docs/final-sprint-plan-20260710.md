# 동네SOS 예선 제출 파이널 스프린트 계획 (D-4, 2026-07-10)

마감: 2026-07-14 예선 접수 종료. 심사는 평균 1~2영업일, 최대 7영업일.
7/11(토)~7/12(일)은 심사 지연 리스크가 있으므로 **7/10(금) 중 심사 요청이
사실상 마지노선**이다.

## 현재 상태 요약 (2026-07-10 확인)

- 코드: `main` HEAD `a19acc0` (서버 로직 최신 커밋은 `0c16cb2`).
- 라이브 엔드포인트: v6, v7 둘 다 `/healthz` OK (계정 한도 2/2 소진).
- 심사 대상은 **v7** (`dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io`).
  7/3 기준 v7에서 smoke / actual-use / output-review 게이트 전건 통과,
  annotations 포함.
- PlayMCP 콘솔(`동네SOS`/`dongnesos`, MCP id 62426279747569122): 임시등록
  상태. **콘솔 엔드포인트가 v6인지 v7인지 미확정 → 최우선 확인 필요.**
- 심사 요청·전체공개·예선 폼 제출: 전부 미실행 (오너 액션).

## 시장성/창의성 검토 결론

세부 카피는 `deploy/playmcp/entry-form-copy.md` 참조.

강점 (그대로 밀 것):
1. 문제 정의가 보편적이고 한국 특화 — "이거 어디에 말해?"는 전 국민 pain.
2. 이중 프라이버시 레인(공식 신고문 vs 공개 공유글)은 유사 서비스에 없는
   창의 포인트. 심사 서사의 중심에 둘 것.
3. 소스카드 인용 + 긴급 차단 + 무의존 stateless 설계 → 안정성 기준에 강함.
4. "검색 대체 MCP 반려" 정책 방어 논리 완비(행동 패키지 vs 페이지).

약점/리스크 (대응 방침):
1. 도구 2개는 가이드 권장(3~10) 미만 — **지금 3번째 도구 추가 금지.**
   정책 최소치(1개)는 충족하고, D-4에 스코프 변경은 안정성 증거를 전부
   무효화한다. 심사 노트에 "의도적 최소 도구" 논리로 방어.
2. 데모 임팩트가 텍스트 중심 — 대표 이미지/스타터 메시지 품질로 보완.
   본선 로드맵(Kakao Tools 위젯)을 폼에 명시해 확장성 어필.
3. 콘솔 등록 설명이 제품 서사를 못 담고 있을 가능성 — entry-form-copy의
   설명문으로 교체.

## D-day 실행 계획

### 7/10 (금) — 오늘, 전부 완료 목표

1. [오너] 콘솔 확인: PlayMCP 콘솔에서 `동네SOS` 엔드포인트가 v7인지 확인,
   아니면 v7로 수정 → `정보 불러오기`로 도구 메타데이터 갱신.
   자동화 대안: `deploy/playmcp/webwright/final_script.py --mode browser
   --endpoint https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp
   --server-name dongnesos-mcp-v7 --mcp-name '동네SOS'
   --expected-commit 0c16cb2 --update-console`
2. [로컬] 최신 원격 증거 리프레시 (Jessie 머신에서):
   ```bash
   MCP_URL=https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-final-20260710.json \
   npm run smoke:endpoint
   MCP_URL=https://dongnesos-mcp-v7.playmcp-endpoint.kakaocloud.io/mcp \
   COMMIT_EXPECTED=0c16cb2 \
   EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-final-20260710.json \
   npm run smoke:actual-use:endpoint
   ```
3. [오너] 콘솔 메타데이터 업그레이드: MCP 설명·스타터 메시지를
   `deploy/playmcp/entry-form-copy.md` §1~2로 교체. 대표 이미지가
   저품질이면 600x600 정적 PNG로 교체(움직이는 이미지 금지).
4. [오너] PlayMCP 토스트박스 AI 채팅에서 스타터 메시지 4종 실제 호출 1회씩
   눈으로 확인 (증거 스크린샷 권장).
5. [오너] **`등록 및 심사 요청` 클릭** — 오늘 중 필수.
6. [로컬] 커밋/푸시: PLAYMCP_SUBMISSION.md v7 갱신, entry-form-copy.md,
   본 계획 문서.

### 7/11 (토) ~ 7/13 (월) — 심사 대기 중

- 심사 메일함(`내 정보 관리 > 연결된 이메일`) 하루 2회 확인.
- 보완 요청이 오면 즉시 대응(코드 변경 시 v7 재빌드 대신 커밋 최소화 —
  콘솔 `정보 불러오기` 재실행이 필요한 변경인지 먼저 판단).
- v6 서버는 심사 통과 전까지 삭제하지 말 것(롤백 슬롯).
- 승인이 오면 즉시: 공개 범위를 `나에게만 공개` → **`전체 공개`** 전환.

### 승인 직후 ~ 7/14 (화) 마감 전 — 최종 제출

1. [오너] 전체 공개 상태 확인 (전체 공개가 아니면 공모전 제외됨).
2. [오너] 공모전 페이지 하단 `[Player 예선 참여]` Biz Form 제출 —
   **1회 한정, 폼 답변은 entry-form-copy.md §4 사용.**
3. [로컬] `npm run evidence:submission`으로 최종 증거 스냅샷 기록.

### 컨틴전시

- 7/13(월) 오후까지 심사 결과 없음 → PlayMCP Discord로 심사 상태 문의
  (마감 임박 + 심사 요청 일시 명시).
- 심사 반려 → 반려 사유가 텍스트/메타데이터 수준이면 콘솔 수정 후 즉시
  재요청; 코드 수준이면 최소 패치 → 기존 v7 재빌드 불가 시 v6 삭제 후
  v8 빌드 → 콘솔 엔드포인트 교체 → 재요청.
- 절대 금지: 마감 전 3번째 도구 추가, Kakao API 신규 연동, 미검증
  엔드포인트로의 콘솔 변경.

## 오늘의 단일 크리티컬 패스

콘솔 v7 확인 → 정보 불러오기 → 설명/스타터 교체 → 심사 요청 (금일 중).
나머지는 전부 이 경로에 종속된다.
