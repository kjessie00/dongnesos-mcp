import channelsJson from "../../data/channels.json" with { type: "json" };
import copyRulesJson from "../../data/copy_rules.json" with { type: "json" };
import safetyRulesJson from "../../data/safety_rules.json" with { type: "json" };
import sourceCardsJson from "../../data/source_cards.json" with { type: "json" };
import taxonomyJson from "../../data/taxonomy.json" with { type: "json" };

import type { ChannelsData, CopyRules, SafetyRules, SourceCardsData, TaxonomyData, TaxonomyItem } from "../types.js";

export const taxonomyData = taxonomyJson as TaxonomyData;
export const channelsData = channelsJson as ChannelsData;
export const safetyRules = safetyRulesJson as SafetyRules;
export const copyRules = copyRulesJson as CopyRules;
export const sourceCardsData = sourceCardsJson as SourceCardsData;

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
  const sourceIds = new Set<string>();
  if (!sourceCardsData.cards.length) {
    throw new Error("source_cards must not be empty");
  }
  for (const card of sourceCardsData.cards) {
    if (sourceIds.has(card.source_id)) {
      throw new Error(`duplicate source card id: ${card.source_id}`);
    }
    sourceIds.add(card.source_id);
    if (!/^https:\/\//.test(card.source_url)) {
      throw new Error(`source card must use https URL: ${card.source_id}`);
    }
    if (!card.source_name || !card.publisher || !card.official_domain) {
      throw new Error(`incomplete source card metadata: ${card.source_id}`);
    }
    if (!card.key_rules.length || !card.evidence_requirements.length || !card.privacy_notes.length || !card.limitations.length) {
      throw new Error(`incomplete source card content: ${card.source_id}`);
    }
    for (const code of card.applies_to_taxonomy_codes) {
      if (!codes.has(code)) {
        throw new Error(`source card ${card.source_id} references unknown taxonomy code: ${code}`);
      }
    }
  }
}
