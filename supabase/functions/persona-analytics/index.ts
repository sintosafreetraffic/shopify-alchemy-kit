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

const experimentExposureSchema = z.object({
  event_type: z.literal("persona_experiment_exposure"),
  experiment_key: z.string().max(100),
  variant: z.enum(["A", "B", "C"]),
  persona_cluster: z.string().max(50),
  core_need: z.string().max(50),
  persona_confidence: z.number().min(0).max(100).optional(),
});

const lpExposureSchema = z.object({
  event_type: z.literal("persona_lp_exposure"),
  persona_cluster: z.string().max(50),
  core_need: z.string().max(50),
  is_cached_assessment: z.boolean(),
  referrer: z.string().max(500).optional(),
  persona_confidence: z.number().min(0).max(100).optional(),
});

const moduleInteractionSchema = z.object({
  event_type: z.literal("coach_module_interaction"),
  module_id: z.number().min(1).max(20),
  interaction_type: z.enum(["view", "start", "complete", "skip"]),
  persona_cluster: z.string().max(50),
  relevance_score: z.number().min(0).max(100).optional(),
});

// Coach plan analytics events
const coachPlanViewedSchema = z.object({
  event_type: z.literal("coach_plan_viewed"),
  plan_id: z.string().max(100),
  plan_age_days: z.number().min(0),
  has_today_actions: z.boolean(),
  persona_cluster: z.string().max(50),
  coach_readiness_label: z.string().max(50),
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachPlanDayOpenedSchema = z.object({
  event_type: z.literal("coach_plan_day_opened"),
  plan_id: z.string().max(100),
  day_index: z.number().min(0).max(7),
  persona_cluster: z.string().max(50),
  coach_readiness_label: z.string().max(50),
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachTodayActionsMarkedSchema = z.object({
  event_type: z.literal("coach_today_actions_marked"),
  plan_id: z.string().max(100),
  actions_completed: z.number().min(0),
  total_actions: z.number().min(0),
  persona_cluster: z.string().max(50),
  coach_readiness_label: z.string().max(50),
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const coachPlanRefreshedSchema = z.object({
  event_type: z.literal("coach_plan_refreshed"),
  refresh_reason: z.string().max(100),
  previous_spine_score: z.number().nullable(),
  new_spine_score: z.number().nullable(),
  persona_cluster: z.string().max(50),
  coach_readiness_label: z.string().max(50),
  spine_score_bucket: z.enum(["0-49", "50-69", "70+"]),
});

const eventSchema = z.discriminatedUnion("event_type", [
  experimentExposureSchema,
  lpExposureSchema,
  moduleInteractionSchema,
  coachPlanViewedSchema,
  coachPlanDayOpenedSchema,
  coachTodayActionsMarkedSchema,
  coachPlanRefreshedSchema,
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
      console.error("[persona-analytics] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
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
