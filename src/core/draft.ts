import { channelsData, copyRules, getTaxonomyItem, safetyRules, taxonomyData } from "../data/loadData.js";
import type { DraftInput, DraftOutput, SosError, TaxonomyItem } from "../types.js";
import { detectEmergency, isEmergencyCode } from "./emergency.js";
import { maskPii } from "./pii.js";
import { neutralizeForbiddenClaims } from "./neutralize.js";
import { normalizeText } from "./normalize.js";
import { draftCard } from "./presentationMock.js";

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

  const maskedWhat = maskPii(what);
  const maskedWhere = maskPii(input.facts?.where_general ?? "");
  const maskedImpact = maskPii(impact);
  const neutralWhat = neutralizeForbiddenClaims(maskedWhat.text);
  const neutralImpact = neutralizeForbiddenClaims(maskedImpact.text);
  const piiDetected = maskedWhat.detected || maskedWhere.detected || maskedImpact.detected;
  const maskedFields = [...maskedWhat.maskedFields, ...maskedWhere.maskedFields, ...maskedImpact.maskedFields];
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
  const placeholders = [
    where === copyRules.fallback_where ? copyRules.fallback_where : null,
    when === copyRules.fallback_when ? copyRules.fallback_when : null
  ].filter((value): value is string => Boolean(value));

  const problem = shortProblem(item, neutralWhat.text);
  const titleWhere = titleLocation(where);
  const title = [`[${item.label_ko}]`, titleWhere, `${problem} 점검 요청`].filter(Boolean).join(" ");
  const body = replaceFirstLine(
    fillTemplate(item, {
      issue_label: item.label_ko,
      where_general: where,
      short_problem: problem,
      what: neutralWhat.text,
      when_observed: when,
      impact: safeImpact,
      request_phrase: item.request_phrase
    }),
    title
  );

  const suggested = suggestedChannel(item);
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
    draft: {
      title,
      body,
      copy_block: body,
      suggested_channel_label: suggested,
      evidence_checklist: evidence,
      placeholders_to_fill: placeholders
    },
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
  return output;
}

function fillTemplate(item: TaxonomyItem, values: Record<string, string>): string {
  let text = copyRules.base_draft_template;
  for (const [key, value] of Object.entries(values)) {
    text = text.split(`{{${key}}}`).join(value);
  }
  // Keep the request phrase from taxonomy authoritative even when the template changes.
  return text.split("{{request_phrase}}").join(item.request_phrase);
}

function replaceFirstLine(text: string, firstLine: string): string {
  const lines = text.split("\n");
  lines[0] = firstLine;
  return lines.join("\n");
}

function fillNeighborTemplate(item: TaxonomyItem, where: string): string {
  return copyRules.neighbor_share_template
    .split("{{where_general}}")
    .join(shareLocation(where))
    .split("{{issue_label}}")
    .join(item.label_ko);
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
    return `${channel.label} — 세부 접수처 확인 필요`;
  }
  return `${channel.label} 또는 해당 지자체 생활민원 창구 — 세부 접수처 확인 필요`;
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
  const candidates = taxonomyData.items
    .filter((item) => hint === "unknown" || categoryMatches(item, hint))
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
    draft: null,
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
  return output;
}

function failure(resultType: DraftOutput["result_type"], code: string, message: string): DraftOutput {
  const output: DraftOutput = {
    ok: false,
    result_type: resultType,
    draft: null,
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
  return output;
}
