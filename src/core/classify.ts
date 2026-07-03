import { channelsData, safetyRules, taxonomyData } from "../data/loadData.js";
import type { ChannelFamily, ClassificationOutput, ClassifyInput, ResultType, SosError, TaxonomyItem } from "../types.js";
import { detectEmergency } from "./emergency.js";
import { maskPii } from "./pii.js";
import { neutralizeForbiddenClaims } from "./neutralize.js";
import { clamp, normalizeText } from "./normalize.js";
import { formatLegalContext, formatOfficialRoutes } from "./officialGuidance.js";
import { classificationCard } from "./presentationMock.js";
import { buildSourceGrounding, emptySourceGrounding } from "./sourceCards.js";

const confidenceThreshold = 0.45;

interface Score {
  item: TaxonomyItem;
  score: number;
  matches: number;
}

export function classifyCivicIssue(input: ClassifyInput): ClassificationOutput {
  const errors: SosError[] = [];
  const description = normalizeText(input.description ?? "");

  if (description.length < 2) {
    return baseFailure("E_EMPTY_DESCRIPTION", "무엇이 불편한지 한 줄로 적어주세요.", "needs_clarification", "UNCLEAR", "명확화 필요");
  }
  if (description.length > 1500) {
    return baseFailure("E_INPUT_TOO_LONG", "설명이 너무 깁니다. 핵심만 짧게 요약해 주세요.", "error", "UNCLEAR", "명확화 필요");
  }
  if (input.language && input.language !== "ko") {
    return baseFailure("E_UNSUPPORTED_LANGUAGE", "예선 MVP는 한국어 입력만 지원합니다.", "error", "UNCLEAR", "명확화 필요");
  }

  const masked = maskPii(description);
  const neutralized = neutralizeForbiddenClaims(masked.text);
  const emergency = detectEmergency(description);
  if (emergency) {
    const output = makeEmergencyOutput(emergency, masked.text, masked.detected);
    if (masked.detected) {
      output.errors.push({
        code: "E_PII_MASKED",
        severity: "warning",
        message: "개인정보 또는 식별정보로 보이는 값을 마스킹했습니다."
      });
    }
    output.errors.push({
      code: "E_EMERGENCY_REDIRECT",
      severity: "blocking",
      message: "긴급 또는 즉시 위험 가능성이 있어 초안 생성을 차단했습니다."
    });
    return output;
  }

  if (safetyRules.out_of_scope_keywords.some((term) => masked.text.includes(term))) {
    return makeOutOfScopeOutput(neutralized.text, masked.detected, neutralized.removed, [
      ...(masked.detected ? [{ code: "E_PII_MASKED", severity: "warning" as const, message: "개인정보 또는 식별정보로 보이는 값을 마스킹했습니다." }] : []),
      ...(neutralized.removed.length
        ? [{ code: "E_FORBIDDEN_ASSERTION_REMOVED", severity: "warning" as const, message: "처벌·비방·책임 단정으로 보일 수 있는 표현을 중립화했습니다." }]
        : [])
    ]);
  }
  if (isPersonalNeighborHelpRequest(neutralized.text)) {
    return makeNeighborHelpOutOfScopeOutput(neutralized.text, masked.detected, neutralized.removed, [
      ...(masked.detected ? [{ code: "E_PII_MASKED", severity: "warning" as const, message: "개인정보 또는 식별정보로 보이는 값을 마스킹했습니다." }] : []),
      ...(neutralized.removed.length
        ? [{ code: "E_FORBIDDEN_ASSERTION_REMOVED", severity: "warning" as const, message: "처벌·비방·책임 단정으로 보일 수 있는 표현을 중립화했습니다." }]
        : [])
    ]);
  }

  if (masked.detected) {
    errors.push({ code: "E_PII_MASKED", severity: "warning", message: "개인정보 또는 식별정보로 보이는 값을 마스킹했습니다." });
  }
  if (neutralized.removed.length) {
    errors.push({
      code: "E_FORBIDDEN_ASSERTION_REMOVED",
      severity: "warning",
      message: "처벌·비방·책임 단정으로 보일 수 있는 표현을 중립화했습니다."
    });
  }

  const scores = scoreTaxonomy(neutralized.text, input.category_hint);
  const best = scores[0];
  const second = scores[1];
  if (!best || best.score <= 0) {
    return makeUnclearOutput(neutralized.text, masked.detected, neutralized.removed, errors);
  }

  const confidence = clamp(best.score / (best.score + (second?.score ?? 1) + 1), 0, 0.99);
  if (confidence < confidenceThreshold) {
    return makeUnclearOutput(neutralized.text, masked.detected, neutralized.removed, [
      ...errors,
      { code: "E_LOW_CONFIDENCE_NEEDS_CLARIFICATION", severity: "info", message: "유형을 확정하기 어려워 추가 설명이 필요합니다." }
    ]);
  }

  const routing = routingFor(best.item.channel_family);
  const priorityExplanation =
    best.item.priority === "quick"
      ? "빠른 접수 준비를 권장하지만 긴급 출동을 대신 안내할 상황은 아닙니다."
      : best.item.priority === "low"
        ? "일반 생활불편 신고 준비가 가능합니다. 세부 접수처는 확인이 필요합니다."
        : "비긴급 생활불편 신고 준비가 가능합니다. 공식 채널에서 세부 접수처를 확인해 주세요.";
  const sourceGrounding = buildSourceGrounding({
    item: best.item,
    originalText: description,
    normalizedSafeText: neutralized.text,
    channelFamily: best.item.channel_family,
    piiDetected: masked.detected
  });

  const output: ClassificationOutput = {
    ok: true,
    result_type: "classification",
    answer_markdown: "",
    issue: {
      code: best.item.code,
      label_ko: best.item.label_ko,
      group: best.item.group
    },
    confidence: Number(confidence.toFixed(2)),
    alternatives: scores
      .slice(1, 4)
      .filter((score) => score.score > 0)
      .map((score) => ({
        code: score.item.code,
        label_ko: score.item.label_ko,
        confidence: Number(clamp(score.score / (best.score + score.score + 1), 0, 0.95).toFixed(2))
      })),
    priority: {
      level: best.item.priority,
      is_emergency: false,
      explanation: priorityExplanation
    },
    routing,
    evidence: {
      required: best.item.evidence_required,
      optional: best.item.evidence_optional,
      avoid: best.item.evidence_avoid
    },
    source_basis: sourceGrounding.source_basis,
    action_card: sourceGrounding.action_card,
    safety: {
      pii_detected: masked.detected,
      masked_description: neutralized.text,
      forbidden_claims_removed: neutralized.removed,
      emergency_redirect: null,
      notices: safetyRules.disclaimers
    },
    draft_policy: {
      can_draft: true,
      reason: "비긴급 생활불편으로 초안 생성 가능"
    },
    user_messages: {
      summary: `공식 신고 준비가 가능합니다. 준비할 정보: ${best.item.evidence_required.join(", ")}.`,
      next_action: "draft_civic_report를 호출해 복붙용 초안을 만들 수 있습니다.",
      clarifying_question: null
    },
    presentation_mock: {
      version: "0.1",
      card_type: "classification_card",
      headline: "",
      badges: [],
      sections: [],
      actions: [],
      footer_notice: ""
    },
    errors
  };
  output.presentation_mock = classificationCard(output);
  output.answer_markdown = buildClassificationAnswer(output);
  return output;
}

