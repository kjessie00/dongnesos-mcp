# Official Report Privacy Lane Design

Date: 2026-06-24

This design replaces DongneSOS's over-simple "mask all identifying information
before drafting" policy with a more practical lane-based policy:

- `official_report`: keep the minimum target identifiers needed for official
  processing.
- `public_neighbor_share`: redact or generalize target identifiers and all
  personal details.
- `private_note`: show the user what to verify or avoid, without making it
  look like public copy.

This is product and risk design, not legal advice. Final submission and exact
legal interpretation remain with the user and the official channel.

## Evidence Basis

Checked on 2026-06-24:

- 행정안전부 describes Safety e-Report as a system where anyone can report
  everyday safety risks through the app or portal, after which MOIS assigns the
  competent processing agency:
  <https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do>
- A Safety e-Report app guide says safety/life-inconvenience reports require
  selecting a report type, attaching photo/video, selecting location through
  GPS/map/address, and entering report content. For illegal parking, it says to
  take at least two photos one or more minutes apart from the same location
  with target vehicle/background context:
  <https://www.chungbuk.go.kr/safe/contents.do?key=4175>
- Haeundae-gu's resident illegal-parking guide says evidence must identify the
  violation area, vehicle number, and shooting time:
  <https://www.haeundae.go.kr/index.do?menuCd=DOM_000000105004006000>
- 개인정보보호위원회 says a vehicle registration number is generally not personal
  information by itself, but can become personal information in special
  contexts where it can be easily combined with other information to identify a
  person:
  <https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS292&mCode=I040010000&nttId=10666>
- 개인정보 보호법 제15조 allows collection/use of personal information within the
  collection purpose under listed bases, including legal obligation, public
  agency statutory duties, urgent life/body/property interests, and public
  safety/peace where applicable:
  <https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=011357&lsJoLnkSeq=900078940&print=print>
- 민원 처리에 관한 법률 제7조 requires agencies to prevent leakage of petition
  contents and personal information of petitioners or specific persons included
  in petitions, and to prevent use beyond petition-processing purposes:
  <https://www.law.go.kr/LSW//lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0007&lsiSeq=239293&urlMode=lsScJoRltInfoR>
- 국민신문고's privacy notice says personal data is processed for petition,
  proposal, and report handling by competent agencies and linked systems:
  <https://www.epeople.go.kr/nep/gdnc/PlHndPlc.npaid>
- 국민권익위원회's privacy notice says it collects the minimum necessary personal
  data for public service, petition handling, and official duties, and that
  국민신문고 민원 can include required complainant data and respondent/target data
  for certain petition handling:
  <https://www.acrc.go.kr/menu.es?mid=a10702000000>
- 행정안전부's Safety e-Report page provides the primary source hierarchy for
  report domains: `안전신고`, `불법 주정차 신고`, `자동차·교통위반 신고`, and
  `생활 불편 신고`. Its listed examples include road/facility damage, workplace
  safety, air/water pollution, fire safety, illegal parking zones, traffic
  violations, number-plate/light/tuning violations, illegal ads, abandoned
  bicycles/motorcycles, trash/waste, marine trash, illegal accommodation, and
  energy overuse:
  <https://www.mois.go.kr/frt/sub/a06/b10/safetyReport/screen.do>
- 국민신문고's 민원소개 gives the fallback civil-petition frame outside
  Safety e-Report: administrative inquiry/interpretation, policy or system
  improvement proposal, and grievance/petition for relief from unlawful,
  unfair, passive, or unreasonable administrative action:
  <https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnNtrcnContent.npaid>

DeepSearchTeam Pro Chat review:

- Prompt:
  `/Users/jessiek/StudioProjects/dongnesos-mcp/.agent/review/dongnesos-privacy-reporting-pro-chat-prompt-20260624.md`
- Queue:
  `/Users/jessiek/StudioProjects/dongnesos-mcp/.agent/review/dongnesos-privacy-reporting-pro-chat-queue-20260624.json`
- Run summary:
  `/Users/jessiek/StudioProjects/dongnesos-mcp/.agent/review/dongnesos-privacy-reporting-pro-chat-run-20260624.md`
- Artifact:
  `/Users/jessiek/StudioProjects/dongnesos-mcp/.agent/review/pro-chat-jobs/20260624-pro-chat-01-dongnesos_privacy_reporting_design_review.json`
- Conversation:
  <https://chatgpt.com/c/6a3bafb1-bd98-83ee-ad2d-329255c6d28f>
