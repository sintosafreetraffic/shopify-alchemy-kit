/**
 * Sleep Plan Reminder Edge Function
 * 
 * Sends reminders to users with expired sleep plans.
 * Requires CRON_SECRET for authorization.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  requireEnvVar,
  validateCronSecret,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================================
    // AUTH BLOCK: Validate request authorization
    // Accepts either:
    //   1. Authorization: Bearer <CRON_SECRET> header (for manual/external calls)
    //   2. Internal pg_cron calls identified by:
    //      - X-Supabase-Internal: true header, OR
    //      - User-Agent containing 'pg_net' (Supabase internal HTTP client)
    // ============================================================
    const authHeader = req.headers.get('Authorization');
    const isInternalCron = req.headers.get('X-Supabase-Internal') === 'true' || 
                           (req.headers.get('User-Agent') || '').includes('pg_net');
    
    if (!isInternalCron && !validateCronSecret(authHeader)) {
      console.warn('[sleep-plan-reminder] Unauthorized access attempt');
      return createErrorResponse('Unauthorized', 401);
    }

    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar('KLAVIYO_PRIVATE_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[sleep-plan-reminder] Starting reminder check...');

    const now = new Date();

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('sleep_profiles')
      .select('email');

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return createSuccessResponse({ success: true, message: 'No profiles found' });
    }

    let remindersSent = 0;

    for (const profile of profiles) {
      const { data: latestPlan } = await supabaseAdmin
        .from('coach_plans')
        .select('id, valid_until, generated_at')
        .eq('email', profile.email)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const needsNewPlan = !latestPlan || 
        (latestPlan.valid_until && new Date(latestPlan.valid_until) < now);

      if (!needsNewPlan) continue;

      const { data: recentReminder } = await supabaseAdmin
        .from('engagement_meta')
        .select('last_reminder_type, updated_at')
        .eq('email', profile.email)
        .maybeSingle();

      if (recentReminder?.last_reminder_type === 'new_plan_available') {
        const hoursSinceReminder = (now.getTime() - new Date(recentReminder.updated_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceReminder < 24) continue;
      }

      const response = await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              metric: { data: { type: 'metric', attributes: { name: 'RBN_New_Plan_Available' } } },
              profile: { data: { type: 'profile', attributes: { email: profile.email } } },
              properties: {
                last_plan_date: latestPlan?.generated_at || null,
                dashboard_url: 'https://www.risebynight.com/sleep-coach',
              },
              time: now.toISOString(),
            },
          },
        }),
      });

      if (response.ok) {
        await supabaseAdmin.from('engagement_meta').upsert({
          email: profile.email,
          last_reminder_type: 'new_plan_available',
          updated_at: now.toISOString(),
        }, { onConflict: 'email' });
        remindersSent++;
      }
    }

    console.log(`[sleep-plan-reminder] Completed: ${remindersSent} reminders sent`);
    return createSuccessResponse({ success: true, reminders_sent: remindersSent });
  } catch (error) {
    console.error('[sleep-plan-reminder] Error:', error);
    return createErrorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
