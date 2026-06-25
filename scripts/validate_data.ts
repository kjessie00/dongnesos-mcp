import { assertDataIsValid, sourceCardsData, taxonomyData } from "../src/data/loadData.js";

assertDataIsValid();

if (taxonomyData.items.length !== 28) {
  throw new Error(`Expected exactly 28 taxonomy items, got ${taxonomyData.items.length}`);
}

const requiredSpecialCodes = [
  "UNCLEAR",
  "OUT_OF_SCOPE",
  "EMERGENCY_GAS",
  "EMERGENCY_FIRE",
  "EMERGENCY_INJURY",
  "EMERGENCY_POWER",
  "EMERGENCY_POLICE",
  "EMERGENCY_IMMEDIATE_DANGER"
];

for (const code of requiredSpecialCodes) {
  if (!taxonomyData.special_codes.some((item) => item.code === code)) {
    throw new Error(`Missing special code: ${code}`);
  }
}

console.log(`Data OK: ${taxonomyData.items.length} taxonomy items, ${taxonomyData.special_codes.length} special codes.`);
console.log(`Source cards OK: ${sourceCardsData.cards.length} official source cards.`);