function buildClassificationAnswer(output: ClassificationOutput): string {
  if (output.result_type === "emergency_redirect") {
    return output.safety.emergency_redirect?.message ?? output.user_messages.summary;
  }
  if (output.issue.label_ko === "이웃 도움 교류 요청") {
    return [
      "이 요청은 현재 동네SOS의 공공시설·환경 신고 준비 범위가 아닙니다.",
      "다만 공개 글을 쓴다면 개인정보를 이렇게 분리하는 것이 안전합니다.",
      "",
      "공개 글에 적어도 되는 것:",
      "- 대략적인 동네나 건물 밖 기준 위치",
      "- 필요한 도움의 범위와 예상 소요 시간",
      "- 무거운 물건인지, 계단 여부처럼 안전에 필요한 일반 정보",
      "",
      "공개 글에 적지 말 것:",
      "- 정확한 주소·동호수·현관 비밀번호",
      "- 전화번호, 실명, 혼자 있다는 정보",
      "- 집 내부 사진이나 출입 방법",
      "",
      "세부 위치와 시간은 플랫폼 메시지에서만 최소한으로 공유하고, 동네SOS는 자동 매칭·연락·게시를 하지 않습니다."
    ].join("\n");
  }
  if (output.result_type === "out_of_scope") {
    return [output.user_messages.summary, output.draft_policy.reason, "공공시설·환경 생활불편이면 현장 상태 중심으로 다시 적어주세요."].join("\n");
  }
  if (output.result_type === "needs_clarification") {
    return output.user_messages.clarifying_question ?? output.user_messages.summary;
  }

  const legalContext = output.action_card.legal_context.length
    ? `\n\n법적·개인정보 맥락:\n${formatLegalContext(output.action_card.legal_context)}`
    : "";
  return [
    "공식 신고 준비가 가능합니다.",
    "",
    "먼저 이용할 공식 경로:",
    formatOfficialRoutes(output.action_card.official_routes),
    "",
    `바로 할 일: ${output.action_card.next_action}`,
    `준비할 증거: ${output.action_card.evidence_now.join(", ")}.`,
    `공개 동네방 글에서 빼야 할 정보: ${output.action_card.do_not_share.join(", ")}.${legalContext}`,
    "복붙용 신고문이 필요하면 draft_civic_report로 초안을 만들면 됩니다.",
    "동네SOS는 신고 준비만 돕고 실제 접수·전송은 하지 않습니다."
  ].join("\n");
}

