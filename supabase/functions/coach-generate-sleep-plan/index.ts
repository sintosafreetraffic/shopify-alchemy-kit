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

    // === STEP 1: Fetch fresh profile, logs, 3-layer attributes, plan history, and wearable data ===
    // Freshness cap: only use wearable data from last 30 days
    const freshnessDate = new Date();
    freshnessDate.setDate(freshnessDate.getDate() - 30);
    const freshnessDateStr = freshnessDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Define baseline vs recent windows
    // Recent: last 7 days
    // Baseline: last 30 days excluding last 7 days
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentDateStr = recentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const [profileResult, logsResult, attrsResult, plansCountResult, wearableNightsResult, wearableSourcesResult, rawEventsResult, baselineNightsResult, recentNightsResult, activitySignalsResult, coachSignalsResult] = await Promise.all([
      supabase.from('sleep_profiles').select('*').eq('email', email).single(),
      supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(30), // Extended for pattern detection
      supabase.from('sleep_attributes_state').select('data').eq('email', email).maybeSingle(),
      supabase.from('coach_plans').select('id', { count: 'exact' }).eq('email', email),
      // Fetch wearable sleep data (Garmin, Apple Health) for richer AI context
      // Filters: not test, not split-segment, within 30-day freshness window
      supabase.from('sleep_nights')
        .select('night_date, total_sleep_minutes, sleep_efficiency, wake_events, source, device_model, start_time, end_time, timezone_offset_seconds')
        .eq('user_id', userId)
        .eq('is_test', false)
        .or('is_split_segment.is.null,is_split_segment.eq.false') // Exclude split segments
        .gte('night_date', freshnessDateStr) // 30-day freshness cap
        .order('night_date', { ascending: false })
        .limit(30),
      // Fetch connected wearable sources
      supabase.from('sleep_sources').select('source, status, connected_at, last_sync_at').eq('user_id', userId).eq('status', 'connected'),
      // Fetch raw events with sleep stages for architecture analysis
      // Filters: not test, has stages, within 30-day freshness window
      supabase.from('sleep_raw_events')
        .select('stages, start_time, end_time')
        .eq('user_id', userId)
        .eq('is_test', false)
        .not('stages', 'is', null)
        .gte('start_time', freshnessDate.toISOString()) // 30-day freshness cap
        .order('received_at', { ascending: false })
        .limit(30),
      // BASELINE: last 30 days excluding last 7 days
      supabase.from('sleep_nights')
        .select('night_date, total_sleep_minutes, sleep_efficiency, wake_events, start_time, timezone_offset_seconds')
        .eq('user_id', userId)
        .eq('is_test', false)
        .or('is_split_segment.is.null,is_split_segment.eq.false')
        .gte('night_date', freshnessDateStr)
        .lt('night_date', recentDateStr)
        .order('night_date', { ascending: false })
        .limit(30),
      // RECENT: last 7 days
      supabase.from('sleep_nights')
        .select('night_date, total_sleep_minutes, sleep_efficiency, wake_events, start_time, timezone_offset_seconds')
        .eq('user_id', userId)
        .eq('is_test', false)
        .or('is_split_segment.is.null,is_split_segment.eq.false')
        .gte('night_date', recentDateStr)
        .order('night_date', { ascending: false })
        .limit(10),
      // Fetch latest activity signals for coach context
      supabase.from('sleep_coach_activity_signals_daily')
        .select('training_load_label, late_workout_flag, late_workout_days_7d, most_common_activity_type, signal_freshness, workouts_count_7d')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Fetch coach signals from Health API (qualitative metrics)
      supabase.from('sleep_coach_metrics_daily')
        .select('signal_key, signal_value, calendar_date')
        .eq('user_id', userId)
        .order('calendar_date', { ascending: false })
        .limit(10),
    ]);

    const profile: SleepProfile | null = profileResult.data;
    const logs: SleepLog[] = logsResult.data || [];
    const wearableNights = wearableNightsResult.data || [];
    const connectedSources = wearableSourcesResult.data || [];
    const rawEvents = rawEventsResult.data || [];
    const baselineNights = baselineNightsResult.data || [];
    const recentNights = recentNightsResult.data || [];
    const activitySignals = activitySignalsResult.data;
    const coachSignals = coachSignalsResult.data || [];
    
    // Track existing plan count BEFORE inserting (for is_first_plan detection)
    const existingPlansCount = plansCountResult.count ?? 0;
    const isFirstPlan = existingPlansCount === 0;
    
    // Log wearable data availability
    console.log('[coach-generate-sleep-plan] Wearable data', {
      connectedSources: connectedSources.map((s: any) => s.source),
      wearableNightsCount: wearableNights.length,
      rawEventsWithStages: rawEvents.length,
      baselineNightsCount: baselineNights.length,
      activitySignals: activitySignals ? {
        training_load: activitySignals.training_load_label,
        late_workout: activitySignals.late_workout_flag,
        freshness: activitySignals.signal_freshness
      } : null,
      recentNightsCount: recentNights.length,
    });
    
    // === Helper to compute window metrics ===
    function computeWindowMetrics(nights: any[]): { nightsAnalyzed: number; avgSleepHours: number | null; avgEfficiency: number | null; avgWakeEvents: number | null; avgDeepPct: number | null; avgLightPct: number | null; avgRemPct: number | null; avgBedtimeHour: number | null; consistencyScore: 'consistent' | 'moderate' | 'irregular' | null } | null {
      if (nights.length < 1) return null;
      const valid = nights.filter((n: any) => n.total_sleep_minutes != null);
      if (valid.length < 1) return null;
      
      const avgMins = valid.reduce((s: number, n: any) => s + n.total_sleep_minutes, 0) / valid.length;
      const effNights = valid.filter((n: any) => n.sleep_efficiency != null);
      const avgEff = effNights.length > 0 ? effNights.reduce((s: number, n: any) => s + n.sleep_efficiency, 0) / effNights.length : null;
      const wakeNights = valid.filter((n: any) => n.wake_events != null);
      const avgWake = wakeNights.length > 0 ? wakeNights.reduce((s: number, n: any) => s + n.wake_events, 0) / wakeNights.length : null;
      
      // Bedtime consistency (simplified)
      let consistencyScore: 'consistent' | 'moderate' | 'irregular' | null = null;
      if (valid.length >= 3) {
        const bedtimes = valid.map((n: any) => {
          const dt = new Date(n.start_time);
          return dt.getHours() * 60 + dt.getMinutes();
        });
        const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
        const variance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / bedtimes.length;
        const stdDev = Math.sqrt(variance);
        consistencyScore = stdDev < 30 ? 'consistent' : stdDev < 60 ? 'moderate' : 'irregular';
      }
      
      return {
        nightsAnalyzed: valid.length,
        avgSleepHours: Math.round(avgMins / 60 * 10) / 10,
        avgEfficiency: avgEff ? Math.round(avgEff) : null,
        avgWakeEvents: avgWake ? Math.round(avgWake * 10) / 10 : null,
        avgDeepPct: null, // Stage data computed separately
        avgLightPct: null,
        avgRemPct: null,
        avgBedtimeHour: valid.length > 0 ? new Date(valid[0].start_time).getHours() : null,
        consistencyScore,
      };
    }
    
    const wearableBaseline = computeWindowMetrics(baselineNights);
    const wearableRecent = computeWindowMetrics(recentNights);
    
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
    
    // === Calculate sleep architecture from raw events (Option A) ===
    let sleepArchitecture: {
      avgDeepPct: number | null;
      avgLightPct: number | null;
      avgRemPct: number | null;
      avgAwakePct: number | null;
      nightsAnalyzed: number;
    } | null = null;
    
    if (rawEvents.length > 0) {
      let totalDeep = 0, totalLight = 0, totalRem = 0, totalAwake = 0, totalMinutes = 0;
      let validNightCount = 0;
      
      for (const event of rawEvents) {
        if (!event.stages || !Array.isArray(event.stages) || event.stages.length === 0) continue;
        
        // Calculate expected sleep duration from event timestamps
        const eventStartMs = new Date(event.start_time).getTime();
        const eventEndMs = new Date(event.end_time).getTime();
        const expectedDurationMin = (eventEndMs - eventStartMs) / 60000;
        
        let nightDeep = 0, nightLight = 0, nightRem = 0, nightAwake = 0;
        for (const stage of event.stages) {
          const startMs = new Date(stage.start_time).getTime();
          const endMs = new Date(stage.end_time).getTime();
          const durationMin = (endMs - startMs) / 60000;
          
          if (durationMin <= 0 || durationMin > 600) continue; // Skip invalid durations (>10h for single stage)
          
          switch (stage.stage) {
            case 'deep': nightDeep += durationMin; break;
            case 'light': nightLight += durationMin; break;
            case 'rem': nightRem += durationMin; break;
            case 'awake': nightAwake += durationMin; break;
          }
        }
        
        const nightTotal = nightDeep + nightLight + nightRem + nightAwake;
        
        // Validation: skip nights where stage duration differs from sleep duration by >15%
        if (expectedDurationMin > 0 && nightTotal > 0) {
          const durationDiffPct = Math.abs(nightTotal - expectedDurationMin) / expectedDurationMin;
          if (durationDiffPct > 0.15) {
            console.log('[coach-generate-sleep-plan] Skipping night with stage/duration mismatch', {
              expectedMin: Math.round(expectedDurationMin),
              stageTotal: Math.round(nightTotal),
              diffPct: Math.round(durationDiffPct * 100),
            });
            continue;
          }
        }
        
        if (nightTotal > 60) { // At least 1 hour of data
          totalDeep += nightDeep;
          totalLight += nightLight;
          totalRem += nightRem;
          totalAwake += nightAwake;
          totalMinutes += nightTotal;
          validNightCount++;
        }
      }
      
      // Only include architecture if we have >= 3 valid nights (acceptance criteria)
      if (validNightCount >= 3 && totalMinutes > 0) {
        sleepArchitecture = {
          avgDeepPct: Math.round((totalDeep / totalMinutes) * 100),
          avgLightPct: Math.round((totalLight / totalMinutes) * 100),
          avgRemPct: Math.round((totalRem / totalMinutes) * 100),
          avgAwakePct: Math.round((totalAwake / totalMinutes) * 100),
          nightsAnalyzed: validNightCount,
        };
        console.log('[coach-generate-sleep-plan] Sleep architecture calculated', sleepArchitecture);
      } else if (validNightCount > 0) {
        console.log('[coach-generate-sleep-plan] Insufficient nights for architecture', { validNightCount, required: 3 });
      }
    }
    
    // === Calculate bedtime timing patterns (Option B) ===
    let bedtimePatterns: {
      avgBedtimeHour: number | null; // 0-23
      avgBedtimeMinutes: number | null; // Minutes past midnight
      consistencyScore: 'consistent' | 'moderate' | 'irregular' | null;
      variabilityMinutes: number | null;
    } | null = null;
    
    if (wearableNights.length >= 3) {
      const bedtimesInMinutes: number[] = [];
      
      for (const night of wearableNights) {
        if (!night.start_time) continue;
        const startDate = new Date(night.start_time);
        
        // Apply timezone offset if available (convert UTC to local time)
        const tzOffsetSeconds = (night as any).timezone_offset_seconds;
        let localHours = startDate.getUTCHours();
        let localMinutes = startDate.getUTCMinutes();
        
        if (tzOffsetSeconds != null) {
          const offsetMinutes = tzOffsetSeconds / 60;
          localMinutes += offsetMinutes;
          localHours += Math.floor(localMinutes / 60);
          localMinutes = localMinutes % 60;
          if (localMinutes < 0) { localMinutes += 60; localHours -= 1; }
          localHours = ((localHours % 24) + 24) % 24; // Normalize to 0-23
        } else {
          // Fallback to JS Date local interpretation
          localHours = startDate.getHours();
          localMinutes = startDate.getMinutes();
        }
        
        // Convert to minutes past midnight (handling times past midnight as next day)
        let minutesPastMidnight = localHours * 60 + localMinutes;
        // If bedtime is before 6 PM, assume it's past midnight (e.g., 1 AM = 25*60 = 1500 mins)
        if (minutesPastMidnight < 18 * 60) {
          minutesPastMidnight += 24 * 60;
        }
        bedtimesInMinutes.push(minutesPastMidnight);
      }
      
      if (bedtimesInMinutes.length >= 3) {
        const avgBedtimeMinutes = Math.round(bedtimesInMinutes.reduce((a, b) => a + b, 0) / bedtimesInMinutes.length);
        const normalizedAvg = avgBedtimeMinutes >= 24 * 60 ? avgBedtimeMinutes - 24 * 60 : avgBedtimeMinutes;
        
        // Calculate variability (standard deviation proxy: avg absolute deviation from mean)
        const deviations = bedtimesInMinutes.map(t => Math.abs(t - avgBedtimeMinutes));
        const avgDeviation = Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length);
        
        // Classify consistency
        let consistencyScore: 'consistent' | 'moderate' | 'irregular';
        if (avgDeviation <= 30) {
          consistencyScore = 'consistent'; // <30 min variation
        } else if (avgDeviation <= 60) {
          consistencyScore = 'moderate'; // 30-60 min variation
        } else {
          consistencyScore = 'irregular'; // >60 min variation
        }
        
        bedtimePatterns = {
          avgBedtimeHour: Math.floor(normalizedAvg / 60),
          avgBedtimeMinutes: normalizedAvg,
          consistencyScore,
          variabilityMinutes: avgDeviation,
        };
        console.log('[coach-generate-sleep-plan] Bedtime patterns calculated', bedtimePatterns);
      }
    }
    
    // === Calculate wearable insights from sleep_nights ===
    let wearableInsights: {
      hasWearable: boolean;
      sources: string[];
      avgSleepMinutes: number | null;
      avgSleepEfficiency: number | null;
      avgWakeEvents: number | null;
      deviceModels: string[];
    } | null = null;
    
    if (wearableNights.length > 0) {
      const validNights = wearableNights.filter((n: any) => n.total_sleep_minutes != null);
      const avgSleepMinutes = validNights.length > 0 
        ? validNights.reduce((sum: number, n: any) => sum + n.total_sleep_minutes, 0) / validNights.length 
        : null;
      const avgSleepEfficiency = validNights.filter((n: any) => n.sleep_efficiency != null).length > 0
        ? validNights.filter((n: any) => n.sleep_efficiency != null).reduce((sum: number, n: any) => sum + n.sleep_efficiency, 0) / validNights.filter((n: any) => n.sleep_efficiency != null).length
        : null;
      const avgWakeEvents = validNights.filter((n: any) => n.wake_events != null).length > 0
        ? validNights.filter((n: any) => n.wake_events != null).reduce((sum: number, n: any) => sum + n.wake_events, 0) / validNights.filter((n: any) => n.wake_events != null).length
        : null;
      
      const sources = [...new Set(wearableNights.map((n: any) => n.source))];
      const deviceModels = [...new Set(wearableNights.map((n: any) => n.device_model).filter(Boolean))];
      
      wearableInsights = {
        hasWearable: true,
        sources,
        avgSleepMinutes,
        avgSleepEfficiency,
        avgWakeEvents,
        deviceModels,
      };
      
      console.log('[coach-generate-sleep-plan] Wearable insights calculated', wearableInsights);
    }
    
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
      // Wearable data additions
      wearable_connected: wearableInsights?.hasWearable || false,
      wearable_sources: wearableInsights?.sources || [],
      wearable_avg_sleep_hours: wearableInsights?.avgSleepMinutes ? Math.round(wearableInsights.avgSleepMinutes / 60 * 10) / 10 : null,
      wearable_avg_efficiency: wearableInsights?.avgSleepEfficiency ? Math.round(wearableInsights.avgSleepEfficiency) : null,
      wearable_avg_wake_events: wearableInsights?.avgWakeEvents ? Math.round(wearableInsights.avgWakeEvents * 10) / 10 : null,
      // Sleep architecture (Option A) - deep/light/REM percentages
      sleep_architecture: sleepArchitecture,
      // Bedtime patterns (Option B) - timing consistency
      bedtime_patterns: bedtimePatterns,
      // Baseline vs Recent windows for causal guardrails
      wearable_baseline: wearableBaseline,
      wearable_recent: wearableRecent,
      // Activity signals for coach context (qualitative only)
      activity_signals: activitySignals ? {
        training_load_label: activitySignals.training_load_label,
        late_workout_flag: activitySignals.late_workout_flag,
        late_workout_days_7d: activitySignals.late_workout_days_7d,
        most_common_activity_type: activitySignals.most_common_activity_type,
        signal_freshness: activitySignals.signal_freshness,
        workouts_count_7d: activitySignals.workouts_count_7d,
      } : null,
      // Coach signals from Health API (qualitative metrics from garmin_sleeps/garmin_dailies)
      coach_signals: coachSignals.length > 0 ? coachSignals.map((s: any) => ({
        signal_key: s.signal_key,
        signal_value: s.signal_value,
      })) : null,
    };

    // === LOG: Plan context summary with 3-layer data and wearables ===
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
      wearableData: wearableInsights ? {
        sources: wearableInsights.sources,
        avgSleepHours: enhancedLogsSnapshot.wearable_avg_sleep_hours,
        avgEfficiency: enhancedLogsSnapshot.wearable_avg_efficiency,
        avgWakeEvents: enhancedLogsSnapshot.wearable_avg_wake_events,
      } : 'none',
      // New: Sleep architecture from stages
      sleepArchitecture: sleepArchitecture ? {
        nightsAnalyzed: sleepArchitecture.nightsAnalyzed,
        avgDeepPct: sleepArchitecture.avgDeepPct,
        avgLightPct: sleepArchitecture.avgLightPct,
        avgRemPct: sleepArchitecture.avgRemPct,
      } : 'none',
      // New: Bedtime timing patterns
      bedtimePatterns: bedtimePatterns ? {
        avgBedtime: bedtimePatterns.avgBedtimeHour !== null 
          ? `${bedtimePatterns.avgBedtimeHour.toString().padStart(2, '0')}:${(bedtimePatterns.avgBedtimeMinutes! % 60).toString().padStart(2, '0')}`
          : 'unknown',
        consistency: bedtimePatterns.consistencyScore,
        variabilityMins: bedtimePatterns.variabilityMinutes,
      } : 'none',
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
    const klaviyoEvents: any[] = [];
    try {
      console.log('[Sleep Sync] Triggering fullSleepSync for plan generation:', email);
      const { attributes: syncedAttrs, event: sleepSyncEvent } = await fullSleepSync(
        supabase,
        email,
        'sleep_plan' as SleepSyncSource,
        KLAVIYO_PRIVATE_API_KEY || undefined
      );
      console.log('[Sleep Sync] Full sync completed after plan generation');
      klaviyoEvents.push(sleepSyncEvent);

      // === SEND RBN_SleepPlan_Created EVENT (with is_first_plan differentiation) ===
      if (KLAVIYO_PRIVATE_API_KEY) {
        const planCreatedEvent = {
          eventName: 'RBN_SleepPlan_Created',
          payload: {
            email,
            plan_id: plan.id,
            plan_type: planType,
            reason,
            is_first_plan: isFirstPlan,
            total_plans: existingPlansCount + 1,
            spine_health_score: parsed.spineScore,
            timestamp: new Date().toISOString(),
          },
        };
        
        console.log(`[Klaviyo] Sending RBN_SleepPlan_Created event (is_first_plan: ${isFirstPlan})`);
        
        const klaviyoResponse = await fetch('https://a.klaviyo.com/api/events/', {
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
                metric: { data: { type: 'metric', attributes: { name: 'RBN_SleepPlan_Created' } } },
                profile: { data: { type: 'profile', attributes: { email } } },
                properties: planCreatedEvent.payload,
                time: new Date().toISOString(),
              },
            },
          }),
        });
        
        if (!klaviyoResponse.ok) {
          const errorText = await klaviyoResponse.text();
          console.error('[Klaviyo] RBN_SleepPlan_Created event error:', errorText);
        } else {
          console.log('[Klaviyo] RBN_SleepPlan_Created event sent successfully');
          klaviyoEvents.push(planCreatedEvent);
        }
      }

      // Update plan with klaviyo_events
      await supabase
        .from('coach_plans')
        .update({ klaviyo_events: klaviyoEvents })
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