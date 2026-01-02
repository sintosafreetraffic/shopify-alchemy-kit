/**
 * EPSR Confidence Decay Cron Job
 * 
 * Automatically downgrades hypothesis confidence for stale entries
 * with no recorded outcomes after N days.
 * 
 * Zero model involvement - pure SQL operation.
 * 
 * Trigger: External cron service or pg_cron (if available)
 * Auth: CRON_SECRET header required
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("[EPSR-DECAY] Unauthorized cron attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse optional stale_days from body (default 14)
    const body = await req.json().catch(() => ({}));
    const staleDays = body.stale_days || 14;

    console.log(`[EPSR-DECAY] Running confidence decay check (stale_days=${staleDays})`);

    // Call the decay function
    const { data, error } = await supabase.rpc("decay_stale_hypotheses", {
      stale_days: staleDays,
    });

    if (error) {
      console.error("[EPSR-DECAY] Function error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decayedCount = data?.length || 0;
    console.log(`[EPSR-DECAY] Decayed ${decayedCount} hypotheses:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        decayed_count: decayedCount,
        decayed: data || [],
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[EPSR-DECAY] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
