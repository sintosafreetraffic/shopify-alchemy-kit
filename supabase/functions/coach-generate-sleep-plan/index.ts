/**
 * Coach Generate Sleep Plan Edge Function
 * 
 * Generates personalized 7-day sleep plans using AI Brain (OpenAI).
 * Plans are always in sync with profile + logs, never contradict hard data.
 * 
 * Features:
 * - Stores profile_snapshot, logs_snapshot at generation time
 * - Validates AI output against user data
 * - Tracks generated_reason for regeneration logic
 * 
 * Access is gated via hasSleepCoachAccess.
 * All queries use the authenticated user's email.
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
import { 
  callSleepPlanAI, 
  getDefaultSleepPlan,
  ProfileSnapshot,
  LogsSnapshot,
} from "../_shared/ai-brain.ts";
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
  quiz_completed?: boolean;
  quiz_completed_at?: string;
  quiz_data?: any;
}

interface SleepLog {
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot: boolean;
  felt_stressed: boolean;
  notes: string | null;
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

    const { planType = 'initial', reason = 'manual' } = await req.json();

    console.log(`[coach-generate-sleep-plan] Generating ${planType} plan for: ${email}, reason: ${reason}`);

    // === STEP 1: Fetch fresh profile and logs ===
    const [profileResult, logsResult] = await Promise.all([
      supabase.from('sleep_profiles').select('*').eq('email', email).single(),
      supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(14),
    ]);

    const profile: SleepProfile | null = profileResult.data;
    const logs: SleepLog[] = logsResult.data || [];

    // === STEP 2: Build authoritative snapshots ===
    const profileSnapshot: ProfileSnapshot = {
      sleep_position: profile?.sleep_position || 'side',
      pain_points: profile?.pain_points || [],
      temperature_preference: profile?.temperature_preference || 'neutral',
      stress_level: profile?.stress_level || 'medium',
      wake_up_condition: profile?.wake_up_condition || 'neutral',
      products_owned: profile?.products_owned || [],
      quiz_completed_at: profile?.quiz_completed_at,
    };

    const logsSnapshot: LogsSnapshot = calculateLogsSnapshot(logs);

    // === LOG: Plan context summary ===
    console.log('[SleepCoach] Plan context summary', {
      email,
      profileSnapshot: {
        sleep_position: profileSnapshot.sleep_position,
        pain_points: profileSnapshot.pain_points,
        products_owned: profileSnapshot.products_owned,
      },
      logsSnapshot: {
        nights_logged: logsSnapshot.nights_logged,
        avg_sleep_quality: logsSnapshot.avg_sleep_quality.toFixed(1),
        avg_morning_pain: logsSnapshot.avg_morning_pain.toFixed(1),
        trend: logsSnapshot.trend,
      },
    });

    // === STEP 3: Call AI Brain with structured snapshots ===
    console.log('[AI Brain] Calling with hard constraints and snapshots');
    let parsed;
    try {
      // Pass snapshots for structured context with hard constraints
      parsed = await callSleepPlanAI('', planType, profileSnapshot, logsSnapshot);
      console.log('[AI Brain] Plan generated successfully');
      
      // === STEP 4: Validate and sanitize AI output ===
      parsed = validateAndSanitizePlan(parsed, profileSnapshot, logsSnapshot);
    } catch (aiError) {
      console.error('[AI Brain] Error, using fallback:', aiError);
      parsed = getDefaultSleepPlan();
    }

    // === STEP 5: Calculate spine score from data ===
    const spineScore = calculateSpineScore(profileSnapshot, logsSnapshot);
    parsed.spineScore = spineScore;

    // === STEP 6: Save to database with snapshots ===
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
        // NEW: Store snapshots for traceability
        profile_snapshot: profileSnapshot,
        logs_snapshot: logsSnapshot,
        trend_at_generation: logsSnapshot.trend,
        generated_reason: reason,
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
          generated_reason: reason,
          focus_areas: parsed.focusAreas?.join(', ') || '',
          encouragement: parsed.encouragement || '',
          spine_score: parsed.spineScore || 0,
          trend_at_generation: logsSnapshot.trend,
          morning_task: parsed.todayActions.find((a: any) => a.time === 'morning')?.action || '',
          evening_task: parsed.todayActions.find((a: any) => a.time === 'evening')?.action || '',
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

/**
 * Calculate logs snapshot from sleep logs
 */
