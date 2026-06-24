import { normalizeText } from "./normalize.js";

export interface MaskResult {
  text: string;
  detected: boolean;
  maskedFields: string[];
}

const patterns: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: "phone",
    regex: /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    replacement: "[전화번호 비공개]"
  },
  {
    name: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[이메일 비공개]"
  },
  {
    name: "resident_id_pattern",
    regex: /\b\d{6}[-\s]?[1-4]\d{6}\b/g,
    replacement: "[주민번호 패턴 비공개]"
  },
  {
    name: "unit_address",
    regex: /\d{1,4}\s?동\s?\d{1,4}\s?호(?![A-Za-z0-9가-힣])/g,
    replacement: "[동호수 비공개]"
  },
  {
    name: "unit_address",
    regex: /(?<![A-Za-z0-9가-힣])\d{1,4}\s?호(?![A-Za-z0-9가-힣])/g,
    replacement: "[동호수 비공개]"
  },
  {
    name: "vehicle_plate",
    regex: /\b\d{2,3}\s?[가-힣]\s?\d{4}\b/g,
    replacement: "[차량정보 비공개]"
  },
  {
    name: "card_number_pattern",
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[카드번호 패턴 비공개]"
  },
  {
    name: "precise_coordinates",
    regex: /\b3[3-8]\.\d{3,}\s*,\s*12[4-9]\.\d{3,}\b/g,
    replacement: "[정밀 위치 비공개]"
  },
  {
    name: "masked_person_name",
    regex: /[가-힣]{1,4}OO/g,
    replacement: "[실명 비공개]"
  }
];

export function maskPii(input: string): MaskResult {
  let text = normalizeText(input);
  const maskedFields: string[] = [];
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      maskedFields.push(pattern.name);
      text = text.replace(pattern.regex, pattern.replacement);
    }
    pattern.regex.lastIndex = 0;
  }
  return {
    text,
    detected: maskedFields.length > 0,
    maskedFields
  };
}

export function assertNoRawPii(text: string): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      found.push(pattern.name);
    }
    pattern.regex.lastIndex = 0;
  }
  return found;
}
