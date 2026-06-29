# StockAI Pro Chat Lane Smoke

- status: `complete`
- profile: `goldpure369`
- selected_model_label: `Pro`
- conversation_url: https://chatgpt.com/c/6a41e5ec-65d4-83ee-bce2-00a8057a357f
- elapsed_seconds: `277.714`
- response_char_count: `10053`
- extraction_mode: `visible_chat_body`
- evidence_status: `context_only`
- no_trade: `True`
- error: ``

## Prompt

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

## Response

1. Verdict: FAIL

현재 캡처된 답변은 리뷰 준비 상태로는 FAIL입니다.
이유는 세 가지가 큽니다.

첫째, 최종 답변에 현재 상황은 "..."로 분류되었습니다가 그대로 노출됩니다. 사용자는 분류명을 알고 싶은 것이 아니라 어디에, 어떤 문구로, 무엇을 가리고, 어떤 순서로 신고할지를 알고 싶어 합니다.

둘째, 해당 지자체 생활민원 창구에 신고하세요는 검색 결과보다 낫지 않습니다. 최소한 안전신문고 → 국민신문고 → 지역/구청 공식 생활민원 페이지 직접 선택이라는 공식 경로 위계가 있어야 합니다. 안전신문고는 생활 속 안전 위험·불편 신고, 불법 주정차·교통 위반·생활불편 신고의 1차 공식 프레임으로 제시할 수 있습니다. 근거: mois_safetyreport_domains / https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do

셋째, 개인정보 경고는 있지만 공식 신고문과 공개 동네방 글을 분리하지 못했습니다. 차량번호, 아이 얼굴, 정확한 주소·호수, 전화번호는 공개 공유문에서 빼고, 필요한 경우 공식 신고용으로만 다루도록 답변 구조가 바뀌어야 합니다. 차량번호는 단독으로 항상 개인을 식별하지는 않더라도 다른 정보와 결합되면 개인정보가 될 수 있으므로 공개 공유문에서는 비식별 처리하는 편이 안전합니다. 근거: pipc_vehicle_plate_personal_info / https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS292&mCode=I040010000&nttId=10666
, privacy_act_article_15_basis / https://www.law.go.kr/법령/개인정보보호법/제15조

2. Top 5 concrete fixes, ordered by impact
1) 최종 답변에서 “X로 분류되었습니다”를 제거

결론: 사용자 최종 답변에는 현재 상황은 "안전 위협 주정차"로 분류되었습니다 같은 문장을 넣지 말아야 합니다.

분류명은 내부 라우팅과 테스트에는 유용하지만, 사용자 입장에서는 낮은 가치의 시스템 설명입니다. 특히 공원 시설물 파손처럼 실제 요청이 “깨진 유리조각 치워달라는 구청 신고문”인 경우, 분류명은 답변을 더 관료적으로 만들 뿐입니다.

대체 문장:

아래 문구를 그대로 복사해 신고할 수 있습니다.

또는

이 사안은 안전 위험 신고로 처리하면 됩니다. 먼저 안전신문고나 구청 생활민원 창구를 이용하세요.

여기서도 “분류되었습니다”가 아니라 사용자 행동 중심으로 말해야 합니다.

2) 공식 신고 경로를 항상 위계화

현재 답변의 안전신문고 등 공식 안전·생활불편 접수 채널, 해당 지자체 생활민원 창구는 너무 흐립니다.

권장 라우팅:

안전신문고: 안전 위험, 불법 주정차, 차량·교통 위반, 생활불편 신고의 기본 1차 경로
근거: mois_safetyreport_domains / https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do

국민신문고: 어느 기관에 넣어야 할지 애매하거나 안전신문고 경로가 맞는지 불확실한 경우의 일반 민원 fallback
국민신문고 민원은 행정기관에 대한 요청이고, 적정 기관이 아니면 소관 기관으로 이송될 수 있다는 맥락을 짧게 안내할 수 있습니다. 근거: epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

지역/구청 공식 생활민원 페이지: 사용자가 지역을 제공한 경우에만 해당 지역 공식 페이지 선택을 안내. 지역이 없으면 구체 URL을 만들지 말고,

