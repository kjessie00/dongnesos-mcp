# PlayMCP Answer Quality Improvements - 2026-06-29

## Evidence Inputs

- Captured PlayMCP toolbox transcript: `docs/playmcp-toolbox-answer-transcript-20260629.md`
- Pro Chat review prompt: `docs/playmcp-answer-quality-pro-chat-prompt-20260629.md`
- Pro Chat conversation: https://chatgpt.com/c/6a41e5ec-65d4-83ee-bce2-00a8057a357f
- Pro Chat artifact:
  `reports/market-context/pro-chat-queue/2026-06-29-pro-chat-01-dongnesos_playmcp_answer_quality_review_20260629.json`

## Pro Chat Verdict

`FAIL` for review readiness.

Main reasons:

- User-facing answers exposed low-value classifier wording such as
  `현재 상황은 "..."로 분류되었습니다`.
- The answer told users to use a local-government civil-petition window without
  a clear official route hierarchy or direct national fallback links.
- Privacy warnings existed, but official report content and public community
  sharing text were not clearly separated.

## Implemented Fixes

- User-facing tool summaries now lead with action guidance, not classification
  labels.
- `ActionCard` and `DraftOutput` now include:
  - `official_routes`
  - `legal_context`
  - `privacy_redactions` on draft outputs
- Civic report summaries now always expose this route hierarchy:
  1. Safety e-Report / 안전신문고
  2. 국민신문고 일반민원
  3. 지역/구청 공식 생활민원 페이지 직접 선택
- Draft answers now include a copy-ready report block:
  - title
  - body
  - location
  - attachment note
  - requested action
- Illegal-parking vehicle plates can remain in official report text when they
  are the target identifier, but public neighbor-share text must exclude them.
- Privacy guidance now separates official submission from public community
  posting and cites source-card-backed context.
- Neutralization no longer corrupts the legitimate category phrase
  `불법주정차`, while still removing legal assertions such as `불법 확정` and
  `처벌해`.

## Regression Cases Added

- School-crosswalk illegal parking with vehicle number and children's faces in
  the photo.
- Park broken-glass report draft with direct official links.
- Neighbor-help out-of-scope boundary with privacy-safe future design limits.
- Illegal-parking wording preservation while removing legal assertions.

## Verification

- `npm run check` passed:
  - data validation
  - static policy scan
  - 75 unit tests
  - TypeScript build
- `npm run smoke:core` passed.

## Remaining Work

- This is local code verification. The PlayMCP v5 remote endpoint still needs a
  new Git source build before toolbox answers will reflect these improvements.
