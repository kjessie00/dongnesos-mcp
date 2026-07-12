import { channelsData, copyRules, getTaxonomyItem, safetyRules, taxonomyData } from "../data/loadData.js";
import type { DraftInput, DraftOutput, SosError, TaxonomyItem } from "../types.js";
import { detectEmergency, isEmergencyCode } from "./emergency.js";
import { maskPii } from "./pii.js";
import { neutralizeForbiddenClaims } from "./neutralize.js";
import { normalizeText } from "./normalize.js";
import { draftCard } from "./presentationMock.js";
import { buildLegalContext, buildOfficialRoutes, formatLegalContext, formatOfficialRoutes } from "./officialGuidance.js";

const officialVehiclePlatePattern = /\b\d{2,3}\s?[가-힣]\s?\d{4}\b/g;

export function draftCivicReport(input: DraftInput): DraftOutput {
  const errors: SosError[] = [];
  const what = normalizeText(input.facts?.what ?? "");
  const impact = normalizeText(input.facts?.impact ?? "");
  if (what.length < 2) {
    return failure("needs_more_facts", "E_FACTS_TOO_THIN", "무엇이 불편한지 한 줄 설명이 필요합니다.");
  }

  const emergency = detectDraftEmergency(input.issue_code, what, impact);
  if (isEmergencyCode(input.issue_code) || emergency) {
    return blockedEmergency(emergency?.message ?? "긴급 또는 즉시 위험 가능성이 있어 초안 생성을 차단했습니다.");
  }

  if (isPersonalNeighborHelpRequest([input.issue_code, what, input.facts?.where_general, input.facts?.impact, input.facts?.photo_note].join(" "))) {
    return failure(
      "out_of_scope",
      "E_NEIGHBOR_HELP_UNSUPPORTED",
      "개인 간 도움 모집은 현재 동네SOS의 시민 생활불편 신고 준비 범위가 아닙니다. 향후 이웃 도움 연결 기능의 별도 로드맵으로 분리해 다루는 것이 안전합니다."
    );
  }

  const item = resolveDraftTaxonomyItem(input.issue_code, input);
  if (!item) {
    return failure("error", "E_UNKNOWN_ISSUE_CODE", "알 수 없는 생활불편 유형입니다. classify_civic_issue를 먼저 호출해 주세요.");
  }

  const maskedWhat = maskOfficialReportText(what, item);
  const maskedWhere = maskPii(input.facts?.where_general ?? "");
  const maskedImpact = maskPii(impact);
  const maskedPhotoNote = maskOfficialReportText(input.facts?.photo_note ?? "", item);
  const neutralWhat = neutralizeForbiddenClaims(maskedWhat.text);
  const neutralImpact = neutralizeForbiddenClaims(maskedImpact.text);
  const neutralPhotoNote = neutralizeForbiddenClaims(maskedPhotoNote.text);
  const piiDetected = maskedWhat.detected || maskedWhere.detected || maskedImpact.detected || maskedPhotoNote.detected;
  const maskedFields = [...maskedWhat.maskedFields, ...maskedWhere.maskedFields, ...maskedImpact.maskedFields, ...maskedPhotoNote.maskedFields];
  const neutralized = [...neutralWhat.removed, ...neutralImpact.removed];

  if (piiDetected) {
    errors.push({ code: "E_PII_MASKED", severity: "warning", message: "개인정보 또는 식별정보로 보이는 값을 마스킹했습니다." });
  }
  if (neutralized.length) {
    errors.push({ code: "E_FORBIDDEN_ASSERTION_REMOVED", severity: "warning", message: "비방·법적 단정으로 보일 수 있는 표현을 중립화했습니다." });
  }

  const where = maskedWhere.text || copyRules.fallback_where;
  const when = normalizeText(input.facts?.when_observed ?? "") || copyRules.fallback_when;
  const safeImpact = neutralImpact.text || impact || defaultImpact(item);
  const photoNote = neutralPhotoNote.text || "가능하면 현장 사진을 첨부합니다.";
  const placeholders = [
    where === copyRules.fallback_where ? copyRules.fallback_where : null,
    when === copyRules.fallback_when ? copyRules.fallback_when : null
  ].filter((value): value is string => Boolean(value));

  const problem = shortProblem(item, neutralWhat.text);
  const titleWhere = titleLocation(where);
  const title = [`[${item.label_ko}]`, titleWhere, `${problem} 점검 요청`].filter(Boolean).join(" ");
  const body = buildOfficialReportCopy({
    title,
    what: neutralWhat.text,
    where,
    when,
    impact: safeImpact,
    photoNote,
    requestPhrase: item.request_phrase
  });

  const suggested = suggestedChannel(item);
  const officialRoutes = buildOfficialRoutes(item.channel_family);
  const isIllegalParking = item.code === "ILLEGAL_PARKING_SAFETY" || item.code === "SCHOOL_ZONE_SAFETY";
  const legalContext = buildLegalContext({ hasPrivacyRisk: piiDetected || Boolean(input.include_neighbor_share_text), isIllegalParking });
  const privacyRedactions = privacyRedactionsFor(item, piiDetected);
  const evidence = [
    ...item.evidence_required.map((text) => `□ ${text}`),
    ...item.evidence_optional.slice(0, 2).map((text) => `□ 선택: ${text}`),
    "□ 타인 얼굴·차량번호·전화번호·동호수·불필요한 상호 노출 가림"
  ];

  const neighborText =
    input.include_neighbor_share_text === false
      ? ""
      : fillNeighborTemplate(item, where);

  const output: DraftOutput = {
    ok: true,
    result_type: "draft",
    answer_markdown: "",
    draft: {
      title,
      body,
      copy_block: body,
      suggested_channel_label: suggested,
      evidence_checklist: evidence,
      placeholders_to_fill: placeholders
    },
    official_routes: officialRoutes,
    legal_context: legalContext,
    privacy_redactions: privacyRedactions,
    share: {
      neighbor_text: neighborText,
      private_note: "자동 발송되지 않습니다. 사용자가 직접 복사해 필요한 곳에 붙여 넣는 문구입니다."
    },
    safety: {
      pii_detected: piiDetected,
      masked_fields: Array.from(new Set(maskedFields)),
      neutralized_phrases: Array.from(new Set(neutralized)),
      disclaimers: safetyRules.disclaimers,
      photo_privacy_note: safetyRules.photo_privacy_note
    },
    presentation_mock: {
      version: "0.1",
      card_type: "draft_card",
      headline: "",
      badges: [],
      sections: [],
      actions: [],
      footer_notice: ""
    },
    errors
  };
  output.presentation_mock = draftCard(output);
  output.answer_markdown = buildDraftAnswer(output);
  return output;
}