function calculateLogsSnapshot(logs: SleepLog[]): LogsSnapshot {
  if (logs.length === 0) {
    return {
      nights_logged: 0,
      avg_sleep_quality: 5,
      avg_morning_pain: 5,
      trend: 'stable',
      hot_nights: 0,
      stressed_nights: 0,
      good_nights: 0,
      poor_nights: 0,
    };
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

  return {
    nights_logged: logs.length,
    avg_sleep_quality: avgSleepQuality,
    avg_morning_pain: avgPain,
    trend,
    hot_nights: hotNights,
    stressed_nights: stressedNights,
    good_nights: goodNights,
    poor_nights: poorNights,
    last_log_date: logs[0]?.date,
  };
}

/**
 * Validate and sanitize AI-generated plan against user data
 */
function validateAndSanitizePlan(
  plan: any,
  profileSnapshot: ProfileSnapshot,
  logsSnapshot: LogsSnapshot
): any {
  const warnings: string[] = [];
  
  // Check encouragement message for contradictions
  if (plan.encouragement) {
    const isRecoveryNeeded = logsSnapshot.avg_sleep_quality < 5 || logsSnapshot.avg_morning_pain >= 5;
    
    if (isRecoveryNeeded) {
      const positivePatterns = /doing great|low pain|excellent|amazing progress|fantastic/gi;
      if (positivePatterns.test(plan.encouragement)) {
        warnings.push('Overly positive encouragement for recovery scenario');
        // Sanitize by adjusting message
        plan.encouragement = plan.encouragement
          .replace(/doing great/gi, 'making progress')
          .replace(/low pain/gi, 'managing pain')
          .replace(/excellent/gi, 'good')
          .replace(/amazing progress/gi, 'steady progress');
      }
    }
  }

  // Check weekly plan for product references user doesn't own
  const productsOwned = profileSnapshot.products_owned || [];
  const hasErgonomicPillow = productsOwned.some(p => p.toLowerCase().includes('ergonomic') && p.toLowerCase().includes('pillow'));
  const hasKneePillow = productsOwned.some(p => p.toLowerCase().includes('knee'));
  const hasSleepMask = productsOwned.some(p => p.toLowerCase().includes('mask'));

  if (plan.weeklyPlan) {
    for (const dayKey of Object.keys(plan.weeklyPlan)) {
      const day = plan.weeklyPlan[dayKey];
      if (!day) continue;

      // Check for knee pillow references
      if (!hasKneePillow) {
        const kneePillowPattern = /knee pillow|between your knees|knee pad/gi;
        if (day.morningTask && kneePillowPattern.test(day.morningTask)) {
          warnings.push(`Day ${dayKey} morning task references knee pillow user doesn't own`);
          day.morningTask = day.morningTask.replace(kneePillowPattern, 'a pillow');
        }
        if (day.eveningTask && kneePillowPattern.test(day.eveningTask)) {
          warnings.push(`Day ${dayKey} evening task references knee pillow user doesn't own`);
          day.eveningTask = day.eveningTask.replace(kneePillowPattern, 'a pillow');
        }
        if (day.tip && kneePillowPattern.test(day.tip)) {
          day.tip = day.tip.replace(kneePillowPattern, 'a pillow');
        }
      }

      // Check for sleep mask references
      if (!hasSleepMask) {
        const sleepMaskPattern = /sleep mask|eye mask|silk mask/gi;
        if (day.morningTask && sleepMaskPattern.test(day.morningTask)) {
          day.morningTask = day.morningTask.replace(sleepMaskPattern, 'dark environment');
        }
        if (day.eveningTask && sleepMaskPattern.test(day.eveningTask)) {
          day.eveningTask = day.eveningTask.replace(sleepMaskPattern, 'dark environment');
        }
      }
    }
  }

  // Check for sleep position contradictions
  const userPosition = profileSnapshot.sleep_position?.toLowerCase();
  if (plan.weeklyPlan && userPosition) {
    const wrongPositionMap: Record<string, RegExp> = {
      'back': /side sleeper|sleeping on your side/gi,
      'side': /back sleeper|sleeping on your back/gi,
      'stomach': /side sleeper|back sleeper/gi,
    };
    
    const wrongPattern = wrongPositionMap[userPosition];
    if (wrongPattern) {
      for (const dayKey of Object.keys(plan.weeklyPlan)) {
        const day = plan.weeklyPlan[dayKey];
        if (!day) continue;
        
        const correctTerm = userPosition === 'back' ? 'back sleeper' : 
                           userPosition === 'side' ? 'side sleeper' : 
                           userPosition === 'stomach' ? 'stomach sleeper' : 'sleeper';
        
        ['morningTask', 'eveningTask', 'tip'].forEach(field => {
          if (day[field] && wrongPattern.test(day[field])) {
            warnings.push(`Day ${dayKey} ${field} has wrong sleep position reference`);
            day[field] = day[field].replace(wrongPattern, correctTerm);
          }
        });
      }
    }
  }

  if (warnings.length > 0) {
    console.log('[Validation] Plan sanitization applied:', warnings);
  }

  return plan;
}

/**
 * Calculate spine score from profile and logs data
 */
function calculateSpineScore(
  profileSnapshot: ProfileSnapshot,
  logsSnapshot: LogsSnapshot
): number {
  let score = 70; // Base score

  // Pain points penalty
  const painCount = profileSnapshot.pain_points?.filter(p => p !== 'none').length || 0;
  score -= painCount * 5;

  // Sleep quality bonus/penalty
  if (logsSnapshot.nights_logged > 0) {
    if (logsSnapshot.avg_sleep_quality >= 7) score += 15;
    else if (logsSnapshot.avg_sleep_quality >= 5) score += 5;
    else score -= 10;

    // Pain penalty
    if (logsSnapshot.avg_morning_pain >= 7) score -= 15;
    else if (logsSnapshot.avg_morning_pain >= 5) score -= 8;
    else if (logsSnapshot.avg_morning_pain <= 3) score += 5;

    // Trend bonus/penalty
    if (logsSnapshot.trend === 'improving') score += 10;
    else if (logsSnapshot.trend === 'worsening') score -= 10;
  }

  // Products owned bonus
  const productsCount = profileSnapshot.products_owned?.length || 0;
  score += productsCount * 3;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}