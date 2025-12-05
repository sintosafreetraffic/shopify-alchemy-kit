import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!KLAVIYO_PRIVATE_API_KEY) {
      throw new Error('Klaviyo API key not configured');
    }

    // Extract user from JWT - this is the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's JWT to get their identity
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.email) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the authenticated user's email - ignore any email in request body
    const email = user.email;
    const { event_type, custom_properties = {} }: WhatsAppEventPayload = await req.json();

    if (!event_type) {
      throw new Error('event_type is required');
    }

    console.log(`Processing WhatsApp event ${event_type} for authenticated user: ${email}`);

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user profile for personalization
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!profile?.whatsapp_enabled) {
      console.log(`WhatsApp not enabled for ${email}, skipping event`);
      return new Response(JSON.stringify({ success: false, reason: 'whatsapp_not_enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    console.log(`Sending ${event_type} with personalization`);

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
      console.error('Klaviyo API error:', errorText);
      throw new Error(`Klaviyo API error: ${errorText}`);
    }

    console.log(`WhatsApp event ${event_type} sent successfully for ${email}`);

    return new Response(JSON.stringify({ success: true, event_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in klaviyo-whatsapp-event:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
