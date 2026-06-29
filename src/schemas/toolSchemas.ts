import { z } from "zod";

const PriorityLevelSchema = z.enum(["low", "normal", "quick", "emergency_redirect"]);
const ChannelFamilySchema = z.enum([
  "OFFICIAL_SAFETY_CIVIC",
  "LOCAL_CIVIC_VERIFY",
  "LOCAL_DEPARTMENT_VERIFY",
  "MOBILITY_OPERATOR_VERIFY",
  "EMERGENCY_DIRECT",
  "NONE"
]);

const SosErrorSchema = z
  .object({
    code: z.string(),
    severity: z.enum(["info", "warning", "blocking"]),
    message: z.string()
  })
  .strict();

const PresentationMockSchema = z
  .object({
    version: z.string(),
    card_type: z.enum(["classification_card", "draft_card", "safety_redirect_card", "share_vote_card", "needs_clarification"]),
    headline: z.string(),
    badges: z.array(z.string()),
    sections: z.array(
      z
        .object({
          title: z.string(),
          items: z.array(z.string()).optional(),
          text: z.string().optional()
        })
        .strict()
    ),
    actions: z.array(z.record(z.unknown())).optional(),
    footer_notice: z.string()
  })
  .strict();

const SourceBasisCardSchema = z
  .object({
    source_id: z.string(),
    source_name: z.string(),
    publisher: z.string(),
    source_url: z.string().url(),
    official_domain: z.string(),
    last_verified: z.string(),
    why_relevant: z.string(),
    evidence_points: z.array(z.string()),
    privacy_points: z.array(z.string()),
    limitations: z.array(z.string())
  })
  .strict();

const SourceBasisSchema = z
  .object({
    matched_cards: z.array(SourceBasisCardSchema),
    source_card_count: z.number().int().nonnegative(),
    source_strategy: z.string(),
    needs_official_verification: z.boolean()
  })
  .strict();

const ActionCardSchema = z
  .object({
    headline: z.string(),
    official_domain: z.string(),
    next_action: z.string(),
    evidence_now: z.array(z.string()),
    do_not_share: z.array(z.string()),
    source_summary: z.string(),
    verification_note: z.string()
  })
  .strict();

export const ClassifyInputSchema = z
  .object({
    description: z.string().min(2).max(1500),
    region_hint: z.string().max(80).optional(),
    where_hint: z.string().max(160).optional(),
    has_photo: z.boolean().default(false).optional(),
    category_hint: z
      .enum([
        "road_walkway",
        "public_facility",
        "environment_sanitation",
        "advertising_obstruction",
        "safety_accessibility",
        "parking_mobility",
        "unknown"
      ])
      .default("unknown")
      .optional(),
    language: z.literal("ko").default("ko").optional()
  })
  .strict();

export const ClassificationOutputSchema = z
  .object({
    ok: z.boolean(),
    result_type: z.enum(["classification", "emergency_redirect", "needs_clarification", "out_of_scope", "error"]),
    issue: z
      .object({
        code: z.string(),
        label_ko: z.string(),
        group: z.string()
      })
      .strict(),
    confidence: z.number().min(0).max(1),
    alternatives: z.array(
      z
        .object({
          code: z.string(),
          label_ko: z.string(),
          confidence: z.number().min(0).max(1)
        })
        .strict()
    ),
    priority: z
      .object({
        level: PriorityLevelSchema,
        is_emergency: z.boolean(),
        explanation: z.string()
      })
      .strict(),
    routing: z
      .object({
        channel_family: ChannelFamilySchema,
        channel_candidates: z.array(
          z
            .object({
              label: z.string(),
              why: z.string(),
              verify_needed: z.boolean()
            })
            .strict()
        ),
        verify_needed: z.boolean(),
        routing_confidence: z.enum(["general_only", "medium", "high"]),
        region_note: z.string()
      })
      .strict(),
    evidence: z
      .object({
        required: z.array(z.string()),
        optional: z.array(z.string()),
        avoid: z.array(z.string())
      })
      .strict(),
    source_basis: SourceBasisSchema,
    action_card: ActionCardSchema,
    safety: z
      .object({
        pii_detected: z.boolean(),
        masked_description: z.string(),
        forbidden_claims_removed: z.array(z.string()),
        emergency_redirect: z
          .object({
            label: z.string(),
            numbers: z.array(z.string()),
            message: z.string()
          })
          .strict()
          .nullable(),
        notices: z.array(z.string())
      })
      .strict(),
    draft_policy: z
      .object({
        can_draft: z.boolean(),
        reason: z.string()
      })
      .strict(),
    user_messages: z
      .object({
        summary: z.string(),
        next_action: z.string(),
        clarifying_question: z.string().nullable()
      })
      .strict(),
    presentation_mock: PresentationMockSchema,
    errors: z.array(SosErrorSchema)
  })
  .strict();

export const DraftInputSchema = z
  .object({
    issue_code: z.string().min(2),
    facts: z
      .object({
        what: z.string().min(2).max(800),
        where_general: z.string().max(160).optional(),
        when_observed: z.string().max(80).optional(),
        impact: z.string().max(300).optional(),
        photo_note: z.string().max(200).optional()
      })
      .strict(),
    classification_snapshot: z.record(z.unknown()).optional(),
    target_channel_family: z
      .enum(["OFFICIAL_SAFETY_CIVIC", "LOCAL_CIVIC_VERIFY", "LOCAL_DEPARTMENT_VERIFY", "MOBILITY_OPERATOR_VERIFY", "unknown"])
      .default("unknown")
      .optional(),
    tone: z.enum(["neutral", "formal", "brief"]).default("neutral").optional(),
    include_neighbor_share_text: z.boolean().default(true).optional(),
    language: z.literal("ko").default("ko").optional()
  })
  .strict();

export const DraftOutputSchema = z
  .object({
    ok: z.boolean(),
    result_type: z.enum(["draft", "blocked_emergency", "needs_more_facts", "out_of_scope", "error"]),
    draft: z
      .object({
        title: z.string(),
        body: z.string(),
        copy_block: z.string(),
        suggested_channel_label: z.string(),
        evidence_checklist: z.array(z.string()),
        placeholders_to_fill: z.array(z.string())
      })
      .strict()
      .nullable(),
    share: z
      .object({
        neighbor_text: z.string(),
        private_note: z.string()
      })
      .strict(),
    safety: z
      .object({
        pii_detected: z.boolean(),
        masked_fields: z.array(z.string()),
        neutralized_phrases: z.array(z.string()),
        disclaimers: z.array(z.string()),
        photo_privacy_note: z.string()
      })
      .strict(),
    presentation_mock: PresentationMockSchema,
    errors: z.array(SosErrorSchema)
  })
  .strict();