function scoreTaxonomy(text: string, categoryHint?: string): Score[] {
  const normalized = normalizeText(text);
  return taxonomyData.items
    .map((item) => {
      let score = 0;
      let matches = 0;
      for (const keyword of item.keywords) {
        if (normalized.includes(normalizeText(keyword))) {
          score += keyword.length >= 4 ? 3 : 2;
          matches += 1;
        }
      }
      if (categoryHint && categoryHint !== "unknown" && categoryMatches(item, categoryHint)) {
        score += 1.5;
      }
      if (
        item.code === "ILLEGAL_PARKING_SAFETY" &&
        /(불법\s*주정차|주정차|주차|차량|차가|차량정보 비공개|번호판)/.test(normalized) &&
        /(횡단보도|소화전|어린이보호구역|스쿨존|인도|통행)/.test(normalized)
      ) {
        score += 4;
      }
      if (item.code === "CROSSWALK_FADED" && /(불법\s*주정차|주정차|주차|차량|차가|번호판)/.test(normalized)) {
        score -= 2;
      }
      return { item, score, matches };
    })
    .sort((a, b) => b.score - a.score || b.matches - a.matches || a.item.code.localeCompare(b.item.code));
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
    /(도와줄\s*사람|도와주실\s*분|도움\s*줄\s*분|사람을?\s*찾|분을?\s*찾|구하고\s*싶|찾고\s*싶|동네에서\s*찾|이웃\s*도움)/.test(normalized);
  if (!personalHelpIntent && !normalized.includes("당근")) {
    return false;
  }
  return /(병원\s*동행|동행|택배|짐|물건|강아지|고양이|반려동물|펫|밥만|산책|심부름|돌봄|집\s*방문|집에\s*들어|문\s*열|열쇠|비밀번호)/.test(
    normalized
  );
}

function routingFor(channelFamily: ChannelFamily): ClassificationOutput["routing"] {
  const primary = channelsData[channelFamily];
  const local = channelFamily === "LOCAL_CIVIC_VERIFY" ? null : channelsData.LOCAL_CIVIC_VERIFY;
  const candidates = [primary, local].filter(Boolean).map((candidate) => ({
    label: candidate!.label,
    why: candidate!.why,
    verify_needed: candidate!.verify_needed
  }));
  return {
    channel_family: channelFamily,
    channel_candidates: candidates,
    verify_needed: candidates.some((candidate) => candidate.verify_needed),
    routing_confidence: primary.routing_confidence,
    region_note: safetyRules.region_note
  };
}

