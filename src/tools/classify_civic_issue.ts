import type { ClassifyInput, ClassificationOutput } from "../types.js";
import { classifyCivicIssue } from "../core/classify.js";

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
  return [
    `${output.issue.label_ko}으로 보입니다.`,
    `준비할 것: ${output.evidence.required.join(", ")}.`,
    `확인 채널: ${output.routing.channel_candidates.map((candidate) => candidate.label).join(" / ")}.`,
    "동네SOS는 신고 준비 도구이며 실제 접수·전송은 하지 않습니다."
  ].join(" ");
}
