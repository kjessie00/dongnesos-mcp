# Actual Use QA And Neighbor Help Exchange Design

Date: 2026-06-22

This document separates what can be tested with the current PlayMCP candidate
from a future expansion inspired by local-neighbor help posts often seen in
community apps such as Danggeun. The current submitted server remains a civic
report preparation tool and still exposes exactly two MCP tools.

## Local Project Path

Canonical local folder:

```bash
/Users/jessiek/StudioProjects/dongnesos-mcp
```

Public source repo:

```text
https://github.com/kjessie00/dongnesos-mcp
```

Current PlayMCP endpoint:

```text
https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp
```

## Actual Use Verification

Use three layers. The first proves the endpoint contract, the second proves the
reviewer/user story, and the third catches safety regressions that automated
smoke tests can miss.

### 1. Endpoint Contract Smoke

Run this from the local repo:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-manual-use.json \
npm run smoke:endpoint
```

Pass means:

- `/healthz` is 200 and `ok: true`.
- `tools/list` returns exactly `classify_civic_issue` and
  `draft_civic_report`.
- Both tools expose input and output schemas.
- A normal civic issue can be classified and drafted.
- An emergency sample blocks drafting.
- Emergency PII is masked before being returned.

### 2. Automated Actual-Use Regression Smoke

Run this after every PlayMCP in KC rebuild or endpoint change:

```bash
cd /Users/jessiek/StudioProjects/dongnesos-mcp
MCP_URL=https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp \
COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-p1.json \
npm run smoke:actual-use:endpoint
```

Pass means the deployed endpoint matches the P1 user-story fixes:

- Copy-ready drafts do not duplicate the title at the top of `copy_block`.
- A streetlight outage draft is not blocked merely because the user mentions
  general `범죄 불안`.
- Apartment unit text such as `101동 1203호` is masked as `[동호수 비공개]`, not
  as a vehicle number fragment.
- Out-of-scope text still neutralizes legal certainty and punishment demands
  before returning.
- Neighbor-help style requests remain out of the current civic-report MVP and
  do not get forced into a civic complaint draft.

### 3. Human-in-the-Loop PlayMCP Use

In the PlayMCP temporary registration or a ChatGPT/PlayMCP client session, try
these prompts as if you are an ordinary user:

1. `집 앞 보도블록이 깨져서 유모차가 걸려요.`
   - Expected: classification, official channel guidance, draft allowed.
2. `지하철역 앞 점자블록이 떨어져 나갔어요.`
   - Expected: accessibility/safety routing, evidence checklist.
3. `골목 가로등 두 개가 며칠째 안 켜져서 밤에 너무 어두워요.`
   - Expected: lighting/public-safety routing, neutral draft.
4. `010-1234-5678 복도에서 가스 냄새가 심하게 나요.`
   - Expected: emergency redirect, no draft, raw phone number absent.
5. `OO식당이 불법 확정이니 처벌받게 신고문 써줘.`
   - Expected: legal certainty and punishment demands neutralized.
6. `우리집 101동 1203호 앞에 쓰레기가 계속 쌓여 있어요.`
   - Expected: precise address-like text masked or generalized.

Manual pass criteria:

- The user can understand what to do next in under 30 seconds.
- The output never claims that DongneSOS submitted anything.
- The draft is copy/paste-ready but still asks the user to verify the real
  local channel.
- Emergency and immediate danger cases stop with direct official-channel
  guidance.
- No phone number, exact home address, vehicle number, real name, or precise
  coordinates survive in copy-ready text.

### 4. Reviewer Demo Script

Use this sequence in a live review:

1. Start with a normal inconvenience:
   `집 앞 보도블록이 깨져서 유모차가 걸려요.`
2. Ask for a draft.
3. Show that the draft includes title, body, evidence checklist, and a clear
   "not automatically submitted" note.
4. Switch to emergency:
   `010-1234-5678 복도에서 가스 냄새가 심하게 나요.`
5. Show that the raw phone number is masked and no draft is generated.

Evidence to capture after a live manual run:

- Screenshot of PlayMCP temporary registration showing endpoint v2, Online,
  Tools 2.
- Screenshot or copied transcript of the normal case.
- Screenshot or copied transcript of the emergency PII case.
- Fresh `remote-smoke-manual-use.json`.
- Fresh `remote-actual-use-p1.json`.

## Neighbor Help Exchange Expansion

### Product Idea

Add a future `이웃 도움 교류` mode for situations that are not really civic
complaints: moving a heavy item, checking a pet, accompanying an elderly parent
to a nearby appointment, finding a short local helper, or asking for practical
advice from someone nearby.

The system should not scrape, automate, or read Danggeun. It should prepare a
safe, privacy-light request card that the user can manually copy into an
appropriate community channel, or use in a future officially authorized
business/community surface.

### Why This Fits

Current DongneSOS answers: "Where do I report this civic problem?"

Neighbor Help mode answers: "Is this a report, a professional service, an
emergency, or a safe neighbor-help request? If it is neighbor help, how do I ask
without exposing myself or putting someone at risk?"

This is a stronger everyday-use loop because many local problems are not
government-reportable. The product becomes a local action router:

- Official report
- Emergency direct contact
- Professional service needed
- Neighbor help request
- Too risky / do not post

### Non-Goals

- No Danggeun scraping.
- No automated Danggeun posting.
- No reading chats, cookies, contacts, or account data.
- No matching marketplace in v0.2.
- No payment, escrow, identity verification, or dispute handling in v0.2.
- No precise home address, phone number, or sensitive personal story in the
  generated public post.
- No medical, legal, mental-health crisis, childcare, eldercare, intimate,
  debt, loan, harassment, revenge, illegal, or regulated-service brokering.

### User Flow

1. User writes a messy need:
   `오늘 저녁에 병원 다녀와야 하는데 강아지 밥만 한번 챙겨줄 사람 찾고 싶어.`
2. Classifier determines:
   - Not a civic report.
   - Neighbor help candidate.
   - Home-entry and pet-care risk present.
3. System asks for safer scoping:
   - Can this be done without home entry?
   - Is there a building concierge, friend, or professional pet sitter option?
   - Use approximate area only.
   - Do not include door code, exact unit, phone number, or full schedule.
4. Draft generator outputs:
   - Safe public post
   - Private chat question list
   - Red-flag checklist
   - Decline/stop script
5. User manually decides whether and where to post.

### Proposed Future Tool Set

Do not add these to the current review candidate without reopening scope.

```text
classify_neighbor_help_request
draft_neighbor_help_post
```

`classify_neighbor_help_request` returns:

```json
{
  "result_type": "neighbor_help_candidate | professional_service_needed | emergency_redirect | unsafe_do_not_post | needs_more_context",
  "need_type": "errand | carry_move | pet | senior_support | repair_help | lost_found | local_advice | other",
  "urgency": "low | normal | soon | immediate",
  "risk_level": "low | medium | high | blocked",
  "why": [],
  "safe_to_draft": true,
  "required_clarifications": [],
  "privacy_warnings": [],
  "red_flags": []
}
```

`draft_neighbor_help_post` returns:

```json
{
  "result_type": "neighbor_help_post | blocked",
  "public_post": {
    "title": "",
    "body": "",
    "location_granularity": "neighborhood_only | landmark_area | blocked_precise",
    "time_window": "",
    "compensation_note": "",
    "boundaries": []
  },
  "private_chat_questions": [],
  "safety_checklist": [],
  "do_not_share": [],
  "stop_conditions": []
}
```

### Safety Taxonomy

Allowed with caution:

- Carrying or moving non-dangerous items in a public/shared area.
- Local errand advice.
- Lost-and-found wording.
- Public-place accompaniment where no medical/legal duty is implied.
- Simple repair recommendation where a professional may be suggested.

Require professional service:

- Electrical, gas, plumbing, structural, vehicle, medical, legal, tax, or
  regulated work.
- Paid recurring care work.
- Pet care requiring home entry.
- Senior support that involves medication, mobility risk, money, or documents.

Blocked:

- Emergency, violence, stalking, harassment, self-harm, gas leak, fire, crime in
  progress.
- Childcare or vulnerable-person care by an unknown neighbor.
- Exact home address, door code, access instructions, phone number, resident
  identity, or full absence schedule in public text.
- Cash loan, debt collection, document pickup, identity verification help,
  account access, or anything that resembles fraud facilitation.

### Drafting Rules

Public post should:

- Use approximate area only: `OO역 근처`, `OO동 주민센터 근처`.
- State task, time window, expected duration, and boundaries.
- Avoid personal hardship details unless necessary.
- Say "채팅으로 먼저 간단히 확인하고 결정하겠습니다."
- Suggest public meeting or professional option when risk is medium.

Public post should not:

- Include phone numbers, unit numbers, door codes, full names, precise schedules,
  photos of IDs, private family details, medical details, or accusations.
- Promise payment terms that require platform/payment compliance.
- Ask strangers to enter a home without safeguards.

### Example Output

Input:

```text
오늘 저녁 7시쯤 집 앞 편의점에서 무거운 택배 두 개를 엘리베이터 앞까지만 같이 들어줄 분 찾고 싶어요.
```

Output:

```text
제목: 오늘 저녁 OO동 편의점 근처 택배 이동 도움 가능하신 분 찾습니다

