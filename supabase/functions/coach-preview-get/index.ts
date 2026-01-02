/**
 * Coach Preview Get Edge Function
 * 
 * Retrieves existing preview plan for a quiz completer.
 * No JWT required - validates session_id matches stored value.
 * All access via service role key.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_id } = await req.json();

    // Validate required inputs
    if (!email || typeof email !== "string") {
      return createErrorResponse("Email is required", 400);
    }
    if (!session_id || typeof session_id !== "string") {
      return createErrorResponse("Session ID is required", 400);
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return createErrorResponse("Invalid email format", 400);
    }

    console.log(`[coach-preview-get] Looking up preview for: ${normalizedEmail}`);

    // Initialize Supabase with service role (no anon access)
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up existing preview
    const { data: preview, error } = await supabase
      .from("coach_preview_plans")
      .select("id, email, session_id, preview_plan, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[coach-preview-get] Database error:", error);
      return createErrorResponse("Database error", 500);
    }

    if (!preview) {
      console.log(`[coach-preview-get] No preview found for: ${normalizedEmail}`);
      return createSuccessResponse({ exists: false });
    }

    // Validate session_id matches (security check)
    // Allow access if session matches OR if preview is older than 1 hour (user may have new session)
    const previewAge = Date.now() - new Date(preview.created_at).getTime();
    const oneHourMs = 60 * 60 * 1000;
    
    if (preview.session_id !== session_id && previewAge < oneHourMs) {
      console.log(`[coach-preview-get] Session mismatch for recent preview: ${normalizedEmail}`);
      // Return exists but don't return the plan content for security
      return createSuccessResponse({ 
        exists: true, 
        session_mismatch: true,
        message: "Preview exists but was created in a different session. Please use your original session or wait to create a new preview."
      });
    }

    console.log(`[coach-preview-get] Found preview for: ${normalizedEmail}, age: ${Math.round(previewAge / 1000)}s`);

    return createSuccessResponse({
      exists: true,
      preview_plan: preview.preview_plan,
      created_at: preview.created_at,
    });
  } catch (error) {
    console.error("[coach-preview-get] Error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});
