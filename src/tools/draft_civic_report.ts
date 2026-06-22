import type { DraftInput, DraftOutput } from "../types.js";
import { draftCivicReport } from "../core/draft.js";

export function runDraftCivicReport(input: DraftInput): DraftOutput {
  return draftCivicReport(input);
}

export function formatDraftSummary(output: DraftOutput): string {
  if (output.result_type === "blocked_emergency") {
    return output.errors[0]?.message ?? "긴급 또는 즉시 위험 가능성이 있어 초안 생성을 차단했습니다.";
  }
  if (!output.draft) {
    return output.errors[0]?.message ?? "초안을 만들 수 없습니다.";
  }
  return [
    "복붙용 신고 준비 초안이 준비됐습니다.",
    `제목: ${output.draft.title}`,
    "실제 접수는 사용자가 공식 채널에서 직접 진행해야 합니다."
  ].join(" ");
}