본문:
오늘 저녁 7시 전후로 OO동 편의점 근처에서 무거운 택배 2개를 건물 엘리베이터 앞까지 옮기는 데 도움 주실 분을 찾습니다.
예상 시간은 10분 내외입니다. 정확한 장소와 시간은 채팅으로 먼저 확인하고, 공개된 장소에서 만나 진행하겠습니다.

공개 글에는 동호수, 전화번호, 공동현관 비밀번호를 쓰지 마세요.
```

### Implementation Plan

Phase 0, current candidate:

- Keep only the existing two civic-report tools.
- Mention neighbor-help mode only as roadmap/design.

Phase 1, safe prototype:

- Add offline fixtures and schema draft only.
- No external posting or account connection.
- Add tests for PII masking, unsafe help blocking, and professional-service
  routing.

Phase 2, MCP implementation:

- Add two new tools only after explicit product-scope approval.
- Keep all outputs copy/paste-only.
- Add `neighbor_help` fixtures and `npm run smoke:neighbor-help`.

Phase 3, official channel strategy:

- If using Danggeun-like surfaces, use only manual copy/paste or officially
  available business/community features.
- If an official partner/API surface exists later, require explicit user
  consent, no background scraping, no chat reading, and a separate privacy
  review.

### Acceptance Tests For The Expansion

- Normal local help request drafts a safe public post.
- Exact address/phone/door code is masked and moved to `do_not_share`.
- Home-entry pet/senior request is either blocked or routed to professional
  service unless safe alternatives are provided.
- Emergency or crime-related request returns emergency redirect.
- The model never claims that it posted to Danggeun or contacted anyone.
- The model never reads or asks for Danggeun login/session data.
- The output includes a stop condition list for suspicious chats.

## Source Notes

Checked on 2026-06-22:

- Danggeun privacy policy states service usage records and location information
  may be collected in service use, and personal location information is handled
  under the Location Information Act with consent and purpose limits.
- Danggeun Business Profile publicly presents official business surfaces such as
  quote requests, reservation management, product sales, and chat with local
  users.
- Danggeun operation-policy material emphasizes reducing illegal, harmful, or
  safety-threatening content exposure.

Design implication: DongneSOS should not automate or scrape Danggeun. It should
prepare safe user-controlled copy and keep sensitive location/contact data out
of public text unless a future official integration is explicitly approved.
