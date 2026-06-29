Role: You are a strict product and civic-service UX reviewer for a Korean PlayMCP MCP called DongneSOS.

Target surface: This prompt will be submitted through an approved authenticated normal ChatGPT Pro conversation. The only product being reviewed is DongneSOS PlayMCP.

# Goal
Review the captured real PlayMCP toolbox answers and propose concrete improvements that make the service more useful than a generic search result.

# Success Criteria
- Identify user-facing text that should be removed, especially low-value classifier wording.
- Decide whether "X로 분류되었습니다" should appear in the final user answer.
- Recommend a better answer structure for civic issue cases.
- Recommend what legal/administrative context should be included briefly without pretending to give legal advice.
- Recommend how official links should appear: Safety e-Report, 국민신문고, and local-government fallback when region is missing.
- Separate current MVP fixes from future neighbor-help feature design.

# Context And Inputs
Project: DongneSOS PlayMCP.

Current observed PlayMCP toolbox answers are in:
`docs/playmcp-toolbox-answer-transcript-20260629.md`

The captured transcript is embedded below. It has been redacted before external submission. Base claims about current answers only on this transcript. If the embedded transcript is insufficient, state exactly what is missing and do not invent unseen PlayMCP behavior.

Key captured failures:
1. The answer says `현재 상황은 "..."로 분류되었습니다`, which feels unnecessary to the user.
2. The answer says only `해당 지자체 생활민원 창구에 신고하세요`, which is too generic.
3. The answer does not give direct official links or clear route hierarchy.
4. It gives privacy warnings but lacks short professional context: official report body vs public community post are different lanes.

Relevant official source context available to this review is limited to the summaries and source-card list embedded below:
- 행정안전부 안전신문고 page says Safety e-Report receives everyday safety hazards and inconvenience reports and includes illegal parking categories such as crosswalk, school zone, sidewalk, bus stop, fire hydrant. It also points users to the Safety e-Report portal/app.
- 국민신문고 민원소개 says civil petitions are requests to administrative agencies; if the selected agency is not proper, petitions can be transferred to the proper agency; local governments and delegated bodies can be relevant administrative institutions.
- Source-card details allowed for citation:
  - `mois_safetyreport_domains`: Safety e-Report is the primary official domain frame for safety hazards, illegal parking, vehicle/traffic violations, and life-inconvenience reports. URL: https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do
  - `safetyreport_illegal_parking_basic`: Illegal-parking reports can require two or more photos from the same or similar position/direction with enough time gap; target vehicle, background, location, and shooting time are evidence context. URL: https://www.chungbuk.go.kr/safe/contents.do?key=4175
  - `epeople_general_petition_intro`: 국민신문고 is a fallback civil-petition frame when Safety e-Report routing is uncertain; petitions need factual background, requested action, and related agency/local context when known. URL: https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid
  - `pipc_vehicle_plate_personal_info`: Vehicle registration number may not always identify a person by itself, but can become personal information when combined with other information; DongneSOS should treat target plate as official-only and redact it from public sharing. URL: https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS292&mCode=I040010000&nttId=10666
  - `privacy_act_article_15_basis`: Personal information collection/use depends on legal basis and purpose; DongneSOS should minimize data in generated text and separate official-only content from public copy. URL: https://www.law.go.kr/법령/개인정보보호법/제15조
  - `petition_act_article_7_confidentiality`: 민원 handling has confidentiality and purpose-limitation duties for petition contents and personal information of petitioners or specific persons; DongneSOS should not conflate official submission content with public community posting. URL: https://www.law.go.kr/법령/민원처리에관한법률/제7조

# Captured Transcript

## Case 1: Illegal Parking With Public-Sharing Privacy Risk

User:
OO초 앞 횡단보도 입구에 [차량번호] 차량이 불법주정차로 계속 서 있어요. 사진엔 아이들 얼굴도 같이 나왔고, 동네방에 올려도 되는지 모르겠어요. 어디에 어떻게 신고 준비하면 좋을까요?

Tool calls:
- `classify_civic_issue`: success
- `draft_civic_report`: success

Final answer:
현재 상황은 "안전 위협 주정차"로 분류되었습니다. 다음과 같은 준비를 하시면 됩니다:

신고 준비
- 일반 위치: OO초 앞 횡단보도 입구
- 상황 설명: OO초 앞 횡단보도 입구에 [차량번호] 차량이 불법주정차로 계속 서 있습니다.
- 사진 주의사항: 사진에 아이들 얼굴이 포함되어 있으므로, 얼굴이 나오지 않도록 편집하거나 모자이크 처리하세요.

공식 신고 채널
- 안전신문고: 안전신문고 등 공식 안전·생활불편 접수 채널을 통해 신고하세요.
- 지자체 창구: 해당 지자체의 생활민원 창구를 이용할 수 있습니다.

주의사항
- 공개 금지: 차량번호 원문과 아이들 얼굴은 공개하지 마세요.
- 공유 문구: 동네방에 공유할 때는 차량번호를 빼고 상황만 설명하세요.

이 정보들을 바탕으로 안전신문고에 신고를 준비하시면 됩니다.