지역/구청 공식 생활민원 페이지를 사용자가 직접 선택
이라고 안내합니다. 지방자치단체도 민원 처리의 관련 행정기관이 될 수 있다는 맥락은 국민신문고 소스카드로 뒷받침됩니다. 근거: epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

3) 신고문을 “복사 가능한 본문”으로 먼저 제공

현재 답변은 준비 항목을 나열하지만, 사용자가 바로 붙여넣을 신고문이 부족합니다. 특히 Case 2 사용자는 “구청에 신고할 문구를 바로 쓸 수 있게” 요청했습니다.

답변 상단에 바로 이 형식이 나와야 합니다.

신고 제목
공원 벤치 옆 깨진 유리조각 제거 요청

신고 내용
동네 공원 벤치 옆에 깨진 유리조각이 흩어져 있습니다. 아이들이 지나다니는 구역이라 베임 사고 위험이 있어 빠른 수거와 현장 확인을 요청드립니다. 사진 1장을 첨부합니다.

위치
동네 공원 벤치 옆

요청사항
깨진 유리조각 수거 및 주변 안전 확인 요청

국민신문고 fallback 문맥에서는 사실관계, 요청사항, 관련 기관·지역 정보를 넣는 것이 적절합니다. 근거: epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

4) 공식 신고용과 공개 공유용을 분리

현재 답변은 “공개 금지”와 “공유 문구”를 넣긴 하지만 구조가 약합니다. DongneSOS는 매번 다음 두 칸을 분리해야 합니다.

공식 신고용
차량번호, 촬영 위치, 시간, 위험 상황, 요청 조치 등 필요한 사실관계를 포함할 수 있음. 단, 개인정보는 목적에 필요한 범위로 최소화.

동네방 공개 공유용
차량번호, 아이 얼굴, 정확한 주소·호수, 전화번호, 실명, 프로필 식별정보는 제외. “OO초 앞 횡단보도 입구에 불법 주정차가 반복되어 신고 예정입니다. 아이들 통행에 주의해 주세요.” 정도로 제한.

이 구분은 단순 매너가 아니라 제품 안전 요구사항입니다. 개인정보 수집·이용은 법적 근거와 목적 범위가 중요하고, 민원 처리에는 민원 내용 및 특정인의 개인정보에 대한 비밀 보호·목적 외 이용 제한 맥락이 있습니다. 따라서 DongneSOS는 공식 제출용 텍스트와 공개 커뮤니티 글을 섞지 않아야 합니다. 법률 자문처럼 단정하지 말고, “공개 공유문에서는 빼는 편이 안전합니다” 수준으로 안내해야 합니다. 근거: privacy_act_article_15_basis / https://www.law.go.kr/법령/개인정보보호법/제15조
, petition_act_article_7_confidentiality / https://www.law.go.kr/법령/민원처리에관한법률/제7조

5) 불법 주정차는 증거 준비 규칙을 짧게 넣기

Case 1에서는 “계속 서 있다”와 “사진에 아이 얼굴이 나왔다”가 핵심입니다. 답변은 다음을 알려줘야 합니다.

불법 주정차 신고는 채널·지자체별 세부 기준이 다를 수 있지만, 같은 위치나 비슷한 방향에서 시간 간격을 두고 찍은 2장 이상의 사진, 차량·배경·위치·촬영 시간이 확인되는 자료가 요구될 수 있습니다.

이 정도가 검색 결과보다 나은 정보입니다. 불법 주정차 신고에서 같은 또는 유사한 위치·방향의 2장 이상 사진, 시간 간격, 대상 차량·배경·위치·촬영 시간이 증거 맥락이 될 수 있다는 소스카드가 있습니다. 근거: safetyreport_illegal_parking_basic / https://www.chungbuk.go.kr/safe/contents.do?key=4175

3. Recommended final-answer template for civic report cases

아래 템플릿을 draft_civic_report 최종 출력의 기본 구조로 권장합니다.

[한 줄 결론]
아래 문구를 그대로 복사해 신고할 수 있습니다. 공개 동네방 글에는 개인정보를 빼세요.

[1. 먼저 이용할 공식 경로]
- 1순위: 안전신문고 — 안전 위험, 불법 주정차, 차량·교통 위반, 생활불편 신고
  링크: https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do