- Result: complete, `goldpure369`, `selected_model_label: Pro`, 17,969 chars.

## Core Conclusion

The old policy is too blunt:

```text
raw user facts -> mask all PII-looking text -> draft report
```

That protects public text but can destroy official-report usefulness. Illegal
parking is the clearest example: the official report may need readable vehicle
number, precise location, photo time, and evidence context.

The new policy is:

```text
raw user facts
-> detect sensitive atoms
-> classify each atom by role and issue context
-> apply lane-specific policy
-> render official report, public share, private notes, evidence checklist,
   redaction map, and photo guidance separately
```

The product promise becomes stronger:

> DongneSOS does not merely "write a complaint." It separates official
> report-only target identifiers from public community-safe text, then tells the
> user why each sensitive item was retained, redacted, generalized, or blocked.

## Official Type Basis

DongneSOS should divide types, but the first layer should come from official
reporting structures. Do not start from an arbitrary app taxonomy and then map
it backward. Use this hierarchy:

### Layer 0. Emergency Redirect

Not a DongneSOS report draft. Safety e-Report app guidance says urgent fire,
rescue, and emergency medical cases go to `119`, and public-safety/police
cases go to `112`.

Product rule:

- Output no civic-report draft.
- Mask reporter/bystander PII in the assistant-visible response.
- Tell the user to use the direct emergency channel.

### Layer 1. Safety e-Report Domains

Use 행정안전부 Safety e-Report as the primary category frame for the current
DongneSOS MVP:

| Official domain | Official examples | DongneSOS role |
|---|---|---|
| `안전신고` | road/facility damage, construction/workplace safety, illegal river/valley facilities, air pollution, water pollution, fire safety, other safety/environment risks | Primary MVP lane for road, sidewalk, public facility, drainage, fire-safety-adjacent, and environment risk issues |
| `불법 주정차 신고` | hydrant, intersection corner, bus stop, crosswalk, school zone, sidewalk, disabled/fire-lane zones, EV charging zones | Separate vehicle-target lane because target vehicle plate, location, timestamp, and app-captured photos can be required |
| `자동차·교통위반 신고` | traffic violation, motorcycle violation, bus-lane violation, number-plate violations, light/reflector obstruction or damage, illegal tuning/disassembly/manipulation, other auto safety-standard violations | Adjacent lane; do not force into generic road-safety drafts because evidence and responsible agency differ |
| `생활 불편 신고` | illegal ads, abandoned bicycle/motorcycle, trash/waste, marine trash, illegal accommodation, energy overuse and similar everyday inconvenience | Primary MVP lane for waste, illegal ads, abandoned bikes/scooters, and other non-emergency inconvenience issues |

### Layer 2. 국민신문고 Fallback

When a user issue is a civil petition but not clearly covered by Safety
e-Report, use 국민신문고's public 민원 frame:

| 국민신문고 frame | Use in DongneSOS |
|---|---|
| administrative inquiry or request for interpretation/explanation | "어느 기관/절차에 물어봐야 하나요?" style routing questions |
| proposal for policy/system improvement | recurring local inconvenience that may need improvement request rather than incident report |
| grievance/petition for relief from unlawful, unfair, passive, or unreasonable administrative action | user says an agency failed to act or caused administrative burden |

Product rule: if the exact official route is uncertain, do not invent it. Return
`LOCAL_CIVIC_VERIFY` or `needs_official_verification` and produce a neutral
"관할 확인 요청" draft.

### Layer 3. DongneSOS Internal Evidence/Privacy Profiles

This layer is internal and should not be described as an official government
classification. It tells the MCP how to handle evidence and privacy after the
official domain is known.

| Internal profile | Trigger | Privacy/evidence behavior |
|---|---|---|
| `vehicle_target` | illegal parking, traffic violation, vehicle plate violation, abandoned vehicle-like issues | target plate/time/location may be official-only; public share redacts plate |
| `facility_location_target` | sidewalk, pothole, sign, streetlight, manhole, bus stop, park, public toilet | exact location/equipment id can be official-only; public share uses approximate location |
| `waste_environment_target` | dumping, food waste, odor, sewer, water leak, drain flooding, animal carcass | location/photo can be official-only; do not identify alleged dumper without evidence |
| `business_signage_target` | illegal banner, signboard, outdoor ad, sidewalk obstruction by shop object | business/sign may be official-only target; staff faces/phone numbers are removed |
| `sensitive_person_boundary` | welfare-like concern, vulnerable person, health inference, home-entry help, personal neighbor help | usually public-share blocked; official route needs separate verification |
| `public_notice_only` | user wants neighborhood warning or status update | no target identifiers; no accusation; only broad safety notice |