## Case 2: Park Broken Glass Report Draft

User:
동네 공원 벤치 옆에 깨진 유리조각이 흩어져 있고 아이들이 지나다녀요. 사진 한 장은 있어요. 구청에 신고할 문구를 바로 쓸 수 있게 정리해줘.

Tool calls:
- `classify_civic_issue`: success
- `draft_civic_report`: success

Final answer:
현재 상황은 "공원 시설물 파손"으로 분류되었습니다. 다음과 같은 준비를 하시면 됩니다:

신고 준비
- 일반 위치: 동네 공원 벤치 옆
- 상황 설명: 동네 공원 벤치 옆에 깨진 유리조각이 흩어져 있어 아이들이 지나다니며 위험합니다.
- 사진 주의사항: 사진에 어린이 얼굴이 나오지 않도록 주의하세요.

공식 신고 채널
- 지자체 담당 부서: 해당 지자체의 담당 부서나 생활민원 창구에 신고하세요.

주의사항
- 공개 금지: 어린이 얼굴은 공개하지 마세요.
- 공유 문구: 동네방에 공유할 때는 위험 상황만 설명하세요.

이 정보를 바탕으로 구청에 신고를 준비하시면 됩니다.

## Case 3: Danggeun-Style Personal Neighbor Help Boundary

User:
당근 동네생활처럼 허리를 다쳐서 생수 박스를 현관에서 집 안으로 옮겨줄 사람을 찾고 싶어요. 사례비는 조금 드릴 수 있는데 주소나 전화번호를 어디까지 공개해야 안전할까요? 동네SOS가 이런 개인 도움 요청도 도와줄 수 있어요?

Tool calls:
- No civic tool call needed in final observed answer.

Final answer:
동네SOS는 개인 도움 요청을 직접 지원하지 않습니다. 그러나 안전하게 요청할 수 있는 방법을 안내해 드릴 수 있습니다.

안전한 정보 공개 방법
1. 주소: 구체적인 주소 대신 동네나 아파트 이름 정도로만 공개하세요.
2. 전화번호: 처음에는 공개하지 말고, 메시지로 연락이 오면 신뢰할 수 있는 사람에게만 개인적으로 공유하세요.
3. 개인 정보: 이름, 구체적인 주소, 전화번호 등은 처음부터 공개하지 않는 것이 좋습니다.

요청 방법
- 사례비: 사례비를 명시하면 도움이 될 수 있습니다.
- 요청 내용: 구체적으로 어떤 도움이 필요한지 설명하세요.
- 연락 방법: 플랫폼 내 메시지 기능을 통해 연락을 주고받도록 안내하세요.

이러한 방법을 통해 안전하게 도움을 요청할 수 있습니다.

# Constraints
- Output in Korean.
- Do not ask for a new idea; focus on improving this product.
- Do not recommend automatic submission, scraping Danggeun, reading private chats, or collecting precise location automatically.
- Do not give legal advice. Give product-safe, source-backed legal/administrative context.
- Assume Codex will implement improvements in the MCP schema/output and tests after your review.

# Tools And Evidence
- For every legal, administrative, procedural, privacy, or official-channel recommendation, cite the relevant source-card ID and/or official URL.
- If no listed source supports a claim, mark it as unsupported and do not recommend it.
- For local-government fallback, do not invent concrete city/district URLs. If no region-specific source-card is provided, recommend only: "지역/구청 공식 생활민원 페이지를 사용자가 직접 선택" plus national fallback channels such as Safety e-Report or 국민신문고.
- Before submitting externally, redact vehicle numbers, phone numbers, exact addresses/unit numbers, account/profile identifiers, cookies/tokens, and any real person-identifying details. Do not include images or private chat contents.
- You do not need to browse. Use only the embedded transcript and listed official source context.

# Quality Criteria
Good recommendations should make the final answer:
- shorter,
- more actionable,
- more legally/procedurally grounded,
- less generic than search,
- safer about public sharing,
- directly linked to official channels,
- and easy for a normal resident to act on within 30 seconds.

# Failure Definitions
Treat these as failures:
- Keeping classifier jargon in the final answer.
- Saying only "지자체에 문의하세요" without link or fallback route.
- Overstating that the MCP filed a report.
- Exposing vehicle number, children's faces, phone/address/unit details in public-share text.
- Giving broad legal claims without official source or clear "not legal advice" boundary.

# Eval And Regression
Evaluate these three cases:
1. School-crosswalk illegal parking with vehicle number and children's faces in the photo.
2. Park broken glass near children, user wants a district-office report phrase.
3. Danggeun-style personal help request about moving water boxes and whether to disclose address/phone.

# Output
Return:
1. Verdict: current answers PASS / PASS_WITH_FIXES / FAIL for review readiness.
2. Top 5 concrete fixes, ordered by impact.
3. Recommended final-answer template for civic report cases, in Korean.
4. Recommended official-link routing rules.
5. Specific do/don't wording examples.
6. Neighbor-help boundary recommendation.
7. Minimal implementation checklist for Codex.

# Stop Rules
If the captured transcript is insufficient, say exactly what is missing. Do not invent unseen PlayMCP behavior.