- 경로가 애매하면: 국민신문고 일반 민원
  링크: https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid
- 지역 민원으로 넣고 싶으면: 지역/구청 공식 생활민원 페이지를 사용자가 직접 선택

[2. 복사해서 붙여넣을 신고문]
제목:
{짧은 제목}

내용:
{위치}에 {위험/불편 상황}이 있습니다. {누가 위험한지/왜 긴급한지}. 현장 확인과 조치를 요청드립니다.

위치:
{사용자가 제공한 일반 위치. 정확한 주소·호수는 공개문에는 제외}

첨부:
{사진 수, 사진에서 가릴 것, 추가 촬영 필요 여부}

요청사항:
{수거/단속/현장 확인/안전 조치 등}

[3. 사진·개인정보 체크]
- 공식 신고용: 필요한 사실관계만 포함하세요.
- 공개 공유용: 차량번호, 아이 얼굴, 정확한 주소·호수, 전화번호, 실명은 빼세요.
- 사진에 얼굴이 보이면 공개 전 모자이크하거나, 공개하지 말고 공식 신고에만 사용하세요.

[4. 동네방 공유문이 필요할 때]
{개인정보 없는 짧은 문장}

이 구조는 행정기관에 제출하는 민원에는 사실관계, 요청사항, 관련 지역·기관 맥락이 필요하다는 국민신문고 소스카드와 맞습니다. 근거: epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

4. Recommended official-link routing rules
Case 1: 초등학교 앞 횡단보도 입구 불법 주정차

1순위: 안전신문고
불법 주정차, 횡단보도, 어린이 통행 위험, 차량·교통 위반 성격이 있으므로 안전신문고를 우선 제시합니다. 안전신문고는 안전 위험, 불법 주정차, 차량·교통 위반, 생활불편 신고의 공식 프레임입니다. 근거: mois_safetyreport_domains / https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do

증거 안내:
같은 위치나 비슷한 방향에서 시간 간격을 두고 찍은 2장 이상의 사진이 필요할 수 있으며, 차량, 배경, 위치, 촬영 시간이 드러나는 자료가 도움이 됩니다. 근거: safetyreport_illegal_parking_basic / https://www.chungbuk.go.kr/safe/contents.do?key=4175

개인정보 안내:
차량번호는 공식 신고용에는 필요할 수 있지만 공개 동네방 글에는 넣지 않는 것이 안전합니다. 아이 얼굴은 공개하지 말고 모자이크하거나 공식 신고에만 사용하도록 안내합니다. 근거: pipc_vehicle_plate_personal_info / https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS292&mCode=I040010000&nttId=10666
, privacy_act_article_15_basis / https://www.law.go.kr/법령/개인정보보호법/제15조

Case 2: 공원 벤치 옆 깨진 유리조각

1순위: 안전신문고 또는 구청 공식 생활민원
생활 속 안전 위험·생활불편 신고이므로 안전신문고를 제시하고, 사용자가 “구청”을 원하면 지역/구청 공식 생활민원 페이지를 직접 선택하도록 안내합니다. 단, 지역이 없으므로 구체적인 구청 URL은 만들지 않습니다. 근거: mois_safetyreport_domains / https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do
, epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

신고문 핵심:
위치, 위험물, 아이들 통행, 수거 요청, 사진 첨부 여부를 포함합니다. 민원에는 사실관계와 요청사항, 관련 지역 맥락을 적는 것이 적절합니다. 근거: epeople_general_petition_intro / https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid

Case 3: 당근 동네생활식 개인 도움 요청

현재 MVP:
민원·안전 신고 보조와 분리해야 합니다. “개인 도움 연결은 지원하지 않지만, 공개하지 말아야 할 정보와 안전한 요청 문구는 도와줄 수 있다”가 적절합니다.

