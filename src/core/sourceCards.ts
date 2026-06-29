import { sourceCardsData } from "../data/loadData.js";
import type { ActionCard, ChannelFamily, SourceBasis, SourceBasisCard, SourceCard, TaxonomyItem } from "../types.js";
import { normalizeText } from "./normalize.js";
import { buildLegalContext, buildOfficialRoutes } from "./officialGuidance.js";

interface GroundingInput {
  item?: TaxonomyItem;
  originalText: string;
  normalizedSafeText: string;
  channelFamily: ChannelFamily;
  piiDetected: boolean;
}

interface ScoredCard {
  card: SourceCard;
  score: number;
  reasons: string[];
}

interface SourceGrounding {
  source_basis: SourceBasis;
  action_card: ActionCard;
}

const safetyOverviewCardId = "mois_safetyreport_domains";
const generalFlowCardId = "safetyreport_app_general_flow";
const illegalParkingCardId = "safetyreport_illegal_parking_basic";
const vehiclePrivacyCardId = "pipc_vehicle_plate_personal_info";
const petitionConfidentialityCardId = "petition_act_article_7_confidentiality";

const privacySignalPattern =
  /(개인정보|차량번호|자동차등록번호|번호판|얼굴|아이들|아동|실명|연락처|전화번호|동호수|비밀번호|집\s*안|동네방|커뮤니티|공개|공유|사진)/;

const parkingSignalPattern = /(불법\s*주정차|주정차|주차|소화전|횡단보도|어린이보호구역|스쿨존|차량|차|번호판)/;

export function buildSourceGrounding(input: GroundingInput): SourceGrounding {
  const matchedCards = selectSourceCards(input);
  const basisCards = matchedCards.map(({ card, reasons }) => toBasisCard(card, reasons));
  const sourceBasis: SourceBasis = {
    matched_cards: basisCards,
    source_card_count: sourceCardsData.cards.length,
    source_strategy:
      "사전 수집된 공식 source card를 사건 유형, 입력 키워드, 개인정보 위험 신호에 맞춰 빠르게 매칭했습니다. 광범위한 실시간 웹 검색 대신 검증일과 출처 URL이 있는 구조화 자료를 사용합니다.",
    needs_official_verification:
      input.channelFamily !== "OFFICIAL_SAFETY_CIVIC" ||
      basisCards.some((card) => card.limitations.some((text) => /differ|vary|다르|달라|차이|확인/.test(text)))
  };

  return {
    source_basis: sourceBasis,
    action_card: buildActionCard(input, sourceBasis)
  };
}

export function emptySourceGrounding(reason: string): SourceGrounding {
  const sourceBasis: SourceBasis = {
    matched_cards: [],
    source_card_count: sourceCardsData.cards.length,
    source_strategy: reason,
    needs_official_verification: true
  };
  return {
    source_basis: sourceBasis,
    action_card: {
      headline: "공식 근거 확인 전 추가 정보가 필요합니다",
      official_domain: "확인 필요",
      next_action: "무엇이, 어디서, 어떤 위험인지 한 줄 더 보강한 뒤 다시 분류하세요.",
      evidence_now: [],
      do_not_share: ["실명", "연락처", "정밀 위치", "차량번호", "아동 얼굴"],
      official_routes: [],
      legal_context: [],
      source_summary: "현재 입력만으로 매칭할 공식 source card를 좁히지 않았습니다.",
      verification_note: "동네SOS는 실제 접수·전송을 하지 않으며, 최종 접수처와 요구 증거는 공식 채널에서 확인해야 합니다."
    }
  };
}

function selectSourceCards(input: GroundingInput): ScoredCard[] {
  const text = normalizeText(`${input.originalText} ${input.normalizedSafeText}`);
  const scored = sourceCardsData.cards
    .map((card) => scoreCard(card, input, text))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || priorityForCard(a.card) - priorityForCard(b.card) || a.card.source_id.localeCompare(b.card.source_id));

  const selected = new Map<string, ScoredCard>();
  const add = (entry: ScoredCard | undefined): void => {
    if (entry) selected.set(entry.card.source_id, entry);
  };

  if (input.item && input.channelFamily === "OFFICIAL_SAFETY_CIVIC") {
    add(scored.find((entry) => entry.card.source_id === safetyOverviewCardId));
  }
  if (input.item?.code === "ILLEGAL_PARKING_SAFETY" || input.item?.code === "SCHOOL_ZONE_SAFETY" || parkingSignalPattern.test(text)) {
    add(scored.find((entry) => entry.card.source_id === illegalParkingCardId));
  }
  if (privacySignalPattern.test(text) || input.piiDetected) {
    add(scored.find((entry) => entry.card.source_id === vehiclePrivacyCardId));
    add(scored.find((entry) => entry.card.source_id === petitionConfidentialityCardId));
  }
  add(scored.find((entry) => entry.card.source_id === generalFlowCardId));

  for (const entry of scored) {
    if (selected.size >= 4) break;
    add(entry);
  }

  return [...selected.values()].slice(0, 4);
}

