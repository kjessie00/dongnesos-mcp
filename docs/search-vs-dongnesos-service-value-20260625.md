# Search vs DongneSOS Service Value

Date: 2026-06-25

## One-Line Positioning

DongneSOS is not a search shortcut. It is a civic-action compiler.

When a user says, "이거 어디에 말해야 하지?", DongneSOS turns a messy local
problem into:

- official report type
- likely channel family
- evidence checklist
- official-only target identifiers
- public-safe neighbor notice
- privacy and accusation risk controls
- copy/paste-ready next action

Search gives pages. DongneSOS gives the next safe action.

## Why Search Feels Hard In This Use Case

A user usually searches while already annoyed, rushed, or anxious. The hard
part is not typing a query. The hard part is making these decisions:

1. Is this reportable, an emergency, a private dispute, or just neighborhood
   information?
2. Which official category is this: safety report, illegal parking, traffic
   violation, life inconvenience, or generic civil petition?
3. What evidence is needed before the user leaves the location?
4. Should the vehicle plate, unit number, business name, or exact location be
   included?
5. What should be removed before sharing with neighbors?
6. How can the user write the report without sounding accusatory or defamatory?
7. What should the user do if the official route is uncertain?

Search can answer pieces of this, but only if the user already knows what to
search for. The user often does not know the official vocabulary:

- `불법 주정차 주민신고제`
- `생활불편 신고`
- `안전신문고`
- `국민신문고 고충민원`
- `옥외광고물`
- `도로시설물 파손`
- `자동차 번호판 가림`

That is the core opening for DongneSOS.

## Search vs DongneSOS

| User Need | Search Experience | DongneSOS Experience |
|---|---|---|
| "이게 신고할 일인가?" | User reads several pages and guesses. | Classifies into emergency, official report, local verification, neighbor-help boundary, or out-of-scope. |
| "어디에 말하지?" | User must know whether to search Safety e-Report, local office, police, or 국민신문고. | Starts from official report domains: `안전신고`, `불법 주정차 신고`, `자동차·교통위반 신고`, `생활 불편 신고`, 국민신문고 fallback. |
| "지금 뭘 찍어야 하지?" | Evidence requirements are scattered across official pages and local guides. | Gives a short evidence checklist before the user leaves the scene. |
| "차량번호/동호수를 넣어도 되나?" | Search rarely explains official-report vs public-sharing distinction. | Separates `official_report` from `public_neighbor_share` and explains what is retained/redacted. |
| "글을 어떻게 써야 안전하지?" | User copies angry wording or generic examples. | Produces neutral, factual text and removes unsupported legal conclusions. |
| "동네방에 공유해도 되나?" | Search does not usually rewrite for public privacy. | Produces a separate public-safe notice or blocks public sharing when risky. |
| "결국 뭘 하면 되나?" | User has to synthesize everything. | Returns a 30-second action card: type, channel, evidence, official draft, public-safe text, cautions. |

## The Convenience Is Not Just Speed

The real convenience is decision compression.

DongneSOS compresses four separate searches into one tool call:

1. **Official type lookup**
   - Which official domain does this resemble?
   - Is this Safety e-Report, illegal parking, vehicle/traffic violation, life
     inconvenience, or 국민신문고-style civil petition?

2. **Evidence readiness**
   - What must be captured now?
   - What is missing?
   - What should not be photographed or publicly exposed?

3. **Privacy lane handling**
   - What belongs in official-only report text?
   - What must disappear from public sharing?
   - What should be kept only as a private user note?

4. **Actionable drafting**
   - Title
   - Body
   - Checklist
   - Public-safe neighbor notice
   - Warnings and uncertain-route notes

This is why it can be more useful than search even when all source information
is public.

## Search Substitution Strategy

DongneSOS should still be search-backed. The difference is that the service
does the search work ahead of time, keeps the official evidence structured, and
answers from a compact source-backed action model instead of making the user
read search results.

The target experience is:

```text
user's messy local problem
-> fast match against official source cards
-> concise action card with source-backed assumptions
-> official/public/privacy-safe drafts
```

### Fast And Accurate Beats Live Broad Search

Do not run a broad live web search for every user question by default. It is
too slow, noisy, and hard to make deterministic inside a review-grade MCP tool.

Instead, use three evidence layers:

1. **Bundled official source cards**
   - Curated from official sources such as Safety e-Report, 국민신문고, and
     local-government reporting guides.
   - Stored with `source_url`, `last_verified`, `official_domain`,
     `evidence_requirements`, `privacy_notes`, and `routing_limitations`.
   - Fast enough for normal MCP calls.
   - Initial seed corpus:
     `data/source_cards.json`.

