export type PriorityLevel = "low" | "normal" | "quick" | "emergency_redirect";

export type ResultType =
  | "classification"
  | "emergency_redirect"
  | "needs_clarification"
  | "out_of_scope"
  | "error";

export type DraftResultType =
  | "draft"
  | "blocked_emergency"
  | "needs_more_facts"
  | "out_of_scope"
  | "error";

export type ChannelFamily =
  | "OFFICIAL_SAFETY_CIVIC"
  | "LOCAL_CIVIC_VERIFY"
  | "LOCAL_DEPARTMENT_VERIFY"
  | "MOBILITY_OPERATOR_VERIFY"
  | "EMERGENCY_DIRECT"
  | "NONE";

export interface TaxonomyItem {
  code: string;
  label_ko: string;
  group: string;
  keywords: string[];
  channel_family: ChannelFamily;
  priority: Exclude<PriorityLevel, "emergency_redirect">;
  evidence_required: string[];
  evidence_optional: string[];
  evidence_avoid: string[];
  request_phrase: string;
  caution: string[];
}

export interface SpecialCode {
  code: string;
  label_ko: string;
  draft_allowed: boolean;
}

export interface TaxonomyData {
  schema_version: string;
  taxonomy_size: number;
  items: TaxonomyItem[];
  special_codes: SpecialCode[];
}

export interface ChannelCandidate {
  label: string;
  why: string;
  verify_needed: boolean;
}

export interface ChannelMeta extends ChannelCandidate {
  routing_confidence: "general_only" | "medium" | "high";
}

export type ChannelsData = Record<ChannelFamily, ChannelMeta>;

export interface SafetyRules {
  emergency_triggers: Record<string, string[]>;
  emergency_messages: Record<string, string>;
  out_of_scope_keywords: string[];
  forbidden_phrases: string[];
  disclaimers: string[];
  photo_privacy_note: string;
  region_note: string;
}

export interface CopyRules {
  base_draft_template: string;
  neighbor_share_template: string;
  fallback_where: string;
  fallback_when: string;
  fallback_impact: string;
  short_problem_default: string;
}

export type SourceCardType =
  | "official_overview"
  | "official_guide"
  | "official_privacy_guidance"
  | "official_privacy_notice"
  | "local_government_guide"
  | "law";

export type SourceRefreshPriority = "monthly" | "quarterly";

export interface SourceCard {
  source_id: string;
  source_name: string;
  source_type: SourceCardType;
  publisher: string;
  source_url: string;
  last_verified: string;
  official_domain: string;
  applies_to_taxonomy_codes: string[];
  applies_when_keywords: string[];
  key_rules: string[];
  evidence_requirements: string[];
  privacy_notes: string[];
  routing_notes: string[];
  limitations: string[];
  refresh_priority: SourceRefreshPriority;
}

export interface SourceCardsData {
  schema_version: string;
  last_compiled: string;
  cards: SourceCard[];
}

export interface SourceBasisCard {
  source_id: string;
  source_name: string;
  publisher: string;
  source_url: string;
  official_domain: string;
  last_verified: string;
  why_relevant: string;
  evidence_points: string[];
  privacy_points: string[];
  limitations: string[];
}

export interface SourceBasis {
  matched_cards: SourceBasisCard[];
  source_card_count: number;
  source_strategy: string;
  needs_official_verification: boolean;
}

export interface OfficialRoute {
  priority: number;
  label: string;
  url: string | null;
  when: string;
  source_id: string;
}

export interface LegalContext {
  summary: string;
  source_id: string;
  source_url: string;
}

export interface ActionCard {
  headline: string;
  official_domain: string;
  next_action: string;
  evidence_now: string[];
  do_not_share: string[];
  official_routes: OfficialRoute[];
  legal_context: LegalContext[];
  source_summary: string;
  verification_note: string;
}

export interface ClassifyInput {
  description: string;
  region_hint?: string;
  where_hint?: string;
  has_photo?: boolean;
  category_hint?:
    | "road_walkway"
    | "public_facility"
    | "environment_sanitation"
    | "advertising_obstruction"
    | "safety_accessibility"
    | "parking_mobility"
    | "unknown";
  language?: "ko";
}

export interface SosError {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
}

export interface PresentationMock {
  version: string;
  card_type: "classification_card" | "draft_card" | "safety_redirect_card" | "share_vote_card" | "needs_clarification";
  headline: string;
  badges: string[];
  sections: Array<{ title: string; items?: string[]; text?: string }>;
  actions?: Array<Record<string, unknown>>;
  footer_notice: string;
}

export interface ClassificationOutput {
  ok: boolean;
  result_type: ResultType;
  issue: {
    code: string;
    label_ko: string;
    group: string;
  };
  confidence: number;
  alternatives: Array<{ code: string; label_ko: string; confidence: number }>;
  priority: {
    level: PriorityLevel;
    is_emergency: boolean;
    explanation: string;
  };
  routing: {
    channel_family: ChannelFamily;
    channel_candidates: ChannelCandidate[];
    verify_needed: boolean;
    routing_confidence: "general_only" | "medium" | "high";
    region_note: string;
  };
  evidence: {
    required: string[];
    optional: string[];
    avoid: string[];
  };
  source_basis: SourceBasis;
  action_card: ActionCard;
  safety: {
    pii_detected: boolean;
    masked_description: string;
    forbidden_claims_removed: string[];
    emergency_redirect: null | {
      label: string;
      numbers: string[];
      message: string;
    };
    notices: string[];
  };
  draft_policy: {
    can_draft: boolean;
    reason: string;
  };
  user_messages: {
    summary: string;
    next_action: string;
    clarifying_question: string | null;
  };
  presentation_mock: PresentationMock;
  errors: SosError[];
}

export interface DraftInput {
  issue_code: string;
  facts: {
    what: string;
    where_general?: string;
    when_observed?: string;
    impact?: string;
    photo_note?: string;
  };
  classification_snapshot?: Partial<ClassificationOutput>;
  target_channel_family?:
    | "OFFICIAL_SAFETY_CIVIC"
    | "LOCAL_CIVIC_VERIFY"
    | "LOCAL_DEPARTMENT_VERIFY"
    | "MOBILITY_OPERATOR_VERIFY"
    | "unknown";
  tone?: "neutral" | "formal" | "brief";
  include_neighbor_share_text?: boolean;
  language?: "ko";
}

export interface DraftOutput {
  ok: boolean;
  result_type: DraftResultType;
  draft: null | {
    title: string;
    body: string;
    copy_block: string;
    suggested_channel_label: string;
    evidence_checklist: string[];
    placeholders_to_fill: string[];
  };
  official_routes: OfficialRoute[];
  legal_context: LegalContext[];
  privacy_redactions: string[];
  share: {
    neighbor_text: string;
    private_note: string;
  };
  safety: {
    pii_detected: boolean;
    masked_fields: string[];
    neutralized_phrases: string[];
    disclaimers: string[];
    photo_privacy_note: string;
  };
  presentation_mock: PresentationMock;
  errors: SosError[];
}
