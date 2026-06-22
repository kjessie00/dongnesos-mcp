# Demo Script

## 30-Second Story

길에서 본 불편을 한 줄로 씁니다.

> 집 앞 보도블록이 깨져서 유모차가 걸려요.

동네SOS가 첫 카드에서 `보도블록 파손`, `준비할 것: 사진·일반 위치·관찰 일시`,
`확인 채널: 공식 안전·생활불편 접수 채널 또는 지자체 생활민원`을 보여줍니다.

사용자가 초안을 원하면 바로 복사 가능한 제목과 본문이 나옵니다. 차량번호나
실명은 가리고, `가스 냄새`처럼 긴급한 입력은 초안을 만들지 않고 공식 긴급
채널 직접 연락 안내로 멈춥니다. 동네SOS는 신고를 대신 보내지 않고, 그냥
지나치던 불편을 30초 만에 직접 접수할 준비로 바꿉니다.

## Hero Cases

1. `집 앞 보도블록이 깨져서 유모차가 걸려요.`
2. `지하철역 앞 점자블록이 떨어져 나갔어요.`
3. `골목 가로등 두 개가 며칠째 안 켜져서 밤에 너무 어두워요.`
4. `골목에 종량제 안 쓴 쓰레기가 계속 쌓여 있어요.`
5. `차도에 큰 구멍이 있어서 차가 지나갈 때마다 쿵 해요.`
6. `공유 킥보드가 점자블록 위에 방치되어 보행을 막고 있어요.`
7. `복도에서 가스 냄새가 심하게 나요.`

## Local Reviewer Commands

```bash
npm run check
npm run smoke:http
npm run smoke:dist
```

## Expected Demo Proof

- `classify_civic_issue` normal case returns `result_type=classification`.
- `draft_civic_report` normal case returns `result_type=draft`.
- `classify_civic_issue` emergency case returns `result_type=emergency_redirect`.
- `draft_civic_report` emergency code returns `result_type=blocked_emergency`.
- `tools/list` exposes exactly two tools and both have `inputSchema` plus
  `outputSchema`.
