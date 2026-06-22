import { safetyRules } from "../data/loadData.js";
import { includesAny, normalizeText } from "./normalize.js";

export interface EmergencyMatch {
  code: string;
  label_ko: string;
  message: string;
  numbers: string[];
}

const labels: Record<string, string> = {
  EMERGENCY_GAS: "가스 누출 의심",
  EMERGENCY_FIRE: "화재·연기",
  EMERGENCY_INJURY: "부상·응급",
  EMERGENCY_POWER: "전기·감전 위험",
  EMERGENCY_POLICE: "범죄·즉각 위협",
  EMERGENCY_IMMEDIATE_DANGER: "붕괴·침수·개방 맨홀 등 즉시 위험"
};

export function detectEmergency(input: string): EmergencyMatch | null {
  const text = normalizeText(input);
  for (const [code, terms] of Object.entries(safetyRules.emergency_triggers)) {
    if (includesAny(text, terms)) {
      return {
        code,
        label_ko: labels[code] ?? "긴급 가능성",
        message: safetyRules.emergency_messages[code] ?? safetyRules.disclaimers[3],
        numbers: code === "EMERGENCY_POLICE" ? ["112"] : code === "EMERGENCY_GAS" ? ["119"] : ["112", "119"]
      };
    }
  }
  return null;
}

export function isEmergencyCode(code: string): boolean {
  return code.startsWith("EMERGENCY_");
}