function makeEmergencyOutput(emergency: NonNullable<ReturnType<typeof detectEmergency>>, maskedDescription: string, piiDetected: boolean): ClassificationOutput {
  const routing = routingFor("EMERGENCY_DIRECT");
  const sourceGrounding = emptySourceGrounding("긴급 또는 즉시 위험 가능성이 있어 생활불편 source card 매칭보다 공식 긴급 채널 직접 연락을 우선합니다.");
  sourceGrounding.action_card = {
    ...sourceGrounding.action_card,
    headline: `${emergency.label_ko}: 공식 긴급 채널 직접 연락`,
    official_domain: "공식 긴급 채널",
    next_action: "안전한 장소로 이동한 뒤 112/119 등 해당 공식 긴급 채널에 직접 연락하세요.",
    evidence_now: ["안전한 장소에서 상황 확인", "위험 지역에 머무르지 않기"],
    do_not_share: ["사진 촬영을 위해 위험 지역에 머무르기", "민원 초안 작성으로 대응 지연"],
    source_summary: "긴급 가능성에서는 신고 준비보다 공식 긴급 채널 직접 연락이 우선입니다."
  };
  const output: ClassificationOutput = {
    ok: true,
    result_type: "emergency_redirect",
    answer_markdown: "",
    issue: { code: emergency.code, label_ko: emergency.label_ko, group: "긴급" },
    confidence: 1,
    alternatives: [],
    priority: {
      level: "emergency_redirect",
      is_emergency: true,
      explanation: "생활불편 초안을 만들 상황이 아니라 공식 긴급 채널에 직접 연락해야 할 수 있습니다."
    },
    routing,
    evidence: {
      required: ["안전한 장소에서 상황 확인", "공식 긴급 채널에 직접 연락"],
      optional: [],
      avoid: ["현장 접근", "사진 촬영을 위해 위험 지역에 머무르기", "민원 초안 작성으로 대응 지연"]
    },
    source_basis: sourceGrounding.source_basis,
    action_card: sourceGrounding.action_card,
    safety: {
      pii_detected: piiDetected,
      masked_description: maskedDescription,
      forbidden_claims_removed: [],
      emergency_redirect: {
        label: "공식 긴급 채널 직접 연락",
        numbers: emergency.numbers,
        message: emergency.message
      },
      notices: safetyRules.disclaimers
    },
    draft_policy: { can_draft: false, reason: "긴급 또는 즉시 위험 가능성이 있어 초안 생성을 차단했습니다." },
    user_messages: {
      summary: emergency.message,
      next_action: "안전한 곳에서 공식 긴급 채널에 직접 연락하세요.",
      clarifying_question: null
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
    errors: []
  };
  output.presentation_mock = classificationCard(output);
  output.answer_markdown = buildClassificationAnswer(output);
  return output;
}

function makeUnclearOutput(text: string, piiDetected: boolean, removed: string[], errors: SosError[]): ClassificationOutput {
  const routing = routingFor("NONE");
  const sourceGrounding = emptySourceGrounding("입력만으로 생활불편 유형을 확정하기 어려워 공식 source card를 좁히지 않았습니다.");
  const output: ClassificationOutput = {
    ok: true,
    result_type: "needs_clarification",
    answer_markdown: "",
    issue: { code: "UNCLEAR", label_ko: "명확화 필요", group: "확인 필요" },
    confidence: 0,
    alternatives: [],
    priority: { level: "normal", is_emergency: false, explanation: "입력만으로 유형을 확정하기 어렵습니다." },
    routing,
    evidence: { required: [], optional: [], avoid: ["실명", "연락처", "차량번호", "좌표", "처벌 요구"] },
    source_basis: sourceGrounding.source_basis,
    action_card: sourceGrounding.action_card,
    safety: {
      pii_detected: piiDetected,
      masked_description: text,
      forbidden_claims_removed: removed,
      emergency_redirect: null,
      notices: safetyRules.disclaimers
    },
    draft_policy: { can_draft: false, reason: "무엇이/어디서/어떤 위험인지 보강이 필요합니다." },
    user_messages: {
      summary: "아직 생활불편 유형을 확정하기 어렵습니다.",
      next_action: "무엇이, 어디서, 어떤 위험이 있는지 한 줄만 더 적어주세요.",
      clarifying_question: "무엇이 불편한가요? 예: 보도블록 파손, 가로등 고장, 쓰레기 방치 등"
    },
    presentation_mock: {
      version: "0.1",
      card_type: "needs_clarification",
      headline: "조금만 더 알려주세요",
      badges: ["확인 필요"],
      sections: [{ title: "필요한 정보", items: ["무엇이", "어디서", "어떤 위험인지"] }],
      actions: [],
      footer_notice: "동네SOS는 실제 접수·전송을 하지 않는 신고 준비 도구입니다."
    },
    errors
  };
  output.answer_markdown = buildClassificationAnswer(output);
  return output;
}

function makeOutOfScopeOutput(text: string, piiDetected: boolean, removed: string[], errors: SosError[]): ClassificationOutput {
  const output = makeUnclearOutput(text, piiDetected, removed, [
    ...errors,
    { code: "E_OUT_OF_SCOPE", severity: "blocking", message: "생활 공공시설·환경 불편 준비 범위가 아닙니다." }
  ]);
  output.result_type = "out_of_scope";
  output.issue = { code: "OUT_OF_SCOPE", label_ko: "범위 밖", group: "범위 밖" };
  output.draft_policy = { can_draft: false, reason: "사인 간 분쟁, 법률 문서, 처벌 요구는 동네SOS 범위가 아닙니다." };
  output.user_messages.summary = "동네SOS는 생활 공공시설·환경 불편의 신고 준비만 돕습니다.";
  output.user_messages.next_action = "생활 공공시설·환경 불편이면 현장 상태 중심으로 다시 적어주세요.";
  output.user_messages.clarifying_question = null;
  output.presentation_mock = {
    version: "0.1",
    card_type: "needs_clarification",
    headline: "현재 범위 밖 요청입니다",
    badges: ["범위 밖", "초안 생성 불가"],
    sections: [{ title: "지원 범위", text: output.draft_policy.reason }],
    actions: [],
    footer_notice: "동네SOS 현재 버전은 생활 공공시설·환경 불편 신고 준비만 지원합니다."
  };
  output.answer_markdown = buildClassificationAnswer(output);
  return output;
}

function makeNeighborHelpOutOfScopeOutput(text: string, piiDetected: boolean, removed: string[], errors: SosError[]): ClassificationOutput {
  const output = makeOutOfScopeOutput(text, piiDetected, removed, [
    ...errors,
    { code: "E_NEIGHBOR_HELP_UNSUPPORTED", severity: "info", message: "이웃 도움 교류 기능은 현재 버전의 실행 범위가 아니라 별도 로드맵입니다." }
  ]);
  output.issue = { code: "OUT_OF_SCOPE", label_ko: "이웃 도움 교류 요청", group: "범위 밖" };
  output.draft_policy = {
    can_draft: false,
    reason: "이웃 도움 교류는 현재 버전에서 설계 로드맵으로만 다루며, 지금은 공공시설·환경 신고 준비 초안을 만들지 않습니다."
  };
  output.user_messages = {
    summary: "이 요청은 현재 동네SOS의 생활 공공시설·환경 신고 준비 범위가 아닙니다.",
    next_action: "공공시설·환경 불편이면 현장 상태를 적어주시고, 개인 도움 교류는 향후 별도 안전 설계가 필요합니다.",
    clarifying_question: null
  };
  output.presentation_mock = {
    version: "0.1",
    card_type: "needs_clarification",
    headline: "이웃 도움 교류는 현재 로드맵 기능입니다",
    badges: ["범위 밖", "안전 설계 필요"],
    sections: [
      {
        title: "현재 지원하지 않음",
        text: "병원 동행, 반려동물 돌봄, 집 방문, 물건 이동처럼 개인 간 도움을 찾는 요청은 현재 civic 신고 준비 도구의 범위가 아닙니다."
      },
      {
        title: "현재 버전에서 가능한 것",
        text: "보도블록 파손, 가로등 고장, 쓰레기 방치처럼 공공시설·환경 생활불편의 신고 준비만 돕습니다."
      }
    ],
    actions: [],
    footer_notice: "개인 도움 교류 기능은 별도 안전·개인정보 설계 후에만 추가할 수 있습니다."
  };
  output.answer_markdown = buildClassificationAnswer(output);
  return output;
}

function baseFailure(code: string, message: string, resultType: ResultType, issueCode: string, label: string): ClassificationOutput {
  const routing = routingFor("NONE");
  const sourceGrounding = emptySourceGrounding("입력 검증 단계에서 중단되어 공식 source card를 매칭하지 않았습니다.");
  return {
    ok: false,
    result_type: resultType,
    answer_markdown: message,
    issue: { code: issueCode, label_ko: label, group: "확인 필요" },
    confidence: 0,
    alternatives: [],
    priority: { level: "normal", is_emergency: false, explanation: message },
    routing,
    evidence: { required: [], optional: [], avoid: [] },
    source_basis: sourceGrounding.source_basis,
    action_card: sourceGrounding.action_card,
    safety: {
      pii_detected: false,
      masked_description: "",
      forbidden_claims_removed: [],
      emergency_redirect: null,
      notices: safetyRules.disclaimers
    },
    draft_policy: { can_draft: false, reason: message },
    user_messages: { summary: message, next_action: "입력을 보강해 주세요.", clarifying_question: message },
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
}
