/**
 * Coach Generate Sleep Plan Edge Function (v2 - Adaptive Engine)
 * 
 * Generates personalized, adaptive 7-day sleep plans using AI Brain (OpenAI).
 * Plans evolve based on user data, detected patterns, and progression phases.
 * 
 * Features:
 * - Adaptive difficulty based on adherence
 * - Pattern detection from notes (alcohol, stress, temperature, etc.)
 * - Research-grounded progression timelines
 * - Phase-based coaching (Foundation → Stabilization → Optimization → Resilience)
 * - Never repetitive, always personalized
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
  fullSleepSync,
} from "../_shared/sleep-sync.ts";
import { SleepSyncSource, SleepAttributes } from "../_shared/types.ts";
import {
  analyzeRiskDrivers,
  calculateSpineScoreV2,
  calculateCoachReadiness,
  getPersonalizationIntensity,
  SpineScoreBreakdown,
  RiskAnalysis,
  CoachReadiness,
} from "../_shared/coach-metrics.ts";
import {
  buildAdaptivePlanContext,
  buildAdaptivePromptSection,
  AdaptivePlanContext,
} from "../_shared/adaptive-plan-engine.ts";

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
  sleep_assessment?: any;
  persona_cluster?: string;
  persona_label?: string;
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

    const { planType = 'initial', reason = 'manual', previousPlanCompleted = true, adherenceRate = 50 } = await req.json();

    console.log(`[coach-generate-sleep-plan] Generating ${planType} plan for: ${email}, reason: ${reason}`);

    // === STEP 1: Fetch fresh profile, logs, 3-layer attributes, and plan history ===
    const [profileResult, logsResult, attrsResult, plansCountResult] = await Promise.all([
      supabase.from('sleep_profiles').select('*').eq('email', email).single(),
      supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(30), // Extended for pattern detection
      supabase.from('sleep_attributes_state').select('data').eq('email', email).maybeSingle(),
      supabase.from('coach_plans').select('id', { count: 'exact' }).eq('email', email),
    ]);

    const profile: SleepProfile | null = profileResult.data;
    const logs: SleepLog[] = logsResult.data || [];
    
    // Get or generate 3-layer attributes
    let sleepAttributes: SleepAttributes;
    if (attrsResult.data?.data) {
      sleepAttributes = attrsResult.data.data as SleepAttributes;
      console.log('[coach-generate-sleep-plan] Using existing 3-layer attributes');
    } else {
      sleepAttributes = await generateSleepAttributes(supabase, email, 'sleep_plan' as SleepSyncSource);
      console.log('[coach-generate-sleep-plan] Generated fresh 3-layer attributes');
    }

    // === STEP 2: Build authoritative snapshots with 3-layer data ===
    const profileSnapshot: ProfileSnapshot = {
      sleep_position: sleepAttributes.sleep_position || profile?.sleep_position || 'side',
      pain_points: sleepAttributes.pain_points || profile?.pain_points || [],
      temperature_preference: sleepAttributes.temperature_preference || profile?.temperature_preference || 'neutral',
      stress_level: sleepAttributes.stress_level || profile?.stress_level || 'medium',
      wake_up_condition: sleepAttributes.wake_up_condition || profile?.wake_up_condition || 'neutral',
      products_owned: sleepAttributes.products_owned || profile?.products_owned || [],
      quiz_completed_at: profile?.quiz_completed_at,
      // Layer 2: Environment data for AI context
      mattress_firmness: sleepAttributes.mattress_firmness,
      mattress_thickness: sleepAttributes.mattress_thickness,
      bed_height: sleepAttributes.bed_height,
      co_sleeping: sleepAttributes.co_sleeping,
      bedding_material: sleepAttributes.bedding_material,
      pillow_type: sleepAttributes.pillow_type,
      room_brightness: sleepAttributes.room_brightness,
      room_noise: sleepAttributes.room_noise,
    };

    const logsSnapshot: LogsSnapshot = calculateLogsSnapshot(logs);
    
    // Add Layer 3 dynamic state to logs snapshot
    const enhancedLogsSnapshot: LogsSnapshot = {
      ...logsSnapshot,
      // Override with 3-layer calculated values for consistency
      avg_sleep_quality: sleepAttributes.avg_sleep_quality_7d ?? logsSnapshot.avg_sleep_quality,
      avg_morning_pain: sleepAttributes.avg_pain_7d ?? logsSnapshot.avg_morning_pain,
      trend: sleepAttributes.sleep_trend !== 'unknown' ? sleepAttributes.sleep_trend : logsSnapshot.trend,
      // Layer 3 additions
      streak_days: sleepAttributes.streak_days,
      pain_trend: sleepAttributes.pain_trend,
      risk_level: sleepAttributes.risk_level,
      engagement_level: sleepAttributes.engagement_level,
      sleep_stress_level: sleepAttributes.sleep_stress_level,
      temperature_sensitive: sleepAttributes.temperature_sensitive,
    };

    // === LOG: Plan context summary with 3-layer data ===
    console.log('[SleepCoach] 3-layer plan context summary', {
      email,
      profileSnapshot: {
        sleep_position: profileSnapshot.sleep_position,
        pain_points: profileSnapshot.pain_points,
        products_owned: profileSnapshot.products_owned,
        environment: {
          mattress_firmness: profileSnapshot.mattress_firmness,
          room_brightness: profileSnapshot.room_brightness,
          co_sleeping: profileSnapshot.co_sleeping,
        },
      },
      logsSnapshot: {
        nights_logged: logsSnapshot.nights_logged,
        avg_sleep_quality: enhancedLogsSnapshot.avg_sleep_quality?.toFixed(1),
        avg_morning_pain: enhancedLogsSnapshot.avg_morning_pain?.toFixed(1),
        trend: enhancedLogsSnapshot.trend,
        streak_days: enhancedLogsSnapshot.streak_days,
        risk_level: enhancedLogsSnapshot.risk_level,
      },
    });

    // === STEP 3: Calculate deterministic coach metrics ===
    const spineScoreBreakdown: SpineScoreBreakdown = calculateSpineScoreV2(sleepAttributes);
    const riskAnalysis: RiskAnalysis = analyzeRiskDrivers(sleepAttributes);
    const coachReadiness: CoachReadiness = calculateCoachReadiness(sleepAttributes);
    const personalizationIntensity = getPersonalizationIntensity(sleepAttributes);

    console.log('[SleepCoach] Deterministic metrics calculated', {
      spineScore: spineScoreBreakdown.score,
      spineTrend: spineScoreBreakdown.trend,
      riskLevel: riskAnalysis.level,
      riskDrivers: riskAnalysis.drivers.slice(0, 2),
      coachReadinessLabel: coachReadiness.label,
      personalizationIntensity,
    });

    // === STEP 3.5: Build Adaptive Plan Context ===
    const plansGenerated = plansCountResult.count || 0;
    const adaptiveContext: AdaptivePlanContext = buildAdaptivePlanContext(
      logs,
      sleepAttributes,
      plansGenerated,
      previousPlanCompleted,
      adherenceRate
    );

    console.log('[SleepCoach] Adaptive context built', {
      phase: adaptiveContext.progression.phase,
      weekNumber: adaptiveContext.progression.weekNumber,
      difficulty: adaptiveContext.adaptation.difficulty,
      detectedPatterns: adaptiveContext.notePatterns.map(p => p.pattern),
      relevantTimelines: adaptiveContext.relevantTimelines.map(t => t.category),
    });

    // === Extract persona data from sleep_assessment or derive fallback ===
    const sleepAssessment = profile?.sleep_assessment as any;
    const storedPersonaCluster = sleepAssessment?.persona?.cluster || (profile as any)?.persona_cluster;
    const storedPersonaConfidence = sleepAssessment?.persona?.confidence;
    const storedPersonaLabel = sleepAssessment?.persona?.label || (profile as any)?.persona_label;
    
    // Derive persona if not stored (fallback heuristic)
    const derivedPersonaCluster = storedPersonaCluster || 
      (sleepAttributes.pain_points?.some((p: string) => p !== 'none') ? 'pain_sleeper' 
        : sleepAttributes.stress_level === 'high' ? 'stress_insomnia' 
        : 'optimizer');
    
    // Map persona to core need
    const coreNeedMap: Record<string, string> = {
      pain_sleeper: 'alignment',
      stress_insomnia: 'environment', 
      optimizer: 'optimization',
      recovery_sleeper: 'recovery',
    };

    // Build the adaptive prompt section
    const adaptivePromptSection = buildAdaptivePromptSection(adaptiveContext);

    // Build metrics context for AI prompt (plain language, no raw scores for AI to use)
    const metricsContext = {
      spineScoreSummary: `${spineScoreBreakdown.score}/100 (${
        spineScoreBreakdown.score >= 70 ? 'good foundation' : 
        spineScoreBreakdown.score >= 50 ? 'room for improvement' : 'needs attention'
      }). Trend: ${spineScoreBreakdown.trend}.`,
      riskDriversSummary: riskAnalysis.drivers.length > 0 
        ? riskAnalysis.rationale 
        : 'No significant risk factors detected.',
      coachReadinessLabel: coachReadiness.label,
      personalizationIntensity,
      refreshReason: reason,
      // Persona context - use stored or derived
      personaCluster: derivedPersonaCluster,
      personaConfidence: storedPersonaConfidence ?? 50, // Default to 50 if not stored
      personaLabel: storedPersonaLabel || (derivedPersonaCluster === 'pain_sleeper' ? 'The Pain Sleeper' 
        : derivedPersonaCluster === 'stress_insomnia' ? 'The Stress & Environment Sleeper'
        : derivedPersonaCluster === 'recovery_sleeper' ? 'The Recovery Sleeper'
        : 'The Sleep Optimizer'),
      coreNeed: coreNeedMap[derivedPersonaCluster] || 'alignment',
      // Add adaptive context
      adaptivePromptSection,
      adaptivePhase: adaptiveContext.progression.phase,
      adaptiveDifficulty: adaptiveContext.adaptation.difficulty,
      detectedPatterns: adaptiveContext.notePatterns,
    };

    console.log('[SleepCoach] Persona context for AI', {
      personaCluster: metricsContext.personaCluster,
      personaConfidence: metricsContext.personaConfidence,
      personaLabel: metricsContext.personaLabel,
      coreNeed: metricsContext.coreNeed,
    });

    // === STEP 4: Call AI Brain with structured snapshots + metrics context + adaptive engine ===
    console.log('[AI Brain] Calling with 3-layer context, adaptive engine, and deterministic metrics');
    let parsed;
    try {
      // Pass enhanced snapshots with full 3-layer context + metrics + adaptive context
      parsed = await callSleepPlanAI('', planType, profileSnapshot, enhancedLogsSnapshot, metricsContext);
      console.log('[AI Brain] Enhanced plan generated successfully');
      
      // === STEP 5: Validate and sanitize AI output ===
      parsed = validateAndSanitizePlan(parsed, profileSnapshot, enhancedLogsSnapshot);
    } catch (aiError) {
      console.error('[AI Brain] Error, using fallback:', aiError);
      parsed = getDefaultSleepPlan();
    }

    // === STEP 6: Override spine score with deterministic calculation ===
    parsed.spineScore = spineScoreBreakdown.score;
    
    // Build spine score hint if AI didn't provide one
    if (!parsed.spineScoreHint) {
      parsed.spineScoreHint = `Your spine health score of ${spineScoreBreakdown.score}/100 reflects ${
        spineScoreBreakdown.score >= 70 ? 'a solid foundation for quality sleep' :
        spineScoreBreakdown.score >= 50 ? 'room for improvement in your sleep alignment' :
        'an opportunity to build better sleep habits'
      }. ${spineScoreBreakdown.trend === 'improving' ? 'Great progress!' : spineScoreBreakdown.trend === 'declining' ? 'Let\'s focus on stabilization.' : ''}`;
    }

    // === STEP 7: Save to database with snapshots and enhanced fields ===
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
        raw_ai_response: JSON.stringify({
          ...parsed,
          // Store enhanced v2 fields in raw response for UI access
          planHeadline: parsed.planHeadline,
          whyThisPlan: parsed.whyThisPlan,
          spineScoreHint: parsed.spineScoreHint,
          riskFocus: parsed.riskFocus,
          // Store metrics context for debugging/traceability
          metricsContext: {
            spineScoreBreakdown,
            riskAnalysis: { level: riskAnalysis.level, drivers: riskAnalysis.drivers },
            coachReadiness: { label: coachReadiness.label, score: coachReadiness.score },
            personalizationIntensity,
          },
        }),
        valid_until: validUntil.toISOString(),
        // Store snapshots for traceability (includes 3-layer data)
        profile_snapshot: profileSnapshot,
        logs_snapshot: enhancedLogsSnapshot,
        trend_at_generation: enhancedLogsSnapshot.trend,
        generated_reason: reason,
      })
      .select()
      .single();

    if (error) {
      console.error('[coach-generate-sleep-plan] Database error:', error);
      throw error;
    }

    console.log('[coach-generate-sleep-plan] Enhanced plan saved:', plan.id, {
      spineScore: parsed.spineScore,
      hasHeadline: !!parsed.planHeadline,
      hasWhyThisPlan: !!parsed.whyThisPlan,
    });

    // TRIGGER FULL SLEEP SYNC after plan creation (handles Klaviyo events + profile update)
    try {
      console.log('[Sleep Sync] Triggering fullSleepSync for plan generation:', email);
      const { attributes: syncedAttrs, event: sleepSyncEvent } = await fullSleepSync(
        supabase,
        email,
        'sleep_plan' as SleepSyncSource,
        KLAVIYO_PRIVATE_API_KEY || undefined
      );
      console.log('[Sleep Sync] Full sync completed after plan generation');

      // Update plan with klaviyo_events
      await supabase
        .from('coach_plans')
        .update({ klaviyo_events: [sleepSyncEvent] })
        .eq('id', plan.id);
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