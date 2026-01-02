/**
 * Persona Analytics Edge Function
 * 
 * Server-side logging for persona experiments, landing page exposures,
 * and coach module interactions.
 * 
 * No PIIs stored - only anonymized persona + event data.
 * 
 * Events logged:
 * - persona_experiment_exposure: When a user sees an experiment variant
 * - persona_lp_exposure: When a user views a persona landing page
 * - coach_module_interaction: When a user interacts with a coach module
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

// ============ INPUT VALIDATION ============

// Nullable string helper for persona fields that may be null
const nullableString = z.string().max(50).nullable();

const experimentExposureSchema = z.object({
  event_type: z.literal("persona_experiment_exposure"),
  experiment_key: z.string().max(100),
  variant: z.enum(["A", "B", "C"]),
  persona_cluster: nullableString,
  core_need: nullableString,
  persona_confidence: z.number().min(0).max(100).nullable().optional(),
});

const lpExposureSchema = z.object({
  event_type: z.literal("persona_lp_exposure"),
  persona_cluster: nullableString,
  core_need: nullableString,
  is_cached_assessment: z.boolean(),
  referrer: z.string().max(500).optional(),
  persona_confidence: z.number().min(0).max(100).nullable().optional(),
});

const moduleInteractionSchema = z.object({
  event_type: z.literal("coach_module_interaction"),
  module_id: z.number().min(1).max(20),
  interaction_type: z.enum(["view", "start", "complete", "skip"]),
  persona_cluster: nullableString,
  relevance_score: z.number().min(0).max(100).nullable().optional(),
});

// Coach plan analytics events
const coachPlanViewedSchema = z.object({
  event_type: z.literal("coach_plan_viewed"),
  plan_id: z.string().max(100),
  plan_age_days: z.number().min(0),
  has_today_actions: z.boolean(),
  persona_cluster: nullableString,
  coach_readiness_label: nullableString,
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachPlanDayOpenedSchema = z.object({
  event_type: z.literal("coach_plan_day_opened"),
  plan_id: z.string().max(100),
  day_index: z.number().min(0).max(7),
  persona_cluster: nullableString,
  coach_readiness_label: nullableString,
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachTodayActionsMarkedSchema = z.object({
  event_type: z.literal("coach_today_actions_marked"),
  plan_id: z.string().max(100),
  actions_completed: z.number().min(0),
  total_actions: z.number().min(0),
  persona_cluster: nullableString,
  coach_readiness_label: nullableString,
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachPlanRefreshedSchema = z.object({
  event_type: z.literal("coach_plan_refreshed"),
  refresh_reason: z.string().max(100),
  previous_spine_score: z.number().nullable(),
  new_spine_score: z.number().nullable(),
  persona_cluster: nullableString,
  coach_readiness_label: nullableString,
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

// Revenue attribution events (add to cart, checkout, purchase)
const revenueAttributionSchema = z.object({
  event_type: z.literal("revenue_attribution"),
  event: z.enum(["add_to_cart", "begin_checkout", "purchase"]),
  persona_cluster: nullableString,
  persona_confidence: z.number().nullable().optional(),
  core_need: nullableString,
  coach_readiness_score: z.number().nullable().optional(),
  persona_experiment_variants: z.record(z.string()).optional(),
  product_recommendation_used: z.boolean(),
  product_id: z.string().max(100),
  product_title: z.string().max(200),
  value: z.number().min(0),
  currency: z.string().max(10),
  quantity: z.number().min(1),
  timestamp: z.string(),
  session_id: z.string().max(100),
});

// Experiment view events
const experimentViewSchema = z.object({
  event_type: z.literal("experiment_view"),
  experimentKey: z.string().max(100),
  variant: z.string().max(50),
  persona_cluster: nullableString,
  persona_confidence: z.number().nullable().optional(),
  core_need: nullableString,
  coach_readiness_score: z.number().nullable().optional(),
  source: z.enum(["quiz_results_hero", "coach_hero", "persona_lp", "home_hero", "custom"]),
  timestamp: z.string(),
  session_id: z.string().max(100),
});

// Hero variant A/B exposure event
const heroVariantExposureSchema = z.object({
  event_type: z.literal("hero_variant_exposure"),
  variant: z.enum(["posture", "science", "recovery"]),
  persona_cluster: nullableString,
  page_path: z.string().max(200),
});

const eventSchema = z.discriminatedUnion("event_type", [
  experimentExposureSchema,
  lpExposureSchema,
  moduleInteractionSchema,
  coachPlanViewedSchema,
  coachPlanDayOpenedSchema,
  coachTodayActionsMarkedSchema,
  coachPlanRefreshedSchema,
  revenueAttributionSchema,
  experimentViewSchema,
  heroVariantExposureSchema,
]);

const requestSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
  session_id: z.string().max(100).optional(),
});

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  try {
    const rawBody = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        received: e.code,
      }));
      console.error("[persona-analytics] Validation error:", JSON.stringify(errorDetails, null, 2));
      console.error("[persona-analytics] Received payload:", JSON.stringify(rawBody, null, 2));
      return createErrorResponse(`Invalid input: ${errorDetails.map(e => `${e.path}: ${e.message}`).join('; ')}`, 400);
    }

    const { events, session_id } = parseResult.data;
    const timestamp = new Date().toISOString();

    // Log to console for monitoring (no PIIs)
    console.log(`[persona-analytics] Received ${events.length} events`, {
      session_id: session_id?.substring(0, 8) || "anonymous",
      event_types: events.map(e => e.event_type),
    });

    // Prepare analytics records
    const records = events.map((event) => ({
      ...event,
      session_id: session_id || null,
      created_at: timestamp,
    }));

    // Log each event for debugging (structured logging for analysis)
    for (const record of records) {
      console.log(`[persona-analytics] Event:`, JSON.stringify({
        event_type: record.event_type,
        persona_cluster: record.persona_cluster,
        ...(record.event_type === "persona_experiment_exposure" && {
          experiment_key: record.experiment_key,
          variant: record.variant,
          persona_confidence: record.persona_confidence,
        }),
        ...(record.event_type === "persona_lp_exposure" && {
          is_cached_assessment: record.is_cached_assessment,
          persona_confidence: record.persona_confidence,
        }),
        ...(record.event_type === "coach_module_interaction" && {
          module_id: record.module_id,
          interaction_type: record.interaction_type,
          relevance_score: record.relevance_score,
        }),
        timestamp: record.created_at,
      }));
    }

    // Future: Insert to analytics table when ready
    // const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    // const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    // const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // await supabase.from('persona_analytics').insert(records);

    return createSuccessResponse({
      success: true,
      events_logged: events.length,
    });
  } catch (error) {
    console.error("[persona-analytics] Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