This split avoids a common design error: official report category, legal
responsibility, and privacy sensitivity are not the same thing. A vehicle plate
is a target identifier in an illegal-parking official report, but a public PII
risk in a neighborhood post.

## Policy Principles

### 1. Do Not Delete Before Understanding Role

The same string can require different treatment depending on role:

- Vehicle plate as illegal-parking target: retain in `official_report`, redact
  from `public_neighbor_share`.
- Vehicle plate of unrelated parked vehicle in a sidewalk photo: redact or ask
  user to crop/blur.
- Reporter's phone number: never put in report body; tell user to enter it in
  the official channel's separate contact field if required.
- Apartment unit as exact defect location: may be official-only; public text
  should generalize to "공용복도 일부" or "해당 동 일부 공용공간."
- Door code, password, access instruction: block from every output lane.

### 2. Official Report Text Is Not Public Share Text

`official_report` may include:

- target vehicle plate for vehicle-related reports
- exact location or GPS-level location when needed for agency processing
- time and evidence sequence
- target facility/signboard/business name when that object is the issue

`public_neighbor_share` should include only:

- general issue type
- approximate area
- safety caution
- statement that official verification/reporting is being prepared
- no vehicle number, unit number, face, name, phone, exact coordinate, or
  punitive accusation

### 3. Public Copy Is a Notice, Not a Complaint Duplicate

Bad:

```text
12가3456 차량이 ○○초 앞 횡단보도에 불법주차했습니다. 신고합니다.
```

Better:

```text
오늘 오전 ○○초 정문 인근 횡단보도 접근부에 차량 정차로 보행 불편이 있어 공식 확인 요청을 준비 중입니다. 차량번호와 사진은 공개하지 않겠습니다.
```

### 4. Neutralize Accusation

Keep official-category names when the channel itself uses them, such as
`불법주정차`. But body text should avoid unsupported legal conclusions:

- Replace `범인입니다` with `방치된 상태가 확인됩니다`.
- Replace `불법영업 업소입니다` with `기준 적합 여부 확인을 요청드립니다`.
- Replace `처벌해 주세요` with `점검 및 필요한 조치 여부 확인을 요청드립니다`.

### 5. Photos Need Their Own Lane Policy

Text redaction is insufficient. Official evidence photos may need original
target details, while public sharing should default to no photo unless the user
has cropped/blurred:

- official illegal-parking photo: vehicle number, time, location/background may
  be required.
- public photo: vehicle number, faces, apartment unit, delivery labels, phone
  numbers, schoolchildren, home interiors, and access devices should be removed
  or the image should not be shared.

## Identifier Handling Matrix

| Information | Official Report Lane | Public Neighbor Share Lane | Private Note / Risk |
|---|---|---|---|
| Target vehicle plate | Retain when vehicle is the report target | Redact/generalize to `차량 1대` | Explain official-only use and photo evidence requirement |
| Reporter phone/name/email | Do not place in body | Always remove | Tell user to enter in official form if required |
| Bystander face/name/plate | Remove unless directly necessary | Always remove | Ask user to crop/blur or retake photo |
| Apartment unit/exact home | Retain only when needed for target location | Generalize to public/shared area | Flag `EXACT_HOME_LOCATION` |
| GPS coordinate/precise address | Retain when agency needs location | Generalize to landmark/area | Flag precise-location disclosure |
| Business/signboard name | Retain if business/signboard/facility is the target | Generalize unless public interest outweighs risk | Remove owner/staff personal data |
| Photo timestamp | Retain for evidence | Generalize to `오늘 오전`, `어제 저녁` | Mention when official channel requires exact time |
| Door code/password/access detail | Block from all lanes | Block from all lanes | Flag `SECRET_OR_ACCESS_INFO` |
| Health/vulnerability details | Avoid unless official welfare/safety channel needs it | Block public output | Use neutral safety-check wording |
| Accusation/punishment demand | Neutralize | Neutralize or block | Flag `UNSUPPORTED_ACCUSATION` |

## Proposed MCP Output Schema

`draft_civic_report` should evolve from a single draft into this shape.