미래 기능:
이웃 매칭, 자동 연락, 당근 스크래핑, 개인 채팅 읽기, 정확한 위치 자동 수집은 권장하지 않습니다. 대신 “도움 요청 문구 생성 + 개인정보 최소 공개 체크리스트”까지만 안전한 확장 범위로 잡는 것이 좋습니다. 정확한 주소·호수와 전화번호는 공개글에 쓰지 말고, 필요 시 선택한 상대에게만 별도로 제공하도록 안내합니다. 개인정보는 목적에 필요한 범위로 최소화해야 한다는 맥락에 부합합니다. 근거: privacy_act_article_15_basis / https://www.law.go.kr/법령/개인정보보호법/제15조

5. Specific do/don’t wording examples
상황	Don’t	Do
분류 결과	현재 상황은 "안전 위협 주정차"로 분류되었습니다.	아래 문구를 그대로 복사해 신고할 수 있습니다.
공식 채널	해당 지자체 생활민원 창구에 신고하세요.	먼저 안전신문고를 확인하세요. 경로가 애매하면 국민신문고 일반 민원으로 넣을 수 있습니다. 지역 민원은 지역/구청 공식 생활민원 페이지를 직접 선택하세요. 근거: mois_safetyreport_domains, epeople_general_petition_intro
불법 주정차 증거	사진을 첨부하세요.	같은 위치나 비슷한 방향에서 시간 간격을 두고 찍은 2장 이상의 사진이 요구될 수 있습니다. 차량, 배경, 위치, 촬영 시간이 보이게 준비하세요. 근거: safetyreport_illegal_parking_basic
차량번호 공개	차량번호를 빼고 공유하세요.	차량번호는 공식 신고용으로만 쓰고, 동네방 공개글에는 넣지 마세요. 근거: pipc_vehicle_plate_personal_info, privacy_act_article_15_basis
아이 얼굴	얼굴을 모자이크하세요.	아이 얼굴이 나온 사진은 동네방에 올리지 마세요. 공개해야 한다면 얼굴을 가리고, 가능하면 공식 신고에만 첨부하세요. 근거: privacy_act_article_15_basis
법적 표현	불법입니다.	법률 자문은 아니지만, 공개 공유문에서는 차량번호·얼굴·정확한 주소 같은 식별 정보를 빼는 편이 안전합니다. 근거: privacy_act_article_15_basis, petition_act_article_7_confidentiality
구청 URL	OO구청 민원 URL은 ... 지역이 없는데 추정	지역이 확인되지 않았으므로 구체 URL은 만들지 말고, 지역/구청 공식 생활민원 페이지를 사용자가 직접 선택하도록 안내하세요. 근거: epeople_general_petition_intro
제출 상태	신고가 접수되었습니다.	이 문구를 복사해 공식 채널에 제출하세요.
6. Neighbor-help boundary recommendation

Case 3의 현재 답변 방향은 대체로 맞지만, 더 명확해야 합니다.

현재 MVP에서 해야 할 것

DongneSOS는 개인 도움 요청을 직접 연결·중개·매칭하지 않는다고 분명히 말해야 합니다. 대신 다음만 지원합니다.

동네SOS는 민원·안전 신고 보조 서비스라서 개인 도움 요청을 대신 게시하거나 사람을 연결하지는 않습니다. 
다만 공개글에 무엇을 쓰고 빼야 하는지, 안전한 요청 문구를 만드는 것은 도와드릴 수 있습니다.

요청 문구 예시:

허리를 다쳐 생수 박스를 현관 앞에서 집 안쪽으로 옮기는 데 도움이 필요합니다.
가능한 시간대는 ○○시 전후이고, 소정의 사례비를 드릴 수 있습니다.
정확한 주소와 연락처는 공개하지 않고, 플랫폼 메시지로 먼저 연락 부탁드립니다.

공개하지 말아야 할 정보:

- 정확한 동·호수
- 전화번호
- 현관 비밀번호
- 혼자 있다는 정보
- 실명, 계좌번호, 상세 생활패턴

주소·전화번호·정확한 주거 정보는 공개글에 쓰지 않고 필요한 범위에서만 공유하도록 설계하는 것이 개인정보 최소화 맥락에 맞습니다. 근거: privacy_act_article_15_basis / https://www.law.go.kr/법령/개인정보보호법/제15조

미래 기능에서 분리해야 할 것

미래의 neighbor-help 기능은 civic report MCP와 별도 모듈이어야 합니다.

