import type { ClassifyInput, ClassificationOutput } from "../types.js";
import { classifyCivicIssue } from "../core/classify.js";
import { formatLegalContext, formatOfficialRoutes } from "../core/officialGuidance.js";

export function runClassifyCivicIssue(input: ClassifyInput): ClassificationOutput {
  return classifyCivicIssue(input);
}

export function formatClassifySummary(output: ClassificationOutput): string {
  if (output.result_type === "emergency_redirect") {
    return `${output.issue.label_ko}: ${output.safety.emergency_redirect?.message ?? output.user_messages.summary}`;
  }
  if (output.result_type === "needs_clarification") {
    return output.user_messages.clarifying_question ?? output.user_messages.summary;
  }
  if (output.result_type === "out_of_scope") {
    return `${output.user_messages.summary} ${output.draft_policy.reason}`;
  }
  const legalContext = output.action_card.legal_context.length
    ? `\n\n법적·개인정보 맥락:\n${formatLegalContext(output.action_card.legal_context)}`
    : "";
  return [
    "공식 신고 준비가 가능합니다. 사용자는 아래 경로 중 맞는 곳에 직접 제출해야 합니다.",
    "",
    "먼저 이용할 공식 경로:",
    formatOfficialRoutes(output.action_card.official_routes),
    "",
    `바로 할 일: ${output.action_card.next_action}`,
    `준비할 증거: ${output.action_card.evidence_now.join(", ")}.`,
    `공개 동네방 글에서 빼야 할 정보: ${output.action_card.do_not_share.join(", ")}.${legalContext}`,
    "동네SOS는 신고 준비 도구이며 실제 접수·전송은 하지 않습니다."
  ].join("\n");
}
