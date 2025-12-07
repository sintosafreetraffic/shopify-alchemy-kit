/**
 * Debug Sleep Sync Endpoint
 * 
 * GET /debug/sleep-sync?email=...
 * Recomputes attributes without storing - for debugging only
 * 
 * Requires Authorization: Bearer DEBUG_SECRET or CRON_SECRET
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateDebugSecret } from "../_shared/env.ts";
import { generateSleepAttributes, buildSleepSyncEvent } from "../_shared/sleep-sync.ts";
import { callSleepPlanAI, buildUserContext } from "../_shared/ai-brain.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate debug secret
    const authHeader = req.headers.get('Authorization');
    if (!validateDebugSecret(authHeader)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Debug Sleep Sync
    if (path === 'sleep-sync' || path === 'debug-sleep-sync') {
      console.log(`[Debug] Generating attributes for: ${email}`);
      
      const attributes = await generateSleepAttributes(supabase, email);
      const event = buildSleepSyncEvent(attributes, "debug");

      return new Response(JSON.stringify({
        success: true,
        email,
        attributes,
        event,
        note: "Read-only debug - no data stored or sent to Klaviyo",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Debug Generate Plan
    if (path === 'generate-plan' || path === 'debug-generate-plan') {
      const planType = url.searchParams.get('planType') || 'initial';
      
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

      return new Response(JSON.stringify({
        success: true,
        email,
        planType,
        plan,
        note: "Read-only debug - no data stored",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown debug endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