function scoreCard(card: SourceCard, input: GroundingInput, text: string): ScoredCard {
  let score = 0;
  const reasons: string[] = [];

  if (input.item && card.applies_to_taxonomy_codes.includes(input.item.code)) {
    score += 8;
    reasons.push(`${input.item.label_ko} 유형에 직접 연결된 공식 자료`);
  }

  const matchedKeywords = card.applies_when_keywords.filter((keyword) => text.includes(normalizeText(keyword)));
  if (matchedKeywords.length) {
    score += matchedKeywords.length * 2;
    reasons.push(`입력 키워드 매칭: ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  if (input.channelFamily === "OFFICIAL_SAFETY_CIVIC" && card.source_id === safetyOverviewCardId) {
    score += 4;
    reasons.push("안전신문고 계열 생활불편의 기본 공식 도메인");
  }
  if (input.channelFamily === "OFFICIAL_SAFETY_CIVIC" && card.source_id === generalFlowCardId) {
    score += 2;
    reasons.push("사진·위치·신고내용 준비 흐름 안내");
  }
  if ((input.item?.code === "ILLEGAL_PARKING_SAFETY" || input.item?.code === "SCHOOL_ZONE_SAFETY") && card.source_id === illegalParkingCardId) {
    score += 6;
    reasons.push("불법 주정차 증거 요건을 좁혀 주는 핵심 카드");
  }
  if ((privacySignalPattern.test(text) || input.piiDetected) && isPrivacyCard(card)) {
    score += 5;
    reasons.push("공식 신고용 정보와 공개 공유용 정보 분리 필요");
  }

  return { card, score, reasons };
}

function buildActionCard(input: GroundingInput, sourceBasis: SourceBasis): ActionCard {
  const firstCard = sourceBasis.matched_cards[0];
  const officialDomain = firstCard?.official_domain ?? "공식 채널 확인";
  const actionCards = [...sourceBasis.matched_cards].sort(
    (a, b) => actionEvidencePriority(a.source_id) - actionEvidencePriority(b.source_id) || a.source_id.localeCompare(b.source_id)
  );
  const evidenceNow = uniqueStrings([
    ...(input.item?.evidence_required ?? []),
    ...(actionCards.flatMap((card) => card.evidence_points).slice(0, 4) ?? [])
  ]).slice(0, 5);
  const doNotShare = uniqueStrings([
    ...(input.item?.evidence_avoid ?? []),
    ...(actionCards.flatMap((card) => card.privacy_points).slice(0, 4) ?? [])
  ]).slice(0, 5);
  const sourceNames = sourceBasis.matched_cards.map((card) => card.source_name).slice(0, 3);
  const issueLabel = input.item?.label_ko ?? "생활불편";
  const isIllegalParking =
    input.item?.code === "ILLEGAL_PARKING_SAFETY" ||
    input.item?.code === "SCHOOL_ZONE_SAFETY" ||
    parkingSignalPattern.test(normalizeText(`${input.originalText} ${input.normalizedSafeText}`));

  return {
    headline: `${issueLabel}: 공식 근거 기반 다음 행동`,
    official_domain: officialDomain,
    next_action: input.item
      ? `먼저 공식 경로를 고르고, 접수 전 ${evidenceNow.slice(0, 3).join(", ")}를 준비하세요. 공개 공유용 문구는 식별정보를 뺀 별도 문장으로 작성하세요.`
      : "공식 채널에 넣을 수 있는 사실관계와 공개하면 안 되는 정보를 먼저 분리하세요.",
    evidence_now: evidenceNow,
    do_not_share: doNotShare.length ? doNotShare : ["실명", "연락처", "정밀 위치", "차량번호", "아동 얼굴"],
    official_routes: buildOfficialRoutes(input.channelFamily),
    legal_context: buildLegalContext({
      hasPrivacyRisk: privacySignalPattern.test(`${input.originalText} ${input.normalizedSafeText}`) || input.piiDetected,
      isIllegalParking
    }),
    source_summary: sourceNames.length ? `매칭된 공식 자료: ${sourceNames.join(" / ")}` : "아직 매칭된 공식 자료가 없습니다.",
    verification_note: sourceBasis.needs_official_verification
      ? "지역·접수 유형별 세부 요건은 달라질 수 있으므로 최종 접수 전 공식 채널에서 확인해야 합니다."
      : "사전 수집한 공식 source card 기준으로 정리했지만, 실제 접수·전송은 사용자가 공식 채널에서 직접 해야 합니다."
  };
}

function toBasisCard(card: SourceCard, reasons: string[]): SourceBasisCard {
  return {
    source_id: card.source_id,
    source_name: card.source_name,
    publisher: card.publisher,
    source_url: card.source_url,
    official_domain: card.official_domain,
    last_verified: card.last_verified,
    why_relevant: reasons.length ? reasons.join(" / ") : "공식 source card 키워드와 유형 기준으로 참고",
    evidence_points: card.evidence_requirements.slice(0, 3).map(localizeSourceText),
    privacy_points: card.privacy_notes.slice(0, 3).map(localizeSourceText),
    limitations: card.limitations.slice(0, 2).map(localizeSourceText)
  };
}

function isPrivacyCard(card: SourceCard): boolean {
  return card.source_type === "official_privacy_guidance" || card.source_type === "official_privacy_notice" || card.source_type === "law";
}

function priorityForCard(card: SourceCard): number {
  if (card.source_id === illegalParkingCardId) return 0;
  if (card.source_id === safetyOverviewCardId) return 1;
  if (card.source_id === generalFlowCardId) return 2;
  if (isPrivacyCard(card)) return 3;
  return 4;
}

function actionEvidencePriority(sourceId: string): number {
  if (sourceId === illegalParkingCardId) return 0;
  if (sourceId === generalFlowCardId) return 1;
  if (sourceId === vehiclePrivacyCardId) return 2;
  if (sourceId === petitionConfidentialityCardId) return 3;
  if (sourceId === safetyOverviewCardId) return 4;
  return 5;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function localizeSourceText(value: string): string {
  const exact: Record<string, string> = {
    "issue type": "신고 유형",
    "Use the issue-specific source cards for precise evidence requirements.": "세부 유형별 증거 요건 확인",
    "If no precise card exists, ask for factual location, observed time, issue description, and photo availability.": "정확한 위치, 관찰 시각, 문제 설명, 사진 가능 여부",
    "photo or video when available": "가능하면 사진 또는 영상",
    "location selected by GPS, map, or address": "GPS·지도·주소로 확인한 위치",
    "short factual report content": "짧고 사실적인 신고 내용",
    "two or more photos": "2장 이상 사진",
    "same or similar position and direction": "같거나 비슷한 위치·방향",
    "target vehicle and surrounding background identifiable": "대상 차량과 주변 배경이 식별되는 사진",
    "vehicle plate, location, and shooting time visible or inferable": "차량번호·위치·촬영시각 확인",
    "violation area identifiable": "위반 위치가 드러나는 사진",
    "vehicle number identifiable": "차량번호 확인",
    "shooting time visible": "촬영시각 확인",
    "Target vehicle plate may be official-only evidence.": "대상 차량번호는 공식 신고용 증거로만 사용하세요.",
    "Vehicle plate should be removed from public neighbor-share text.": "공개 공유문에는 차량번호를 넣지 마세요.",
    "Bystander faces and children in photos should not be publicly shared.": "행인 얼굴과 아동 얼굴은 공개하지 마세요.",
    "Do not publish vehicle plate in neighbor-share text.": "이웃 공유 글에는 차량번호를 공개하지 마세요.",
    "Be stricter when plate is combined with name, phone, apartment resident DB, unit, or location history.": "차량번호가 이름, 전화번호, 세대 정보, 동선과 결합될 때는 더 엄격히 가리세요.",
    "Do not expose reporter or bystander PII in public copy.": "신고자나 제3자 개인정보는 공개 문구에 넣지 마세요.",
    "Use official-only lane for target identifiers when the official domain requires them.": "공식 채널이 요구하는 대상 식별정보는 공식 신고용으로만 분리하세요.",
    "Photo guidance must distinguish official evidence from public sharing.": "사진은 공식 증거용과 공개 공유용을 구분하세요.",
    "Unrelated faces, private unit numbers, phone numbers, delivery labels, and home interiors should not be exposed publicly.": "무관한 얼굴, 동호수, 전화번호, 배송라벨, 집 내부는 공개하지 마세요.",
    "This overview provides category structure, not every local processing rule.": "이 자료는 큰 유형 기준이며 지역별 세부 처리 규칙 전체를 대신하지 않습니다.",
    "Local government processing details can differ.": "지역별 처리 기준은 다를 수 있습니다.",
    "Time gaps and accepted zones can differ by local category.": "사진 간격과 인정 구역은 지역·유형별로 달라질 수 있습니다."
  };
  if (exact[value]) return exact[value];
  if (value.includes("at least one minute")) return "일반 불법주정차 구역은 1분 이상 간격으로 촬영";
  if (value.includes("when vehicle is the report target")) return "대상 차량이면 차량번호를 공식 신고용으로 보관";
  if (value.includes("when vehicle is unrelated")) return "무관한 차량이면 제3자 식별정보로 보고 가리기";
  if (value.includes("same position and angle")) return "같은 위치·각도의 시간차 사진";
  if (value.includes("school-zone indication")) return "어린이보호구역 표시가 드러나는 사진";
  if (value.includes("official report can contain necessary facts")) return "공식 신고에는 처리에 필요한 사실을 포함할 수 있습니다.";
  if (value.includes("public neighbor-share copy should remove personal identifiers")) return "공개 공유문에서는 개인·대상 식별정보를 제거하세요.";
  if (value.includes("Do not conflate official submission content")) return "공식 제출 내용과 공개 커뮤니티 글을 동일하게 쓰지 마세요.";
  if (value.includes("Use public copy as a notice")) return "공개 글은 신고문 복사본이 아니라 일반 안내문으로 작성하세요.";
  if (value.includes("product-risk guidance")) return "이 자료는 제품 위험 완화용 기준이며 법률 자문이 아닙니다.";
  if (value.includes("does not decide which exact agency")) return "이 자료만으로 최종 담당 기관이 결정되지는 않습니다.";
  return value;
}
