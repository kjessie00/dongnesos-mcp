import { sourceCardsData } from "../data/loadData.js";
import type { ChannelFamily, LegalContext, OfficialRoute } from "../types.js";

const safetyReportCardId = "mois_safetyreport_domains";
const illegalParkingCardId = "safetyreport_illegal_parking_basic";
const epeopleCardId = "epeople_general_petition_intro";
const vehiclePrivacyCardId = "pipc_vehicle_plate_personal_info";
const privacyActCardId = "privacy_act_article_15_basis";
const petitionConfidentialityCardId = "petition_act_article_7_confidentiality";

export function buildOfficialRoutes(channelFamily: ChannelFamily): OfficialRoute[] {
  if (channelFamily === "EMERGENCY_DIRECT" || channelFamily === "NONE") {
    return [];
  }

  return [
    {
      priority: 1,
      label: "안전신문고",
      url: sourceUrl(safetyReportCardId),
      when: "안전 위험, 불법 주정차, 차량·교통 위반, 생활불편 신고의 우선 공식 경로",
      source_id: safetyReportCardId
    },
    {
      priority: 2,
      label: "국민신문고 일반민원",
      url: sourceUrl(epeopleCardId),
      when: "담당 기관이 애매하거나 안전신문고 경로가 맞는지 불확실할 때의 일반 민원 경로",
      source_id: epeopleCardId
    },
    {
      priority: 3,
      label: "지역/구청 공식 생활민원 페이지 직접 선택",
      url: null,
      when: "사용자가 지역을 알고 있어 해당 지자체 공식 페이지에서 직접 접수처를 고를 때. 지역이 없으면 구체 URL을 추정하지 않음",
      source_id: epeopleCardId
    }
  ];
}

export function buildLegalContext(options: { hasPrivacyRisk?: boolean; isIllegalParking?: boolean }): LegalContext[] {
  const contexts: LegalContext[] = [];

  if (options.isIllegalParking) {
    contexts.push({
      summary:
        "불법 주정차 신고는 채널·지역별 세부 기준이 다를 수 있으며, 같은 위치나 비슷한 방향에서 시간 간격을 두고 찍은 2장 이상의 사진이 요구될 수 있습니다.",
      source_id: illegalParkingCardId,
      source_url: sourceUrl(illegalParkingCardId)
    });
  }

  if (options.hasPrivacyRisk || options.isIllegalParking) {
    contexts.push(
      {
        summary:
          "차량번호는 공식 신고용 사실관계로 필요할 수 있지만, 다른 정보와 결합되면 개인정보가 될 수 있어 공개 동네방 글에는 넣지 않는 편이 안전합니다.",
        source_id: vehiclePrivacyCardId,
        source_url: sourceUrl(vehiclePrivacyCardId)
      },
      {
        summary:
          "공개 공유문에서는 얼굴, 전화번호, 정확한 주소·호수처럼 목적에 필요하지 않은 식별정보를 빼고 최소한의 정보만 사용하세요.",
        source_id: privacyActCardId,
        source_url: sourceUrl(privacyActCardId)
      },
      {
        summary:
          "공식 민원 제출 내용과 공개 커뮤니티 글은 목적이 다르므로 같은 본문을 그대로 공개하지 않는 것이 안전합니다.",
        source_id: petitionConfidentialityCardId,
        source_url: sourceUrl(petitionConfidentialityCardId)
      }
    );
  }

  return uniqueBySource(contexts);
}

export function formatOfficialRoutes(routes: OfficialRoute[]): string {
  if (!routes.length) return "공식 긴급 채널을 직접 이용하세요.";
  return routes
    .map((route) => {
      const link = route.url ? ` (${route.url})` : "";
      return `${route.priority}. ${route.label}${link}: ${route.when}`;
    })
    .join("\n");
}

export function formatLegalContext(contexts: LegalContext[]): string {
  return contexts.map((context) => `${context.summary} [${context.source_id}] ${context.source_url}`).join("\n");
}

function sourceUrl(sourceId: string): string {
  return sourceCardsData.cards.find((card) => card.source_id === sourceId)?.source_url ?? "";
}

function uniqueBySource(contexts: LegalContext[]): LegalContext[] {
  const seen = new Set<string>();
  return contexts.filter((context) => {
    if (seen.has(context.source_id)) return false;
    seen.add(context.source_id);
    return true;
  });
}