```ts
type PrivacyLane = "official_report" | "public_neighbor_share" | "private_note" | "blocked";

type SensitivityType =
  | "target_identifier"
  | "reporter_pii"
  | "bystander_pii"
  | "exact_home_or_unit"
  | "vehicle_plate"
  | "business_name_or_signage"
  | "photo_content"
  | "timestamp"
  | "precise_location"
  | "accusation_or_legal_conclusion"
  | "sensitive_vulnerability"
  | "secret_or_access_info";

type LaneAction =
  | "retain"
  | "redact"
  | "generalize"
  | "move_to_private_note"
  | "block_from_output"
  | "ask_user_to_verify_official_channel";

type CivicDraftPrivacyLaneOutput = {
  schema_version: "dongnesos.v2.privacy_lanes";
  issue_code: string;
  issue_label_ko: string;
  confidence: number;

  official_report_draft: {
    enabled: boolean;
    title: string;
    body: string;
    suggested_channel_label: string;
    retained_sensitive_fields: Array<{
      type: SensitivityType;
      reason: string;
      handling: "official_only";
    }>;
    submission_notes: string[];
    character_count: number;
  };

  public_neighbor_share_draft: {
    enabled: boolean;
    safety_level: "safe" | "caution" | "blocked";
    title: string;
    body: string;
    blocked_reason: string;
    removed_items_summary: string[];
  };

  private_notes: {
    for_user_only: string[];
    not_for_public: string[];
    needs_official_verification: string[];
  };

  evidence_checklist: Array<{
    item: string;
    status: "present" | "missing" | "unclear" | "not_applicable";
    lane: PrivacyLane;
    reason: string;
  }>;

  redaction_map: Array<{
    detected_type: SensitivityType;
    original_hint: string;
    role:
      | "target"
      | "reporter"
      | "bystander"
      | "location"
      | "evidence_context"
      | "unsupported_claim"
      | "secret";
    official_report_action: LaneAction;
    public_share_action: LaneAction;
    private_note_action: LaneAction;
    replacement: string;
    reason: string;
  }>;

  photo_handling_notes: {
    official_report: string[];
    public_share: string[];
    blur_or_crop_targets: string[];
    metadata_warning: string[];
  };

  risk_flags: Array<{
    code:
      | "PUBLIC_PII_RISK"
      | "UNSUPPORTED_ACCUSATION"
      | "EXACT_HOME_LOCATION"
      | "BYSTANDER_EXPOSURE"
      | "PHOTO_PRIVACY_RISK"
      | "OFFICIAL_REQUIREMENT_UNVERIFIED"
      | "EMERGENCY_OR_WELFARE_RISK"
      | "SECRET_OR_ACCESS_INFO";
    severity: "low" | "medium" | "high";
    message: string;
  }>;
};
```

## Implementation Direction

### Replace `maskPii` As A First-Step Draft Input

Current draft flow in [src/core/draft.ts](/Users/jessiek/StudioProjects/dongnesos-mcp/src/core/draft.ts)
calls `maskPii()` on `what`, `where_general`, and `impact` before building the
copy. That should be replaced for v2.

New flow:

```ts
const atoms = detectSensitiveAtoms(input);
const roles = classifySensitiveAtomRoles(atoms, issueCode, input);
const lanePolicy = applyPrivacyLanePolicy(roles, issueCode);
return renderPrivacyLaneDraft(input, lanePolicy);
```

Keep deterministic rules for high-risk fields. Do not let an LLM decide these
alone:

- phone, email, resident-id pattern, card number: remove from all public copy;
  do not place in official body.
- door code, password, access instruction: block from all outputs.
- vehicle plate: official retain only for vehicle-related target issues; public
  redact.
- unit/address: official retain only when needed for location; public
  generalize.
- precise coordinate: official retain only when needed; public generalize.
- unsupported legal conclusion: neutralize or block public output.

### Add Sensitive Atom Model

```ts
type SensitiveAtom = {
  id: string;
  text: string;
  type: SensitivityType;
  start: number;
  end: number;
  role:
    | "target"
    | "reporter"
    | "bystander"
    | "location"
    | "evidence_context"
    | "unsupported_claim"
    | "secret";
  confidence: number;
};
```

Implementation can start with regex plus context windows:

- vehicle plate near `차`, `차량`, `주차`, `정차`, `횡단보도`, `소화전`,
  `버스정류장`: likely target for parking/mobility issue.
- vehicle plate near `사진에`, `옆 차`, `지나가던`: likely bystander.
- unit near `앞`, `복도`, `공용`, `계단`, `쓰레기`: location context.
- unit plus person name, health, accusation, or contact: high-risk identity
  context.

### Keep Backward Compatibility During Review

The current PlayMCP review candidate already exposes a stable v1 schema. If v2
is implemented before final submission, either:

