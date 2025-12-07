/**
 * Daily Sleep Sync Cron Edge Function
 * 
 * Runs once per day to refresh SleepAttributes for all active users.
 * Finds users with profiles, recent logs, or orders and syncs their attributes.
 * 
 * Trigger via cron job or manual POST with CRON_SECRET.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateSleepAttributes,
  buildSleepSyncEvent,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const CRON_SECRET = Deno.env.get('CRON_SECRET');
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');

    // Verify cron secret for security
    const authHeader = req.headers.get('Authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('[daily-sleep-sync] Unauthorized request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log('[daily-sleep-sync] Starting daily sync job');

    // Find all emails that should be synced:
    // 1. Have a sleep_profile
    // 2. Have sleep logs in last 30 days
    // 3. Have at least 1 order (purchase_count > 0)
    
    const emailsToSync = new Set<string>();

    // Get all profiles
    const { data: profiles } = await supabase
      .from('sleep_profiles')
      .select('email');
    
    profiles?.forEach(p => emailsToSync.add(p.email));

    // Get emails with recent logs
    const { data: recentLogs } = await supabase
      .from('sleep_logs')
      .select('email')
      .gte('created_at', thirtyDaysAgo);
    
    recentLogs?.forEach(l => emailsToSync.add(l.email));

    // Get emails with purchases
    const { data: purchasers } = await supabase
      .from('sleep_profiles')
      .select('email')
      .gt('purchase_count', 0);
    
    purchasers?.forEach(p => emailsToSync.add(p.email));

    const emails = Array.from(emailsToSync);
    console.log(`[daily-sleep-sync] Found ${emails.length} emails to sync`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (email) => {
        try {
          const attributes = await generateSleepAttributes(supabase, email);
          const event = buildSleepSyncEvent(attributes, "daily_cron");

          // Store in state table
          await supabase
            .from('sleep_attributes_state')
            .upsert({
              email,
              data: attributes,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'email' });

          // Store in history table
          await supabase
            .from('sleep_attributes_history')
            .insert({ email, data: attributes });

          // Optionally send to Klaviyo (can be disabled for performance)
          if (KLAVIYO_PRIVATE_API_KEY) {
            try {
              await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, event.eventName, event.payload);
            } catch (klaviyoError) {
              console.error(`[daily-sleep-sync] Klaviyo error for ${email}:`, klaviyoError);
              // Don't fail the whole sync for Klaviyo errors
            }
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`[daily-sleep-sync] Error syncing ${email}:`, error);
        }
      }));

      // Small delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[daily-sleep-sync] Completed: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      totalEmails: emails.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors only
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[daily-sleep-sync] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
