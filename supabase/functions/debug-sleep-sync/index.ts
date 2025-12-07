/**
 * Debug Sleep Sync Endpoint
 * 
 * Protected read-only debugging endpoints:
 * - GET /debug-sleep-sync?email=... - Recomputes attributes without storing
 * - GET /debug-sleep-sync?email=...&planType=initial|weekly_update - Generates plan without storing
 * 
 * Requires Authorization: Bearer DEBUG_SECRET or CRON_SECRET
 * 
 * These endpoints are READ-ONLY:
 * - No data is written to the database
 * - No events are sent to Klaviyo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  validateDebugSecret,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import { generateSleepAttributes, buildSleepSyncEvent } from "../_shared/sleep-sync.ts";
import { callSleepPlanAI, buildUserContext } from "../_shared/ai-brain.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate debug secret
    const authHeader = req.headers.get('Authorization');
    if (!validateDebugSecret(authHeader)) {
      console.log('[Debug] Unauthorized request');
      return createErrorResponse('Unauthorized', 401);
    }

    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const planType = url.searchParams.get('planType');

    if (!email) {
      return createErrorResponse('Email parameter required', 400);
    }

    // Load environment variables using centralized helper
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Debug Sleep Sync (when no planType specified)
    if (!planType) {
      console.log(`[Debug] Generating attributes for: ${email}`);
      
      const attributes = await generateSleepAttributes(supabase, email);
      const event = buildSleepSyncEvent(attributes, "debug");

      return createSuccessResponse({
        success: true,
        email,
        attributes,
        event,
        note: "Read-only debug - no data stored or sent to Klaviyo",
      });
    }

    // Debug Generate Plan (when planType specified)
    console.log(`[Debug] Generating ${planType} plan for: ${email}`);

    // Fetch profile and logs
    const [profileResult, logsResult] = await Promise.all([
      supabase.from('sleep_profiles').select('*').eq('email', email).maybeSingle(),
      supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(14),
    ]);

    const userContext = buildUserContext({
      mode: "sleep_plan",
      userProfile: profileResult.data,
      attributes: null,
      logs: logsResult.data || [],
    });

    const plan = await callSleepPlanAI(userContext, planType);

    return createSuccessResponse({
      success: true,
      email,
      planType,
      plan,
      note: "Read-only debug - no data stored",
    });

  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});
