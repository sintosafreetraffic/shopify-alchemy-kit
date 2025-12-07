/**
 * Klaviyo WhatsApp Event Edge Function
 * 
 * Sends personalized WhatsApp events to Klaviyo.
 * Requires JWT authentication.
 * Uses centralized env/cors helpers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

// WhatsApp event types for personalized messaging
type WhatsAppEventType = 
  | 'RBN_WhatsApp_Sleep_Tip'
  | 'RBN_WhatsApp_New_Product'
  | 'RBN_WhatsApp_Exclusive_Offer'
  | 'RBN_WhatsApp_Plan_Reminder'
  | 'RBN_WhatsApp_Weekly_Summary';

interface WhatsAppEventPayload {
  event_type: WhatsAppEventType;
  custom_properties?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use centralized env helpers
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar('KLAVIYO_PRIVATE_API_KEY');
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');

    // Extract user from JWT - this is the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    // Create client with user's JWT to get their identity
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.email) {
      console.error('[Auth] Error:', authError);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Use the authenticated user's email - ignore any email in request body
    const email = user.email;
    const { event_type, custom_properties = {} }: WhatsAppEventPayload = await req.json();

    if (!event_type) {
      return createErrorResponse('event_type is required', 400);
    }

    console.log(`[Klaviyo] Processing WhatsApp event ${event_type} for authenticated user: ${email}`);

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user profile for personalization
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!profile?.whatsapp_enabled) {
      console.log(`[Klaviyo] WhatsApp not enabled for ${email}, skipping event`);
      return createSuccessResponse({ success: false, reason: 'whatsapp_not_enabled' });
    }

    // Fetch latest sleep logs for trend data
    const { data: recentLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(7);

    // Fetch latest coach plan
    const { data: latestPlan } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('email', email)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate personalization data
    const avgSleepQuality = recentLogs?.length 
      ? recentLogs.reduce((sum, log) => sum + log.sleep_quality, 0) / recentLogs.length 
      : null;
    const avgPainLevel = recentLogs?.length 
      ? recentLogs.reduce((sum, log) => sum + log.pain_level_morning, 0) / recentLogs.length 
      : null;
    const logsThisWeek = recentLogs?.length || 0;
    const isImproving = recentLogs && recentLogs.length >= 3 
      ? recentLogs[0]?.sleep_quality > recentLogs[recentLogs.length - 1]?.sleep_quality
      : null;

    // Build rich personalization properties
    const personalizationProperties = {
      // User profile data
      sleep_position: profile.sleep_position,
      pain_points: profile.pain_points?.join(', ') || 'None',
      pain_points_array: profile.pain_points || [],
      temperature_preference: profile.temperature_preference,
      stress_level: profile.stress_level,
      wake_up_condition: profile.wake_up_condition,
      products_owned: profile.products_owned?.join(', ') || 'None',
      products_owned_array: profile.products_owned || [],
      whatsapp_phone: profile.whatsapp_phone,

      // Sleep trend data
      avg_sleep_quality: avgSleepQuality?.toFixed(1) || 'N/A',
      avg_pain_level: avgPainLevel?.toFixed(1) || 'N/A',
      logs_this_week: logsThisWeek,
      is_improving: isImproving,
      last_log_date: recentLogs?.[0]?.date || null,

      // Plan data
      spine_health_score: latestPlan?.spine_health_score || null,
      plan_focus_areas: latestPlan?.main_focus_this_week?.join(', ') || 'General wellness',
      encouragement_message: latestPlan?.encouragement_message || '',
      plan_valid_until: latestPlan?.valid_until || null,

      // Custom properties passed in
      ...custom_properties,

      // Timestamp
      event_timestamp: new Date().toISOString(),
    };

    console.log(`[Klaviyo] Sending ${event_type} with personalization`);

    // Send event to Klaviyo
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
            metric: { data: { type: 'metric', attributes: { name: event_type } } },
            profile: { data: { type: 'profile', attributes: { email, phone_number: profile.whatsapp_phone } } },
            properties: personalizationProperties,
            time: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Klaviyo] API error:', errorText);
      return createErrorResponse(`Klaviyo API error: ${errorText}`, 500);
    }

    console.log(`[Klaviyo] WhatsApp event ${event_type} sent successfully for ${email}`);
    return createSuccessResponse({ success: true, event_type });
  } catch (error: any) {
    console.error('[Klaviyo] Error in klaviyo-whatsapp-event:', error);
    return createErrorResponse(error.message, 500);
  }
});