1. Extend existing output with optional v2 fields while preserving current
   `draft`, `share`, and `safety`; or
2. Add `privacy_policy_version: "v2_lanes"` and keep old fields as rendered
   summaries.

Do not break PlayMCP tool schema without rerunning local, remote, and Toolbox
smoke tests.

## Example Outputs

### 1. Illegal Parking

Input:

```text
2026년 6월 24일 08:13, 08:15에 서울 강동구 OO초 정문 앞 횡단보도 입구에 12가3456 흰색 SUV가 계속 서 있었어요. 제 번호는 010-1234-5678입니다. 사진에 아이들 얼굴도 좀 나왔습니다. 당근에 올려서 망신 주고 싶어요.
```

Official report:

```text
제목: OO초 정문 앞 횡단보도 접근부 차량 정차 확인 요청

본문:
2026년 6월 24일 08:13 및 08:15경, 서울 강동구 OO초 정문 앞 횡단보도 접근부에 차량번호 12가3456 흰색 SUV가 같은 위치에 정차한 상태로 보였습니다. 동일 위치와 유사 방향에서 촬영한 사진 2장을 첨부할 예정입니다. 횡단보도 접근부 보행 안전에 영향을 주는지 확인 부탁드립니다.
```

Public share:

```text
오늘 오전 OO초 정문 인근 횡단보도 접근부에 차량 정차로 보행 불편이 있어 공식 확인 요청을 준비 중입니다. 차량번호와 사진은 공개하지 않겠습니다.
```

Policy:

- `12가3456`: official retain, public redact.
- `010-1234-5678`: remove from official body and public share; use official
  contact field only.
- children faces: public image blocked; official photo review needed.
- `망신`: public intent blocked and neutralized.

### 2. Apartment Trash Near Unit

Input:

```text
우리 아파트 103동 1203호 앞 복도에 검은 봉투랑 음식물 쓰레기를 누가 버렸어요. 1203호 김민수 씨가 매번 그러는 것 같아요. 사진에는 현관문 호수랑 택배 송장이 보여요. 단톡방에 올릴 문구도 써줘요.
```

Official report:

```text
제목: 아파트 공용복도 쓰레기 방치 확인 요청

본문:
OO아파트 103동 12층 1203호 인근 공용복도에 검은 봉투와 음식물 쓰레기로 보이는 물품이 방치되어 있어 악취 및 통행 불편이 발생하고 있습니다. 정확한 위치 확인을 위해 현장 사진을 첨부할 예정입니다. 공용공간 관리 및 수거·계도 필요 여부를 확인 부탁드립니다.
```

Public share:

```text
OO아파트 103동 일부 공용복도에 쓰레기 방치로 보이는 문제가 있어 관리 주체 또는 공식 창구에 확인 요청을 준비 중입니다. 특정 세대나 개인을 지목하는 내용은 공유하지 않겠습니다.
```

Policy:

- `103동 1203호`: official-only location, public generalize.
- person name + unit + accusation: remove from official body; block from
  public share.
- delivery label: public photo blocked; official photo should avoid unrelated
  exposed labels where possible.

### 3. Broken Sidewalk

Input:

```text
부산 해운대구 OO로 15 앞 보도블록이 깨져서 어르신이 넘어질 뻔했어요. 좌표는 35.163000, 129.163000이고, 2026년 6월 23일 저녁 7시쯤 봤습니다. 사진엔 옆 가게 간판이 나와요.
```

Official report:

```text
제목: OO로 15 앞 보도블록 파손 점검 요청

본문:
2026년 6월 23일 19시경 부산 해운대구 OO로 15 앞 보도에서 보도블록 파손으로 인한 보행 위험이 확인되었습니다. 현장 위치는 좌표 35.163000, 129.163000 인근이며, 보행자가 걸려 넘어질 위험이 있어 보수 필요 여부 확인을 요청드립니다. 현장 사진을 첨부하겠습니다.
```

Public share:

```text
OO로 15 인근 보도 일부가 파손되어 보행 시 주의가 필요해 보입니다. 공식 점검 요청을 준비 중입니다.
```

Policy:

- coordinate: official retain, public redact/generalize.
- signboard: official photo location context can be acceptable; public crop if
  not necessary.

### 4. Sensitive Neighbor Help / Welfare Boundary

Input:

```text
802호 혼자 사는 박OO 할머니가 계속 문 비밀번호 1234를 알려주면서 약 사다 달라고 해요. 치매 같기도 하고, 전화번호는 010-9999-8888이에요. 동네 게시판에 이름이랑 호수 올려서 누가 관리 좀 하라고 쓰고 싶어요.
```