허용 가능한 확장:

- 개인 도움 요청 문구 생성
- 공개 정보 최소화 체크리스트
- 위험한 공개 정보 감지
- “정확한 주소는 공개글에 쓰지 마세요” 경고
- “플랫폼 내 메시지로 먼저 대화하세요” 수준의 일반 안전 안내

권장하지 않는 확장:

- 자동 게시
- 당근/동네생활 scraping
- 개인 채팅 읽기
- 자동 매칭
- 정확한 위치 자동 수집
- 전화번호·상세주소 선입력 요구
- 사례비 결제·분쟁 중재를 하는 것처럼 보이는 표현

이 항목들은 제공된 소스카드가 직접 절차를 뒷받침하지는 않습니다. 다만 개인정보 최소화와 목적 제한 관점에서 보수적으로 설계해야 하는 제품 안전 권고입니다. 근거로 사용할 수 있는 범위는 privacy_act_article_15_basis까지입니다.

7. Minimal implementation checklist for Codex
MCP schema/output

 classify_civic_issue의 label은 내부 라우팅용으로만 사용하고, 기본 최종 답변에는 노출하지 않는다.

 최종 답변 생성기에서 현재 상황은 "{label}"로 분류되었습니다 패턴을 금지한다.

 draft_civic_report 출력에 official_report_text, public_share_text, privacy_redactions, official_routes를 분리한다.

 official_routes에는 최소한 안전신문고, 국민신문고, 지역/구청 공식 생활민원 페이지 직접 선택을 위계적으로 넣는다.

 지역이 없을 때 구체 지자체 URL을 생성하지 않는다.

 불법 주정차 유형이면 사진 증거 안내를 조건부로 추가한다: 같은/유사 위치·방향, 시간 간격, 2장 이상 가능성, 차량·배경·위치·촬영 시간. 근거: safetyreport_illegal_parking_basic

 공개 공유문에는 차량번호, 아이 얼굴, 전화번호, 정확한 주소·호수, 실명, 계좌·프로필 식별자를 넣지 않는다.

 공식 신고문에도 불필요한 개인정보를 과잉 포함하지 않는다.

 “신고가 접수되었습니다”, “제출했습니다” 같은 자동 제출 암시 문구를 금지한다.

 법률 문구는 “법률 자문은 아니지만” 또는 “공개 공유문에서는 … 빼는 편이 안전합니다” 수준으로 제한한다.

Regression tests for the three captured cases

Case 1: 초등학교 앞 횡단보도 불법 주정차

Expected:

- “X로 분류되었습니다” 없음
- 안전신문고 링크 있음
- 국민신문고 fallback 있음
- 지역/구청 공식 생활민원 페이지 직접 선택 안내 있음
- 차량번호는 공식 신고용, 공개글에서는 제외
- 아이 얼굴 공개 금지/모자이크 안내
- 불법 주정차 사진 증거 안내 있음
- 복사 가능한 신고문 있음
- 개인정보 없는 동네방 공유문 있음

Case 2: 공원 깨진 유리조각

Expected:

- “공원 시설물 파손으로 분류” 없음
- 바로 복사 가능한 구청 신고문이 먼저 나옴
- 안전신문고 또는 지역/구청 공식 생활민원 경로 제시
- 지역이 없으므로 특정 구청 URL 생성 없음
- 사진 1장 첨부 문구 있음
- 아이 얼굴 등 공개 개인정보 주의는 짧게만

Case 3: 개인 도움 요청

Expected:

- 민원/안전 신고 기능과 개인 도움 요청을 분리
- 직접 매칭·자동 게시·연락 대행을 하지 않는다고 명시
- 공개 요청 문구 예시 제공
- 정확한 주소, 전화번호, 현관 비밀번호, 혼자 있다는 정보 공개 금지
- 미래 기능은 “문구 생성/개인정보 체크리스트”까지로 제한

최소 수정만 해도 DongneSOS 답변은 “분류 결과 + 일반 조언”에서 “공식 경로 + 복사 가능한 신고문 + 공개 공유문 분리 + 개인정보 최소화”로 바뀝니다. 이 방향이면 일반 검색보다 분명히 유용해집니다.
