/**
 * Coach Generate Sleep Plan Edge Function
 * 
 * Generates personalized 7-day sleep plans using AI Brain (OpenAI).
 * Uses deterministic Sleep Sync attributes for metrics.
 * 
 * Access is gated via hasSleepCoachAccess.
 * All queries use the authenticated user's email.
 * 
 * Uses OPENAI_API_KEY via centralized AI Brain - NO Lovable AI.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  hasOpenAIKey,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  authenticateRequest,
  hasSleepCoachAccess,
  createAuthErrorResponse,
  createAccessDeniedResponse,
} from "../_shared/auth.ts";
import { callSleepPlanAI, getDefaultSleepPlan } from "../_shared/ai-brain.ts";
import {
  generateSleepAttributes,
  buildSleepSyncEvent,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

interface SleepProfile {
  email: string;
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  whatsapp_enabled?: boolean;
  purchase_count?: number;
  delivery_date?: string;
  products_owned?: string[];
}

interface SleepLog {
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot: boolean;
  felt_stressed: boolean;
  notes: string | null;
}

interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  trend: 'improving' | 'stable' | 'worsening';
  hotNights: number;
  stressedNights: number;
  goodNights: number;
  poorNights: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load environment variables using centralized helper
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');
    const KLAVIYO_PRIVATE_API_KEY = getEnvVar('KLAVIYO_PRIVATE_API_KEY');
    
    // Verify OPENAI_API_KEY is available
    if (!hasOpenAIKey()) {
      console.error('[coach-generate-sleep-plan] OPENAI_API_KEY is not configured');
      return createErrorResponse('AI service not configured', 500);
    }

    // Authenticate user using centralized auth helper
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Unauthorized', authResult.status);
    }

    // Use authenticated user's email for all queries
    const email = authResult.user.email;
    const userId = authResult.user.id;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check Sleep Coach access
    const accessResult = await hasSleepCoachAccess(supabase, email, userId);
    if (!accessResult.hasAccess) {
      return createAccessDeniedResponse();
    }

    const { planType = 'initial' } = await req.json();

    console.log(`[coach-generate-sleep-plan] Generating ${planType} plan for: ${email}`);

    // Fetch profile and logs using authenticated email only
    const [profileResult, logsResult] = await Promise.all([
      supabase.from('sleep_profiles').select('*').eq('email', email).single(),
      supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(14),
    ]);

    const profile: SleepProfile | null = profileResult.data;
    const logs: SleepLog[] = logsResult.data || [];

    // Calculate trends deterministically
    const trends = calculateTrends(logs);
    
    // Build user context for AI
    const userContext = buildUserContext(profile, logs, trends);

    // Call AI Brain for sleep plan generation (OpenAI)
    console.log('[AI Brain] Calling for plan generation');
    let parsed;
    try {
      parsed = await callSleepPlanAI(userContext, planType);
      console.log('[AI Brain] Plan generated successfully');
    } catch (aiError) {
      console.error('[AI Brain] Error, using fallback:', aiError);
      parsed = getDefaultSleepPlan();
    }

    // Save to database using authenticated email
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const { data: plan, error } = await supabase
      .from('coach_plans')
      .insert({
        email,
        plan_type: planType,
        sleep_plan: parsed.weeklyPlan,
        encouragement_message: parsed.encouragement,
        main_focus_this_week: parsed.focusAreas,
        recommended_pdfs: parsed.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
        recommended_actions_today: parsed.todayActions,
        whatsapp_messages: [],
        klaviyo_events: [],
        spine_health_score: parsed.spineScore,
        raw_ai_response: JSON.stringify(parsed),
        valid_until: validUntil.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[coach-generate-sleep-plan] Database error:', error);
      throw error;
    }

    console.log('[coach-generate-sleep-plan] Plan saved:', plan.id);

    // Send Klaviyo event for plan creation
    if (KLAVIYO_PRIVATE_API_KEY && parsed.todayActions?.length > 0) {
      try {
        await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_SleepPlan_Created', {
          plan_type: planType,
          focus_areas: parsed.focusAreas?.join(', ') || '',
          encouragement: parsed.encouragement || '',
          spine_score: parsed.spineScore || 0,
          morning_task: parsed.todayActions.find((a: any) => a.time === 'morning')?.action || '',
          evening_task: parsed.todayActions.find((a: any) => a.time === 'evening')?.action || '',
          week_day1_focus: parsed.weeklyPlan?.day1?.focus || '',
          valid_until: validUntil.toISOString(),
        });
        console.log('[Klaviyo] RBN_SleepPlan_Created event sent');
      } catch (klaviyoError) {
        console.error('[Klaviyo] Failed to send plan event:', klaviyoError);
      }
    }

    // TRIGGER SLEEP SYNC after plan creation
    try {
      console.log('[Sleep Sync] Triggering for plan generation:', email);
      const sleepSyncAttrs = await generateSleepAttributes(supabase, email);
      const sleepSyncEvent = buildSleepSyncEvent(sleepSyncAttrs, "sleep_plan_generated");
      
      // Store attributes
      await supabase
        .from('sleep_attributes_state')
        .upsert({
          email,
          data: sleepSyncAttrs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      await supabase
        .from('sleep_attributes_history')
        .insert({ email, data: sleepSyncAttrs });

      // Update plan with klaviyo_events
      await supabase
        .from('coach_plans')
        .update({ klaviyo_events: [sleepSyncEvent] })
        .eq('id', plan.id);

      // Send Sleep Sync event to Klaviyo
      if (KLAVIYO_PRIVATE_API_KEY) {
        await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, sleepSyncEvent.eventName, sleepSyncEvent.payload);
        console.log('[Sleep Sync] RBN_SleepSync_Updated event sent');
      }
    } catch (syncError) {
      console.error('[Sleep Sync] Error:', syncError);
      // Non-blocking
    }

    return createSuccessResponse({ success: true, plan });
  } catch (error: any) {
    console.error('[coach-generate-sleep-plan] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});

function buildUserContext(profile: SleepProfile | null, logs: SleepLog[], trends: TrendData): string {
  if (!profile) return 'New user with no profile data. Create a general sleep improvement plan focused on pillow positioning and sleep hygiene.';
  
  return `User Profile:
- Sleep Position: ${profile.sleep_position}
- Pain Points: ${profile.pain_points?.join(', ') || 'None specified'}
- Temperature Preference: ${profile.temperature_preference}
- Stress Level: ${profile.stress_level}
- Wake Up Condition: ${profile.wake_up_condition}
- Products Owned: ${profile.products_owned?.join(', ') || 'Not specified'}

Sleep Data (${logs.length} nights logged):
- Average Sleep Quality: ${trends.avgSleepQuality.toFixed(1)}/10
- Average Pain Level: ${trends.avgPain.toFixed(1)}/10
- Trend: ${trends.trend}
- Hot Nights: ${trends.hotNights}
- Stressed Nights: ${trends.stressedNights}
- Good Nights (7+): ${trends.goodNights}
- Poor Nights (≤4): ${trends.poorNights}

Create a personalized 7-day plan addressing their specific pain points and sleep position.`;
}

function calculateTrends(logs: SleepLog[]): TrendData {
  if (logs.length === 0) {
    return { avgSleepQuality: 5, avgPain: 5, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 };
  }

  const avgSleepQuality = logs.reduce((sum, l) => sum + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain_level_morning, 0) / logs.length;
  const hotNights = logs.filter(l => l.felt_hot).length;
  const stressedNights = logs.filter(l => l.felt_stressed).length;
  const goodNights = logs.filter(l => l.sleep_quality >= 7).length;
  const poorNights = logs.filter(l => l.sleep_quality <= 4).length;

  const recentLogs = logs.slice(0, 7);
  const olderLogs = logs.slice(7, 14);
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  
  if (olderLogs.length >= 3) {
    const recentAvg = recentLogs.reduce((s, l) => s + l.sleep_quality, 0) / recentLogs.length;
    const olderAvg = olderLogs.reduce((s, l) => s + l.sleep_quality, 0) / olderLogs.length;
    if (recentAvg - olderAvg > 0.5) trend = 'improving';
    else if (olderAvg - recentAvg > 0.5) trend = 'worsening';
  }

  return { avgSleepQuality, avgPain, trend, hotNights, stressedNights, goodNights, poorNights };
}
