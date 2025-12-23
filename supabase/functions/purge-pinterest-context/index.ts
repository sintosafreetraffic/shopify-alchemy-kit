/**
 * Purge Pinterest Context Edge Function
 * 
 * Deletes expired rows from pinterest_context table where expires_at < now().
 * Designed to be called via cron job daily.
 * 
 * Security: Requires CRON_SECRET for manual invocation, or is called by pg_cron.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Optional: Verify cron secret for manual invocations
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    // Allow if called from pg_cron (no auth header) or with valid CRON_SECRET only
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // Only accept CRON_SECRET - reject all other tokens including anon key
      if (!cronSecret || token !== cronSecret) {
        console.warn('[purge-pinterest-context] Invalid authorization token');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp
    const now = new Date().toISOString();

    // First, count how many rows will be deleted (for logging)
    const { count: expiredCount, error: countError } = await supabase
      .from('pinterest_context')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);

    if (countError) {
      console.error('[purge-pinterest-context] Error counting expired rows:', countError);
    }

    // Delete expired rows
    const { error: deleteError } = await supabase
      .from('pinterest_context')
      .delete()
      .lt('expires_at', now);

    if (deleteError) {
      console.error('[purge-pinterest-context] Error deleting expired rows:', deleteError);
      throw deleteError;
    }

    const duration = Date.now() - startTime;
    const deletedCount = expiredCount ?? 0;

    console.log(`[purge-pinterest-context] Successfully purged ${deletedCount} expired rows in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        duration_ms: duration,
        purged_at: now,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[purge-pinterest-context] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        duration_ms: duration,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
