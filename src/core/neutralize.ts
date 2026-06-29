import { safetyRules } from "../data/loadData.js";

const replacements: Array<[RegExp, string]> = [
  [/([가-힣A-Za-z0-9_.-]{1,20})(이|가)\s*쓰레기(를)?\s*버렸[^\s.]*/g, "해당 위치에 무단투기로 보이는 쓰레기가 방치되어 있습니다"],
  [/([가-힣A-Za-z0-9_.-]{1,20})(이|가)\s*불법(?!\s*주정차)[^\s.]*/g, "해당 위치에 확인이 필요한 생활불편 상황이 관찰되었습니다"],
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
      text = text.split(phrase).join(replacementForForbiddenPhrase(phrase));
    }
  }
  for (const [regex, replacement] of replacements) {
    const before = text;
    text = text.replace(regex, replacement);
    if (before !== text) {
      removed.push("forbidden_pattern");
    }
  }
  return { text: polishNeutralizedText(text), removed: Array.from(new Set(removed)) };
}

function replacementForForbiddenPhrase(phrase: string): string {
  if (phrase.includes("불법 확정")) {
    return "사실관계 확인이 필요한 사안";
  }
  if (phrase.includes("처벌")) {
    return "현장 확인 후 필요한 조치 검토";
  }
  if (phrase.includes("과태료")) {
    return "필요한 조치 검토";
  }
  return "중립적 표현";
}

function polishNeutralizedText(text: string): string {
  return text
    .replace(/사실관계 확인이 필요한 사안(이니|이라서|이라|이라고|으로)?/g, "사실관계 확인이 필요한 사안으로")
    .replace(/\S+이 사실관계 확인이 필요한 사안으로/g, "해당 사안은 사실관계 확인이 필요하며")
    .replace(/현장 확인 후 필요한 조치 검토(받게|해\s?줘|해주세요|해)?/g, "현장 확인 후 필요한 조치 검토")
    .replace(/현장 확인 후 필요한 조치 검토\s*주세요/g, "현장 확인 후 필요한 조치 검토")
    .replace(/현장 확인 후 필요한 조치 검토\s*(신고문|문구|초안)?\s*(써줘|작성해줘|만들어줘)?/g, "현장 확인 후 필요한 조치 검토")
    .replace(/필요한 조치 검토(를)?\s*(부과|먹이|나오게)?/g, "필요한 조치 검토")
    .replace(/검토(?=신고문|문구|초안)/g, "검토 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
