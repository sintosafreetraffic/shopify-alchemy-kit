/**
 * Coach Preview Create Edge Function
 * 
 * Creates a 1-day preview plan for quiz completers (no purchase required).
 * Idempotent: returns existing preview if one exists for email.
 * No JWT required - public endpoint for quiz flow.
 * All writes via service role key.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import { generatePreviewPlan } from "../_shared/preview-plan-generator.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_id, quiz_data, persona_cluster } = await req.json();

    // Validate required inputs
    if (!email || typeof email !== "string") {
      return createErrorResponse("Email is required", 400);
    }
    if (!session_id || typeof session_id !== "string") {
      return createErrorResponse("Session ID is required", 400);
    }
    if (!quiz_data || typeof quiz_data !== "object") {
      return createErrorResponse("Quiz data is required", 400);
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return createErrorResponse("Invalid email format", 400);
    }

    console.log(`[coach-preview-create] Creating preview for: ${normalizedEmail}`);

    // Initialize Supabase with service role (no anon access)
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if preview already exists (idempotent)
    const { data: existing, error: lookupError } = await supabase
      .from("coach_preview_plans")
      .select("id, preview_plan, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("[coach-preview-create] Lookup error:", lookupError);
      return createErrorResponse("Database error", 500);
    }

    if (existing) {
      console.log(`[coach-preview-create] Returning existing preview for: ${normalizedEmail}`);
      return createSuccessResponse({
        preview_plan: existing.preview_plan,
        created_at: existing.created_at,
        was_existing: true,
      });
    }

    // Generate the 1-day preview plan
    const previewPlan = generatePreviewPlan({
      email: normalizedEmail,
      session_id,
      quiz_data,
      persona_cluster,
    });

    console.log(`[coach-preview-create] Generated preview plan with headline: ${previewPlan.planHeadline}`);

    // Insert new preview (unique index enforces 1 per email)
    const { data: inserted, error: insertError } = await supabase
      .from("coach_preview_plans")
      .insert({
        email: normalizedEmail,
        session_id,
        preview_plan: previewPlan,
      })
      .select("id, preview_plan, created_at")
      .single();

    if (insertError) {
      // Handle race condition - another request may have inserted
      if (insertError.code === "23505") {
        // Unique violation - fetch existing
        const { data: raceExisting } = await supabase
          .from("coach_preview_plans")
          .select("id, preview_plan, created_at")
          .eq("email", normalizedEmail)
          .single();

        if (raceExisting) {
          console.log(`[coach-preview-create] Race condition resolved, returning existing`);
          return createSuccessResponse({
            preview_plan: raceExisting.preview_plan,
            created_at: raceExisting.created_at,
            was_existing: true,
          });
        }
      }

      console.error("[coach-preview-create] Insert error:", insertError);
      return createErrorResponse("Failed to create preview", 500);
    }

    console.log(`[coach-preview-create] Created new preview: ${inserted.id}`);

    return createSuccessResponse({
      preview_plan: inserted.preview_plan,
      created_at: inserted.created_at,
      was_existing: false,
    });
  } catch (error) {
    console.error("[coach-preview-create] Error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});