2. **Rule-backed matching**
   - User input maps to an official domain and internal privacy profile.
   - The answer cites the source card basis without forcing the user to read
     the whole page.

3. **Fresh verification path**
   - When a rule is likely local, contested, or stale, output
     `needs_official_verification` instead of pretending.
   - A future external-search mode can refresh source cards, but that is a
     maintenance/research lane, not the default user-facing response path.

This gives the user the benefit of search without the cost of search.

### Source Card Shape

Each official rule should become a small structured card:

```json
{
  "source_id": "safetyreport_illegal_parking_basic",
  "source_name": "안전신문고 불법 주정차 신고 안내",
  "source_url": "https://www.chungbuk.go.kr/safe/contents.do?key=4175",
  "last_verified": "2026-06-24",
  "official_domain": "불법 주정차 신고",
  "applies_when": ["횡단보도", "소화전", "버스정류소", "어린이보호구역", "인도"],
  "evidence_requirements": [
    "같은 위치와 방향에서 촬영한 사진 2장 이상",
    "사진 간격 1분 이상",
    "차량번호, 위치, 촬영시각 식별"
  ],
  "privacy_notes": [
    "차량번호는 공식 신고 대상 특정에 필요할 수 있음",
    "공개 공유문에는 차량번호와 무관한 얼굴을 제거"
  ],
  "limitations": [
    "세부 운영 기준은 지자체와 신고 항목별로 달라질 수 있음"
  ]
}
```

The user should see only the useful output:

```text
공식 신고에는 차량번호/위치/촬영시각이 필요할 수 있습니다. 동네 공유글에는 차량번호와 아이 얼굴을 넣지 마세요.
```

The source card remains available as evidence for reviewers and debugging.

The first local corpus contains official and local-government cards for:

- 행정안전부 Safety e-Report official domains
- Safety e-Report app evidence flow
- illegal-parking evidence requirements
- Seoul traffic-law citizen reports
- Haeundae and Changwon local illegal-parking guide examples
- 국민신문고 general petition and ACRC grievance-petition fallback
- PIPC vehicle-registration-number privacy interpretation
- 개인정보 보호법 Article 15
- 민원 처리에 관한 법률 Article 7
- 국민신문고/권익위 privacy notices

### Response-Time Target

For normal user calls:

- No live web search.
- Use bundled source cards and deterministic rules.
- Target answer time: sub-second to a few seconds, depending on client LLM
  latency.
- If the answer depends on unknown local policy, return a short verification
  note instead of searching broadly.

For maintenance/research calls:

- Periodically refresh official source cards.
- Re-check source URLs and `last_verified`.
- Add new local-government guide cards only when they materially improve a
  supported issue type.

### Accuracy Target

Accuracy should not mean "always names the exact agency." In local civic
reporting, that can vary by district.

Accuracy should mean:

- correct official domain when the source supports it
- correct evidence checklist
- correct privacy lane handling
- honest uncertainty when jurisdiction or agency differs locally
- concise next action the user can immediately follow

This is a more defensible service target than broad search-result summarization.

## The Service Promise

User-facing promise:

> 불편한 상황을 한 줄로 적으면, 동네SOS가 "공식 신고용"과 "동네 공유용"을 나눠서
> 안전하게 정리해 줍니다. 어디에 말할지, 무엇을 찍어야 할지, 어떤 정보는 공개하면
> 안 되는지까지 30초 안에 확인할 수 있습니다.

Reviewer-facing promise:

> DongneSOS turns official reporting rules and privacy constraints into a
> structured MCP output that a chat client can use immediately. It does not
> submit reports or scrape private apps. It helps the user act correctly.

## Service Features Derived From The Difference

### 1. "30-Second Action Card"

The first screen/answer should not be a long explanation. It should show:

- issue type
- official domain
- urgency
- next action
- evidence to collect now
- whether a draft is available
- what not to share publicly

Example:

```text
유형: 불법 주정차 신고 후보
공식 도메인: 안전신문고 > 불법 주정차 신고
지금 필요한 것: 같은 위치/방향 사진 2장, 1분 이상 간격, 차량번호/위치/시간 확인
공개 주의: 차량번호와 아이 얼굴은 동네 공유글에 넣지 마세요.
다음 행동: 공식 신고용 문안을 만들 수 있습니다.
```

### 2. "Evidence Before You Leave"

Many civic reports fail because the user leaves without capturing enough proof.
DongneSOS should prioritize this moment.

For each official domain, return:

- required evidence
- optional evidence
- evidence to avoid
- missing evidence
- photo privacy note

This is more valuable than a polished draft because it changes the user's real
success probability.

### 3. "Official vs Public Split"

This is the strongest differentiator.

The same facts produce two outputs:

- `official_report`: usable for official channel copy/paste
- `public_neighbor_share`: safe for neighborhood chat/community sharing