function buildDraftAnswer(output: DraftOutput): string {
  if (output.result_type === "blocked_emergency") {
    return output.errors[0]?.message ?? "긴급 또는 즉시 위험 가능성이 있어 공식 긴급 채널에 직접 연락해야 합니다.";
  }
  if (output.result_type === "out_of_scope") {
    const privacy = output.privacy_redactions.length ? `\n\n공개 글 안전 기준:\n- ${output.privacy_redactions.join("\n- ")}` : "";
    const legal = output.legal_context.length ? `\n\n개인정보 맥락:\n${formatLegalContext(output.legal_context)}` : "";
    return [
      "현재 동네SOS는 공공시설·환경 생활불편의 공식 신고 준비만 지원합니다.",
      "개인 간 도움 교류는 자동 매칭·게시·연락 대행을 하지 않습니다.",
      "공개 글에는 정확한 주소·호수, 전화번호, 현관 비밀번호, 혼자 있다는 정보, 집 내부 사진을 넣지 마세요.",
      "필요하다면 플랫폼 안의 메시지 기능으로만 세부 위치와 시간을 좁히고, 공개 글에는 대략적인 동네와 도움 범위만 남기세요.",
      privacy,
      legal
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (!output.draft) {
    return output.errors[0]?.message ?? "초안을 만들 수 없습니다.";
  }

  const shareText = output.share.neighbor_text
    ? ["", "공개 동네방에 쓸 때:", output.share.neighbor_text, "공개 글에는 차량번호, 아이 얼굴, 정확한 주소·호수, 전화번호를 넣지 마세요."].join("\n")
    : "";
  const privacy = output.privacy_redactions.length ? `\n\n사진·개인정보 체크:\n- ${output.privacy_redactions.join("\n- ")}` : "";
  const legalContext = output.legal_context.length ? `\n\n법적·개인정보 맥락:\n${formatLegalContext(output.legal_context)}` : "";

  return [
    "다음 순서로 준비하면 됩니다.",
    "",
    "1. 공식 접수 경로",
    formatOfficialRoutes(output.official_routes),
    "",
    "2. 바로 복사해서 붙여넣을 신고문",
    "```text",
    output.draft.copy_block,
    "```",
    shareText,
    privacy,
    legalContext,
    "",
    "동네SOS는 신고 준비만 돕고 실제 접수·로그인·전송은 하지 않습니다."
  ]
    .filter(Boolean)
    .join("\n");
}

function fillNeighborTemplate(item: TaxonomyItem, where: string): string {
  return copyRules.neighbor_share_template
    .split("{{where_general}}")
    .join(shareLocation(where))
    .split("{{issue_label}}")
    .join(item.label_ko);
}

function buildOfficialReportCopy(values: {
  title: string;
  what: string;
  where: string;
  when: string;
  impact: string;
  photoNote: string;
  requestPhrase: string;
}): string {
  return [
    `제목: ${values.title}`,
    "",
    "내용:",
    `${values.where}에 다음 생활불편이 있습니다.`,
    `- 현장 상황: ${values.what}`,
    `- 관찰 일시: ${values.when}`,
    `- 영향: ${values.impact}`,
    "",
    `위치: ${values.where}`,
    `첨부: ${values.photoNote}`,
    `요청사항: ${values.requestPhrase}`,
    "",
    "※ 신고 준비용 초안입니다. 실제 접수는 사용자가 공식 채널에서 직접 진행해야 합니다.",
    "※ 처리기간, 담당부서, 행정조치는 사안과 지역에 따라 달라질 수 있습니다."
  ].join("\n");
}

function maskOfficialReportText(text: string, item: TaxonomyItem): ReturnType<typeof maskPii> {
  const normalized = normalizeText(text);
  if (!shouldKeepVehiclePlateForOfficialReport(item)) {
    return maskPii(normalized);
  }

  const plates = Array.from(normalized.matchAll(officialVehiclePlatePattern), (match) => match[0]);
  if (!plates.length) {
    return maskPii(normalized);
  }

  let protectedText = normalized;
  plates.forEach((plate, index) => {
    protectedText = protectedText.split(plate).join(`__OFFICIAL_VEHICLE_${index}__`);
  });

  const masked = maskPii(protectedText);
  let restoredText = masked.text;
  plates.forEach((plate, index) => {
    restoredText = restoredText.split(`__OFFICIAL_VEHICLE_${index}__`).join(plate);
  });

  return {
    text: restoredText,
    detected: true,
    maskedFields: Array.from(new Set([...masked.maskedFields, "vehicle_plate_official_only"]))
  };
}

function shouldKeepVehiclePlateForOfficialReport(item: TaxonomyItem): boolean {
  return item.code === "ILLEGAL_PARKING_SAFETY" || item.code === "SCHOOL_ZONE_SAFETY";
}

function privacyRedactionsFor(item: TaxonomyItem, piiDetected: boolean): string[] {
  const base = ["공개 동네방 글에는 전화번호, 실명, 정확한 주소·호수, 현관 비밀번호를 넣지 마세요.", "사진 속 행인·아이 얼굴은 공개하지 말고 가리세요."];
  if (shouldKeepVehiclePlateForOfficialReport(item)) {
    base.unshift("차량번호는 공식 신고용 사실관계로만 쓰고 공개 공유문에는 넣지 마세요.");
  }
  if (piiDetected) {
    base.push("입력에서 식별정보가 감지되어 공식 신고용과 공개 공유용을 분리했습니다.");
  }
  return base;
}

function shortProblem(item: TaxonomyItem, what: string): string {
  if (what.includes("파손")) return "파손";
  if (what.includes("고장")) return "고장";
  if (what.includes("침수")) return "침수";
  if (what.includes("방치")) return "방치";
  return item.label_ko.replace(/·.*/, "");
}

function titleLocation(where: string): string {
  if (/비공개|공개하지|정확한\s*주소|개인정보/.test(where) || where.startsWith("[") || where.length > 40) {
    return "";
  }
  return where;
}

function shareLocation(where: string): string {
  if (/비공개|공개하지|정확한\s*주소|개인정보/.test(where) || where.startsWith("[") || where.length > 40) {
    return "해당 공용 구역";
  }
  return where;
}

function defaultImpact(item: TaxonomyItem): string {
  if (item.group.includes("도로") || item.group.includes("보행") || item.group.includes("접근성")) {
    return "보행자와 이용자의 안전이 우려됩니다.";
  }
  if (item.group.includes("환경")) {
    return "위생과 생활환경 불편이 우려됩니다.";
  }
  return copyRules.fallback_impact;
}

function suggestedChannel(item: TaxonomyItem): string {
  const channel = channelsData[item.channel_family];
  if (item.channel_family === "LOCAL_CIVIC_VERIFY") {
    return `${channel.label} — 지역/구청 공식 생활민원 페이지에서 직접 선택`;
  }
  return `${channel.label} / 국민신문고 일반민원 / 지역·구청 공식 생활민원 페이지 직접 선택`;
}

function resolveDraftTaxonomyItem(issueCode: string, input: DraftInput): TaxonomyItem | undefined {
  const exact = getTaxonomyItem(issueCode);
  if (exact) return exact;

  const snapshotIssue = input.classification_snapshot?.issue;
  const snapshotCode =
    snapshotIssue && typeof snapshotIssue === "object" && "code" in snapshotIssue && typeof snapshotIssue.code === "string"
      ? snapshotIssue.code
      : undefined;
  if (snapshotCode) {
    const snapshotItem = getTaxonomyItem(snapshotCode);
    if (snapshotItem) return snapshotItem;
  }

  const hint = normalizeText(issueCode);
  const text = normalizeText(
    [input.facts.what, input.facts.where_general, input.facts.impact, input.facts.photo_note, snapshotLabel(input)].filter(Boolean).join(" ")
  );
  const categoryCandidates = taxonomyData.items.filter((item) => categoryMatches(item, hint));
  const candidatePool = hint === "unknown" || categoryCandidates.length === 0 ? taxonomyData.items : categoryCandidates;
  const candidates = candidatePool
    .map((item) => {
      const score = item.keywords.reduce((sum, keyword) => {
        return text.includes(normalizeText(keyword)) ? sum + (keyword.length >= 4 ? 3 : 2) : sum;
      }, 0);
      return { item, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code));

  return candidates[0]?.item;
}

function snapshotLabel(input: DraftInput): string {
  const snapshotIssue = input.classification_snapshot?.issue;
  if (!snapshotIssue || typeof snapshotIssue !== "object") return "";
  const label = "label_ko" in snapshotIssue ? snapshotIssue.label_ko : undefined;
  return typeof label === "string" ? label : "";
}

function categoryMatches(item: TaxonomyItem, hint: string): boolean {
  const group = item.group;
  if (hint === "road_walkway") return group.includes("도로") || group.includes("보행");
  if (hint === "public_facility") return group.includes("시설");
  if (hint === "environment_sanitation") return group.includes("환경");
  if (hint === "advertising_obstruction") return group.includes("광고") || group.includes("적치");
  if (hint === "safety_accessibility") return group.includes("안전") || group.includes("접근성");
  if (hint === "parking_mobility") return group.includes("주차") || group.includes("이동");
  return false;
}

function isPersonalNeighborHelpRequest(text: string): boolean {
  const normalized = normalizeText(text);
  const personalHelpIntent =
    /(도와줄\s*사람|도와주실\s*분|도움\s*줄\s*분|사람을?\s*찾|분을?\s*찾|구하고\s*싶|찾고\s*싶|동네에서\s*찾|이웃\s*도움|모집글)/.test(
      normalized
    );
  if (!personalHelpIntent && !normalized.includes("당근")) {
    return false;
  }
  return /(병원\s*동행|동행|택배|짐|물건|냉장고|이사|옮기|강아지|고양이|반려동물|펫|밥만|산책|심부름|돌봄|집\s*방문|집에\s*들어|문\s*열|열쇠|비밀번호)/.test(
    normalized
  );
}

function detectDraftEmergency(issueCode: string, what: string, impact: string): ReturnType<typeof detectEmergency> {
  if (isEmergencyCode(issueCode)) {
    return detectEmergency(issueCode);
  }
  const direct = detectEmergency(what);
  if (direct) return direct;

  const impactEmergency = detectEmergency(impact);
  if (!impactEmergency) return null;
  if (impactEmergency.code === "EMERGENCY_POLICE" && isGeneralCrimeAnxiety(impact)) {
    return null;
  }
  return impactEmergency;
}

function isGeneralCrimeAnxiety(text: string): boolean {
  return /(범죄|치안)\s*(불안|우려|걱정)/.test(text);
}

function blockedEmergency(message: string): DraftOutput {
  const output: DraftOutput = {
    ok: true,
    result_type: "blocked_emergency",
    answer_markdown: "",
    draft: null,
    official_routes: [],
    legal_context: [],
    privacy_redactions: [],
    share: {
      neighbor_text: "",
      private_note: "긴급하거나 즉시 위험한 상황은 초안 생성 대신 공식 긴급 채널 직접 연락이 우선입니다."
    },
    safety: {
      pii_detected: false,
      masked_fields: [],
      neutralized_phrases: [],
      disclaimers: safetyRules.disclaimers,
      photo_privacy_note: safetyRules.photo_privacy_note
    },
    presentation_mock: {
      version: "0.1",
      card_type: "safety_redirect_card",
      headline: "",
      badges: [],
      sections: [],
      actions: [],
      footer_notice: ""
    },
    errors: [{ code: "E_EMERGENCY_REDIRECT", severity: "blocking", message }]
  };
  output.presentation_mock = draftCard(output);
  output.answer_markdown = buildDraftAnswer(output);
  return output;
}

function failure(resultType: DraftOutput["result_type"], code: string, message: string): DraftOutput {
  const output: DraftOutput = {
    ok: false,
    result_type: resultType,
    answer_markdown: "",
    draft: null,
    official_routes: [],
    legal_context: buildLegalContext({ hasPrivacyRisk: resultType === "out_of_scope" }),
    privacy_redactions:
      resultType === "out_of_scope"
        ? [
            "정확한 주소·호수, 전화번호, 현관 비밀번호, 혼자 있다는 정보는 공개글에 넣지 마세요.",
            "개인 도움 요청은 자동 게시·매칭·연락 대행 없이 별도 안전 설계가 필요합니다."
          ]
        : [],
    share: { neighbor_text: "", private_note: "자동 발송되지 않습니다." },
    safety: {
      pii_detected: false,
      masked_fields: [],
      neutralized_phrases: [],
      disclaimers: safetyRules.disclaimers,
      photo_privacy_note: safetyRules.photo_privacy_note
    },
    presentation_mock: {
      version: "0.1",
      card_type: "needs_clarification",
      headline: "입력을 확인해 주세요",
      badges: ["확인 필요"],
      sections: [{ title: "안내", text: message }],
      actions: [],
      footer_notice: "동네SOS는 실제 접수·전송을 하지 않는 신고 준비 도구입니다."
    },
    errors: [{ code, severity: "blocking", message }]
  };
  output.answer_markdown = buildDraftAnswer(output);
  return output;
}
