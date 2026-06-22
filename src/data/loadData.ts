import channelsJson from "../../data/channels.json" with { type: "json" };
import copyRulesJson from "../../data/copy_rules.json" with { type: "json" };
import safetyRulesJson from "../../data/safety_rules.json" with { type: "json" };
import taxonomyJson from "../../data/taxonomy.json" with { type: "json" };

import type { ChannelsData, CopyRules, SafetyRules, TaxonomyData, TaxonomyItem } from "../types.js";

export const taxonomyData = taxonomyJson as TaxonomyData;
export const channelsData = channelsJson as ChannelsData;
export const safetyRules = safetyRulesJson as SafetyRules;
export const copyRules = copyRulesJson as CopyRules;

export function getTaxonomyItem(code: string): TaxonomyItem | undefined {
  return taxonomyData.items.find((item) => item.code === code);
}

export function assertDataIsValid(): void {
  const codes = new Set<string>();
  if (taxonomyData.taxonomy_size !== taxonomyData.items.length) {
    throw new Error(`taxonomy_size mismatch: expected ${taxonomyData.taxonomy_size}, got ${taxonomyData.items.length}`);
  }
  for (const item of taxonomyData.items) {
    if (codes.has(item.code)) {
      throw new Error(`duplicate taxonomy code: ${item.code}`);
    }
    codes.add(item.code);
    if (!channelsData[item.channel_family]) {
      throw new Error(`unknown channel family for ${item.code}: ${item.channel_family}`);
    }
    if (!item.keywords.length || !item.evidence_required.length || !item.request_phrase) {
      throw new Error(`incomplete taxonomy item: ${item.code}`);
    }
  }
  for (const code of Object.keys(safetyRules.emergency_triggers)) {
    if (!safetyRules.emergency_messages[code]) {
      throw new Error(`missing emergency message: ${code}`);
    }
  }
}
