import type { ActionCard, ClassificationOutput, DraftOutput, PresentationMock, SourceBasis } from "../types.js";
import { issueLooksLike } from "./korean.js";

export function classificationCard(
  output: Pick<ClassificationOutput, "issue" | "priority" | "routing" | "evidence" | "draft_policy"> & {
    source_basis?: SourceBasis;
    action_card?: ActionCard;
  }
): PresentationMock {
  const officialEvidence = output.action_card
    ? [
        output.action_card.official_domain,
        output.action_card.source_summary,
        output.action_card.verification_note
      ]
    : [];
  const nextAction = output.action_card
    ? [output.action_card.next_action, ...output.action_card.evidence_now.slice(0, 3).map((item) => `확인: ${item}`)]
    : output.evidence.required;
  const privacyItems = output.action_card?.do_not_share.length ? output.action_card.do_not_share : output.evidence.avoid;

  return {
    version: "0.1",
    card_type: output.priority.is_emergency ? "safety_redirect_card" : "classification_card",
    headline: output.priority.is_emergency
      ? `${output.issue.label_ko}: 공식 긴급 채널에 직접 연락하세요`
      : issueLooksLike(output.issue.label_ko),
    badges: [
      output.issue.group,
      output.priority.level === "quick" ? "빠른 접수 준비 권장" : output.priority.level === "low" ? "낮은 우선도" : "신고 준비용",
      output.routing.verify_needed ? "확인 필요" : "긴급"
    ],
    sections: [
      {
        title: output.priority.is_emergency ? "안전 안내" : "추천 확인 채널",
        items: output.routing.channel_candidates.map((candidate) => candidate.label)
      },
      {
        title: "공식 근거",
        items: officialEvidence
      },
      {
        title: "지금 할 일",
        items: nextAction
      },
      {
        title: "공개하지 말 것",
        items: privacyItems
      }
    ],
    actions: output.draft_policy.can_draft
      ? [
          {
            type: "next_tool",
            label: "초안 만들기",
            tool: "draft_civic_report",
            requires_user_action: true
          }
        ]
      : [],
    footer_notice: "동네SOS는 실제 접수·전송을 하지 않는 신고 준비 도구입니다."
  };
}

export function draftCard(output: Pick<DraftOutput, "draft" | "result_type">): PresentationMock {
  if (!output.draft) {
    return {
      version: "0.1",
      card_type: "safety_redirect_card",
      headline: "초안 생성이 차단됐습니다",
      badges: ["안전 우선", "직접 연락 필요"],
      sections: [{ title: "이유", text: output.result_type }],
      actions: [],
      footer_notice: "긴급하거나 즉시 위험한 상황은 신고 준비 초안보다 공식 긴급 채널 직접 연락이 우선입니다."
    };
  }

  return {
    version: "0.1",
    card_type: "draft_card",
    headline: "복붙용 초안이 준비됐습니다",
    badges: ["신고 준비용", "직접 접수 필요", "확인 필요"],
    sections: [
      { title: "제목", text: output.draft.title },
      { title: "체크리스트", items: output.draft.evidence_checklist }
    ],
    actions: [
      {
        type: "copy_mock",
        label: "초안 복사",
        value_ref: "draft.copy_block",
        requires_user_action: true
      }
    ],
    footer_notice: "자동 접수나 자동 전송은 하지 않습니다."
  };
}