Official-style safety check draft:

```text
제목: 이웃 주민 안전 확인 필요 여부 검토 요청

본문:
같은 공동주택 내 고령 주민으로 보이는 분이 반복적으로 개인적 도움을 요청하고 있어 안전 확인 또는 복지 지원 연계가 필요한 상황인지 검토를 요청드립니다. 공개된 장소에서 반복적으로 도움 요청이 있었고, 약 구매 등 생활 지원과 관련된 요청이 있었습니다. 정확한 세대와 연락처는 공식 접수 절차에서 필요한 경우에만 별도 입력하겠습니다.
```

Public share:

```text
공개 공유 차단.
```

Policy:

- door code: block from every output.
- unit/name/phone/health inference: public blocked.
- `치매 같다`: neutralize to support/safety check need.
- exact agency route needs additional official verification before product
  claims a specific channel.

### 5. Business / Signboard Complaint

Input:

```text
OO포차가 밤마다 입간판을 인도 한가운데 세워서 유모차가 못 지나가요. 간판에 상호랑 전화번호 02-111-2222가 보이고 알바 얼굴도 사진에 찍혔어요. 불법영업 업소라고 올려줘요.
```

Official report:

```text
제목: 인도 통행 방해 가능 입간판 점검 요청

본문:
OO포차 앞 인도에 입간판이 설치되어 유모차와 보행자의 통행에 불편이 발생하고 있습니다. 현장 사진상 간판 위치와 보행 공간이 확인됩니다. 해당 입간판이 보행 안전 또는 옥외광고물 관련 기준에 맞는지 점검을 요청드립니다.
```

Public share:

```text
상가 인근 인도에 설치물이 있어 유모차와 보행자 통행이 불편한 상황을 공식 점검 요청하려고 합니다. 특정 업소를 비난하거나 직원 얼굴·전화번호가 보이는 사진은 공유하지 않겠습니다.
```

Policy:

- business name: official retain if target, public generalize by default.
- signboard phone/staff face: remove from public and official text body.
- `불법영업`: neutralize to standards/inspection request.

## Acceptance Tests

Add these before implementing v2:

1. Illegal parking retains target vehicle plate in `official_report_draft.body`
   but removes it from `public_neighbor_share_draft.body`.
2. Reporter phone/email/name never appears in official body or public share.
3. Apartment unit can appear in official location text only when used as target
   location, but public text generalizes it.
4. Person name plus unit plus accusation is removed or blocks public output.
5. Precise coordinate can appear in official draft but not public share.
6. Photo notes distinguish official target visibility from public blur/crop.
7. Door code/password never appears in any output lane.
8. Business/signboard name is official-only when it is the target; staff faces
   and phone numbers are never public.
9. Legal certainty or punishment language is neutralized.
10. Output schema always includes `official_report_draft`,
    `public_neighbor_share_draft`, `private_notes`, `evidence_checklist`,
    `redaction_map`, `photo_handling_notes`, and `risk_flags`.

## PlayMCP Differentiation

This creates a stronger contest story than generic complaint generation:

- It solves a real civic workflow conflict: official reports often require
  target identifiers, while public sharing should not expose them.
- It gives the client LLM a structured explanation of what was retained,
  redacted, generalized, or blocked.
- It makes Kakao/PlayMCP demo output visibly different: the same user facts
  produce two different safe artifacts, not one generic paragraph.
- It remains feasible inside a small MCP server without external accounts,
  scraping, automatic reporting, or paid APIs.

## Scope Recommendation

For the immediate PlayMCP candidate:

1. Keep the two-tool MCP surface unless there is enough time to re-smoke a v2
   schema.
2. Implement v2 fields as additive optional output fields if coding before
   submission.
3. Do not add Danggeun integration, automatic posting, official submission, or
   image processing. Add photo guidance only.
4. If there is not enough rebuild time, use this document as the design upgrade
   and include the lane policy in the presentation/demo narrative.

For the next implementation pass:

1. Add `detectSensitiveAtoms`.
2. Add `classifySensitiveAtomRoles`.
3. Add `applyPrivacyLanePolicy`.
4. Add `renderPrivacyLaneDraft`.
5. Preserve old output fields for compatibility.
6. Add the acceptance tests above.
7. Rebuild PlayMCP in KC and rerun local, remote, Toolbox, and actual-output
   smoke tests.
