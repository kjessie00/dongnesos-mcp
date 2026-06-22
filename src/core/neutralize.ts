import { safetyRules } from "../data/loadData.js";

const replacements: Array<[RegExp, string]> = [
  [/([가-힣A-Za-z0-9_.-]{1,20})(이|가)\s*쓰레기(를)?\s*버렸[^\s.]*/g, "해당 위치에 무단투기로 보이는 쓰레기가 방치되어 있습니다"],
  [/([가-힣A-Za-z0-9_.-]{1,20})(이|가)\s*불법[^\s.]*/g, "해당 위치에 확인이 필요한 생활불편 상황이 관찰되었습니다"],
  [/처벌(받게|해|해\s?줘|해주세요)?/g, "현장 확인 후 필요한 조치 검토"],
  [/과태료(를)?\s*(부과|먹이|나오게)[^\s.]*/g, "필요한 조치 검토"],
  [/불법\s*확정/g, "확인 필요"],
  [/악덕\s*(업체|가게|사람)?/g, "해당 대상"],
  [/범인/g, "관련 대상"]
];

export interface NeutralizeResult {
  text: string;
  removed: string[];
}

export function neutralizeForbiddenClaims(input: string): NeutralizeResult {
  let text = input;
  const removed: string[] = [];
  for (const phrase of safetyRules.forbidden_phrases) {
    if (text.includes(phrase)) {
      removed.push("forbidden_phrase");
      text = text.split(phrase).join("확인 필요");
    }
  }
  for (const [regex, replacement] of replacements) {
    const before = text;
    text = text.replace(regex, replacement);
    if (before !== text) {
      removed.push("forbidden_pattern");
    }
  }
  return { text, removed: Array.from(new Set(removed)) };
}
