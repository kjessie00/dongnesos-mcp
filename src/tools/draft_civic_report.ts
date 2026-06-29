import type { DraftInput, DraftOutput } from "../types.js";
import { draftCivicReport } from "../core/draft.js";
import { formatLegalContext, formatOfficialRoutes } from "../core/officialGuidance.js";

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
  const shareText = output.share.neighbor_text ? `\n\n동네방 공개 공유문:\n${output.share.neighbor_text}` : "";
  const privacy = output.privacy_redactions.length ? `\n\n사진·개인정보 체크:\n- ${output.privacy_redactions.join("\n- ")}` : "";
  const legalContext = output.legal_context.length ? `\n\n법적·개인정보 맥락:\n${formatLegalContext(output.legal_context)}` : "";
  return [
    "아래 문구를 그대로 복사해 공식 채널에 제출할 수 있습니다. 자동 제출은 아닙니다.",
    "",
    "먼저 이용할 공식 경로:",
    formatOfficialRoutes(output.official_routes),
    "",
    "복사해서 붙여넣을 신고문:",
    output.draft.copy_block,
    shareText,
    privacy,
    legalContext,
    "\n동네SOS는 신고 준비 도구이며 실제 접수·전송은 하지 않습니다."
  ].join("\n");
}