The difference should be visible in demos. Example:

Official:

```text
2026년 6월 25일 08:15경 OO초 정문 앞 횡단보도 접근부에 차량번호 12가3456 차량이 같은 위치에 정차한 상태로 보였습니다.
```

Public:

```text
오늘 오전 OO초 정문 인근 횡단보도 접근부에 차량 정차로 보행 불편이 있어 공식 확인 요청을 준비 중입니다. 차량번호와 사진은 공개하지 않겠습니다.
```

Search does not naturally produce this split.

### 4. "Why This Was Redacted"

Users need trust. The service should not only hide values; it should explain
the lane decision:

```json
{
  "detected_type": "vehicle_plate",
  "role": "target",
  "official_report_action": "retain",
  "public_share_action": "redact",
  "reason": "차량 관련 공식 신고에서는 대상 특정에 필요할 수 있지만 공개 공유에는 불필요합니다."
}
```

This turns privacy from a vague warning into a usable control surface.

### 5. "Neutral Wording Guard"

Search gives the user examples. It does not stop the user from writing:

```text
저 업소는 불법영업 업소입니다. 처벌해 주세요.
```

DongneSOS should rewrite it as:

```text
해당 위치의 영업장 앞 설치물 또는 운영 상태가 관련 기준에 맞는지 확인을 요청드립니다.
```

This is a practical safety benefit, not just tone polishing.

### 6. "Uncertainty Is A Feature"

If the exact agency or rule is uncertain, DongneSOS should not fake precision.
It should say:

```text
세부 접수처는 지역별로 달라 공식 채널에서 확인이 필요합니다.
```

and still produce:

- a neutral inquiry draft
- what to ask
- what evidence to attach
- what not to disclose publicly

This is better than search because the user still gets a usable next step even
when the route is uncertain.

### 7. "Neighbor Help Boundary"

Many local problems are not official-report problems. Search does not make that
boundary clear.

DongneSOS should classify:

- official report
- emergency
- professional service
- personal neighbor help
- unsafe public post
- public notice only

For example, "강아지 밥 줄 사람 찾고 싶어요" is not a civic complaint. The value
is not to force it into a report. The value is to say:

- this is neighbor-help, not official report
- public text must not include door code, exact unit, phone number, full absence
  schedule
- home-entry/pet-care may need professional or trusted-person handling

## Product Detail Roadmap

### MVP Review Candidate

Keep two tools:

- `classify_civic_issue`
- `draft_civic_report`

But describe the value as:

```text
공식 신고 전 판단과 준비를 돕는 도구
```

not:

```text
신고문 생성기
```

### V2 Output Upgrade

Add lane-oriented structured fields while keeping backward compatibility:

- `official_domain`
- `internal_privacy_profile`
- `action_card`
- `evidence_readiness`
- `official_report_draft`
- `public_neighbor_share_draft`
- `private_notes`
- `redaction_map`
- `photo_handling_notes`
- `risk_flags`

### V3 Service Experience

If exposed through PlayMCP/Kakao Tools, the ideal interaction is:

1. User writes one messy sentence.
2. DongneSOS returns a compact action card.
3. User asks "초안 써줘."
4. DongneSOS returns official draft and public-safe share text separately.
5. User manually chooses what to copy into the official channel or community
   surface.

No automatic submission, no private chat reading, no background posting.

## Demo Script For The Differentiator

Prompt:

```text
OO초 앞 횡단보도 입구에 12가3456 차량이 계속 서 있어요. 사진엔 아이들 얼굴도 보이고, 동네방에 올려서 뭐라고 하고 싶어요.
```

Expected DongneSOS answer:

1. Classifies as illegal-parking/safety candidate.
2. Says official report may need vehicle number, time, location, and photo
   sequence.
3. Says public sharing should not include vehicle number or children's faces.
4. Produces official draft with target identifier.
5. Produces public-safe notice without target identifier.
6. Neutralizes "뭐라고 하고 싶어요" into official confirmation request.

This is the cleanest proof that DongneSOS is not search. Search can find the
rules; DongneSOS applies the rules to the user's messy facts.

## Implementation Implication

The backend should not optimize only for classification accuracy. It should
optimize for completed action packages:

```text
messy user input
-> official type
-> evidence readiness
-> privacy lane split
-> neutral wording
-> copy-ready action
```

Success should be measured by:

- Did the user know what to do in under 30 seconds?
- Did the user know what evidence to capture before leaving?
- Did the official draft preserve necessary target identifiers?
- Did public copy remove target identifiers and personal details?
- Did the output avoid legal/punitive certainty?
- Did the system say "verify official route" when needed instead of pretending?

That is the service. The draft text is only one part of it.
