/**
 * Sleep Sync - Centralized 3-Layer Personalization Engine
 * 
 * LAYER 1: Static Identity - who the sleeper is (from quiz, rarely changes)
 * LAYER 2: Semi-Static Environment - their sleep setup (user editable)
 * LAYER 3: Dynamic State - how their sleep behaves over time (computed)
 * 
 * All numerical calculations are deterministic - NO AI involved.
 * This module is the single source of truth for SleepAttributes generation.
 * 
 * TRIGGERS:
 * - sleep_log: New sleep log submitted
 * - quiz_completion: Quiz completed/retaken
 * - shopify_order: Order webhook received
 * - setup_update: Environment fields changed
 * - dashboard_visit: User visits dashboard (optional)
 * - sleep_plan_generated: Plan was created
 * - manual: Manual sync triggered
 * - daily_cron: Daily scheduled sync
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SleepAttributes,
  SleepLog,
  SleepProfile,
  EngagementMeta,
  SleepSyncEvent,
  SleepSyncSource,
  Level3,
  Trend3,
  PurchaseStatus,
  AppUsageType,
  ChannelPreference,
  MattressThickness,
  MattressFirmness,
  BedHeight,
  CoSleeping,
  BeddingMaterial,
  PillowType,
  SCHEMA_VERSION,
  getDefaultSleepAttributes,
} from "./types.ts";

// ============= Helper Functions =============

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function calculateSleepTrend(recentLogs: SleepLog[], olderLogs: SleepLog[]): Trend3 {
  if (recentLogs.length < 3 || olderLogs.length < 3) return "unknown";
  
  const recentAvg = recentLogs.reduce((s, l) => s + l.sleep_quality, 0) / recentLogs.length;
  const olderAvg = olderLogs.reduce((s, l) => s + l.sleep_quality, 0) / olderLogs.length;
  
  if (recentAvg - olderAvg > 0.5) return "improving";
  if (olderAvg - recentAvg > 0.5) return "worsening";
  return "stable";
}

function calculatePainTrend(recentLogs: SleepLog[], olderLogs: SleepLog[]): Trend3 {
  if (recentLogs.length < 3 || olderLogs.length < 3) return "unknown";
  
  const recentAvg = recentLogs.reduce((s, l) => s + l.pain_level_morning, 0) / recentLogs.length;
  const olderAvg = olderLogs.reduce((s, l) => s + l.pain_level_morning, 0) / olderLogs.length;
  
  // For pain, lower is better
  if (olderAvg - recentAvg > 0.5) return "improving";
  if (recentAvg - olderAvg > 0.5) return "worsening";
  return "stable";
}

function calculateStressLevel(stressed7d: number, stressed14d: number): Level3 {
  if (stressed14d >= 4 || stressed7d >= 3) return "high";
  if (stressed14d >= 2 || stressed7d >= 1) return "medium";
  return "low";
}

function calculateLogConsistency(logsInPeriod: number, periodDays: number): number {
  return Math.round((logsInPeriod / periodDays) * 100);
}

/**
 * DETERMINISTIC: Purchase status from order count
 */
function calculatePurchaseStatus(ordersCount: number): PurchaseStatus {
  if (ordersCount === 0) return "not_bought";
  if (ordersCount === 1) return "bought_once";
  return "repeat_buyer";
}

/**
 * DETERMINISTIC: Is new customer if first order <= 30 days ago
 */
function calculateIsNewCustomer(daysSinceFirstOrder: number | null): boolean {
  if (daysSinceFirstOrder === null) return false;
  return daysSinceFirstOrder <= 30;
}

/**
 * DETERMINISTIC: App usage type based on concrete flags
 */
function calculateAppUsageType(
  usedQuiz: boolean,
  hasLogs: boolean,
  hasDashboardVisit: boolean,
  usedPlan: boolean
): AppUsageType {
  if (hasLogs && (hasDashboardVisit || usedPlan)) return "full_user";
  if (hasDashboardVisit && !hasLogs) return "dashboard_user";
  if (hasLogs && !hasDashboardVisit) return "sleep_log_user";
  if (usedQuiz && !hasLogs && !hasDashboardVisit) return "quiz_only";
  return "none";
}

/**
 * DETERMINISTIC: Engagement level from measurable factors
 */
function calculateEngagementLevel(
  logConsistency: number,
  dashboardVisitDays: number | null,
  whatsappInteractionDays: number | null,
  coachEngagement: Level3
): Level3 {
  let score = 0;
  
  // Log consistency: 40%
  score += (logConsistency / 100) * 40;
  
  // Dashboard visits: 20%
  if (dashboardVisitDays !== null) {
    if (dashboardVisitDays <= 1) score += 20;
    else if (dashboardVisitDays <= 3) score += 15;
    else if (dashboardVisitDays <= 7) score += 10;
    else if (dashboardVisitDays <= 14) score += 5;
  }
  
  // WhatsApp: 20%
  if (whatsappInteractionDays !== null) {
    if (whatsappInteractionDays <= 1) score += 20;
    else if (whatsappInteractionDays <= 3) score += 15;
    else if (whatsappInteractionDays <= 7) score += 10;
  }
  
  // Coach: 20%
  if (coachEngagement === "high") score += 20;
  else if (coachEngagement === "medium") score += 10;
  
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function calculateAICoachEngagement(
  usedPlan: boolean,
  planCount: number,
  lastPlanDaysAgo: number | null
): Level3 {
  if (!usedPlan) return "low";
  
  let score = 0;
  if (planCount >= 3) score += 40;
  else if (planCount >= 1) score += 20;
  
  if (lastPlanDaysAgo !== null) {
    if (lastPlanDaysAgo <= 7) score += 40;
    else if (lastPlanDaysAgo <= 14) score += 25;
    else if (lastPlanDaysAgo <= 30) score += 10;
  }
  
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function calculateRiskLevel(
  sleepTrend: Trend3,
  painTrend: Trend3,
  engagementLevel: Level3,
  complaintFlag: boolean,
  refundRiskFlag: boolean
): Level3 {
  let riskScore = 0;
  
  if (sleepTrend === "worsening") riskScore += 25;
  else if (sleepTrend === "unknown") riskScore += 10;
  
  if (painTrend === "worsening") riskScore += 25;
  else if (painTrend === "unknown") riskScore += 10;
  
  if (engagementLevel === "low") riskScore += 20;
  else if (engagementLevel === "medium") riskScore += 5;
  
  if (complaintFlag) riskScore += 20;
  if (refundRiskFlag) riskScore += 15;
  
  if (riskScore >= 50) return "high";
  if (riskScore >= 25) return "medium";
  return "low";
}

function calculateChurnRiskScore(
  lastLogDaysAgo: number | null,
  engagementLevel: Level3,
  sleepTrend: Trend3,
  complaintFlag: boolean
): number {
  let score = 0;
  
  if (lastLogDaysAgo === null) score += 40;
  else if (lastLogDaysAgo >= 14) score += 35;
  else if (lastLogDaysAgo >= 7) score += 20;
  else if (lastLogDaysAgo >= 3) score += 10;
  
  if (engagementLevel === "low") score += 25;
  else if (engagementLevel === "medium") score += 10;
  
  if (sleepTrend === "worsening") score += 20;
  else if (sleepTrend === "unknown") score += 10;
  
  if (complaintFlag) score += 15;
  
  return Math.min(100, score);
}

function calculateUpsellScore(
  sleepTrend: Trend3,
  painTrend: Trend3,
  engagementLevel: Level3,
  purchaseStatus: PurchaseStatus,
  ordersCount: number
): number {
  let score = 0;
  
  if (sleepTrend === "improving") score += 25;
  else if (sleepTrend === "stable") score += 15;
  
  if (painTrend === "improving") score += 25;
  else if (painTrend === "stable") score += 15;
  
  if (engagementLevel === "high") score += 30;
  else if (engagementLevel === "medium") score += 15;
  
  if (purchaseStatus === "repeat_buyer") score += 20;
  else if (purchaseStatus === "bought_once") score += 10;
  
  return Math.min(100, score);
}

function calculateAffiliatePotentialScore(
  sleepTrend: Trend3,
  engagementLevel: Level3,
  purchaseStatus: PurchaseStatus,
  riskLevel: Level3
): number {
  let score = 0;
  
  if (sleepTrend === "improving") score += 35;
  else if (sleepTrend === "stable") score += 20;
  
  if (engagementLevel === "high") score += 30;
  else if (engagementLevel === "medium") score += 15;
  
  if (purchaseStatus === "repeat_buyer") score += 25;
  else if (purchaseStatus === "bought_once") score += 15;
  
  if (riskLevel === "low") score += 10;
  else if (riskLevel === "high") score -= 20;
  
  return Math.max(0, Math.min(100, score));
}

function determinePreferredChannel(
  whatsappEnabled: boolean,
  whatsappInteractionDays: number | null,
  emailOpens: number
): ChannelPreference {
  const hasWhatsappActivity = whatsappEnabled && whatsappInteractionDays !== null && whatsappInteractionDays <= 14;
  const hasEmailActivity = emailOpens > 0;
  
  if (hasWhatsappActivity && hasEmailActivity) return "both";
  if (hasWhatsappActivity) return "whatsapp";
  if (hasEmailActivity) return "email";
  return "unknown";
}

// ============= Main Generation Function =============

/**
 * Generate SleepAttributes from database data
 * Implements the 3-layer personalization engine:
 * - Layer 1: Static Identity (from profile)
 * - Layer 2: Semi-Static Environment (from profile environment fields)
 * - Layer 3: Dynamic State (computed from logs, engagement, purchases)
 */
export async function generateSleepAttributes(
  supabase: any,
  email: string,
  source: SleepSyncSource = "manual"
): Promise<SleepAttributes> {
  const now = new Date();
  
  console.log(`[Sleep Sync] Generating 3-layer attributes for: ${email}, source: ${source}`);
  
  // Start with defaults
  const attrs = getDefaultSleepAttributes(email, source);
  
  // Fetch all required data
  const [profileResult, logsResult, engagementResult, plansResult] = await Promise.all([
    supabase.from('sleep_profiles').select('*').eq('email', email).maybeSingle(),
    supabase.from('sleep_logs').select('*').eq('email', email).order('date', { ascending: false }).limit(30),
    supabase.from('engagement_meta').select('*').eq('email', email).maybeSingle(),
    supabase.from('coach_plans').select('id, created_at').eq('email', email).order('created_at', { ascending: false }),
  ]);

  const profile: SleepProfile | null = profileResult.data;
  const sleepLogs: SleepLog[] = logsResult.data || [];
  const engagementMeta: EngagementMeta | null = engagementResult.data;
  const plans = plansResult.data || [];

  // ==========================================
  // LAYER 1: STATIC IDENTITY
  // ==========================================
  if (profile) {
    attrs.sleep_position = profile.sleep_position || "side";
    attrs.pain_points = profile.pain_points || [];
    attrs.temperature_preference = profile.temperature_preference || "neutral";
    attrs.stress_level = profile.stress_level || "medium";
    attrs.wake_up_condition = profile.wake_up_condition || "neutral";
    attrs.products_owned = profile.products_owned || [];
    attrs.quiz_completed = profile.quiz_completed || false;
  }

  // ==========================================
  // LAYER 2: SEMI-STATIC ENVIRONMENT
  // ==========================================
  if (profile) {
    attrs.mattress_thickness = (profile.mattress_thickness as MattressThickness) || "medium";
    attrs.mattress_firmness = (profile.mattress_firmness as MattressFirmness) || "medium";
    attrs.bed_height = (profile.bed_height as BedHeight) || "standard";
    attrs.co_sleeping = (profile.co_sleeping as CoSleeping) || "alone";
    attrs.bedding_material = (profile.bedding_material as BeddingMaterial) || "cotton";
    attrs.pillow_type = (profile.pillow_type as PillowType) || "standard";
    attrs.environment_updated_at = profile.environment_updated_at || null;
    
    // Room environment from quiz_data
    if (profile.quiz_data) {
      attrs.room_brightness = profile.quiz_data.roomBrightness || "dark";
      attrs.room_noise = profile.quiz_data.roomNoise || "quiet";
    }
  }

  // ==========================================
  // LAYER 3: DYNAMIC STATE
  // ==========================================
  
  // Calculate log-based metrics
  const logs7d = sleepLogs.filter(log => daysBetween(new Date(log.date), now) <= 7);
  const logs14d = sleepLogs.filter(log => daysBetween(new Date(log.date), now) <= 14);
  const recentLogs = logs7d;
  const olderLogs = sleepLogs.filter(log => {
    const days = daysBetween(new Date(log.date), now);
    return days > 7 && days <= 14;
  });

  // Averages
  attrs.avg_sleep_quality_7d = calculateAverage(logs7d.map(l => l.sleep_quality));
  attrs.avg_sleep_quality_14d = calculateAverage(logs14d.map(l => l.sleep_quality));
  attrs.avg_pain_7d = calculateAverage(logs7d.map(l => l.pain_level_morning));
  attrs.avg_pain_14d = calculateAverage(logs14d.map(l => l.pain_level_morning));

  // Nights counts
  attrs.hot_nights_7d = logs7d.filter(l => l.felt_hot).length;
  attrs.hot_nights_14d = logs14d.filter(l => l.felt_hot).length;
  attrs.stressed_nights_7d = logs7d.filter(l => l.felt_stressed).length;
  attrs.stressed_nights_14d = logs14d.filter(l => l.felt_stressed).length;

  // Trends
  attrs.sleep_trend = calculateSleepTrend(recentLogs, olderLogs);
  attrs.pain_trend = calculatePainTrend(recentLogs, olderLogs);

  // Last log
  attrs.last_log_days_ago = sleepLogs.length > 0
    ? daysBetween(new Date(sleepLogs[0].date), now)
    : null;

  // Streak and consistency
  attrs.streak_days = engagementMeta?.total_streak_days || 0;
  attrs.log_consistency_score = calculateLogConsistency(logs14d.length, 14);
  attrs.temperature_sensitive = attrs.hot_nights_14d >= 3 || profile?.temperature_preference === 'warm';
  attrs.sleep_stress_level = calculateStressLevel(attrs.stressed_nights_7d, attrs.stressed_nights_14d);

  // Engagement metrics
  const lastDashboardVisitDaysAgo = engagementMeta?.last_seen_at
    ? daysBetween(new Date(engagementMeta.last_seen_at), now)
    : null;
  const lastWhatsappInteractionDaysAgo = engagementMeta?.last_whatsapp_nudge_at
    ? daysBetween(new Date(engagementMeta.last_whatsapp_nudge_at), now)
    : null;

  attrs.last_dashboard_visit_days_ago = lastDashboardVisitDaysAgo;
  attrs.last_whatsapp_interaction_days_ago = lastWhatsappInteractionDaysAgo;
  attrs.whatsapp_enabled = profile?.whatsapp_enabled || false;

  // Coach engagement
  const usedPlan = plans.length > 0;
  const lastPlanDaysAgo = plans.length > 0
    ? daysBetween(new Date(plans[0].created_at), now)
    : null;
  attrs.ai_coach_engagement_level = calculateAICoachEngagement(usedPlan, plans.length, lastPlanDaysAgo);
  
  // Plan tracking
  attrs.last_plan_generated_at = plans.length > 0 ? plans[0].created_at : null;
  attrs.days_since_last_plan = lastPlanDaysAgo;
  attrs.total_plans_generated = plans.length;

  // Overall engagement
  attrs.engagement_level = calculateEngagementLevel(
    attrs.log_consistency_score,
    lastDashboardVisitDaysAgo,
    lastWhatsappInteractionDaysAgo,
    attrs.ai_coach_engagement_level
  );

  // Purchase behavior - FULLY DETERMINISTIC
  const ordersCount = profile?.purchase_count || 0;
  attrs.orders_count = ordersCount;
  attrs.purchase_status = calculatePurchaseStatus(ordersCount);
  
  // Days since order
  if (profile?.delivery_date) {
    const daysSinceOrder = daysBetween(new Date(profile.delivery_date), now);
    attrs.days_since_first_order = daysSinceOrder;
    attrs.days_since_last_order = daysSinceOrder;
    attrs.is_new_customer = calculateIsNewCustomer(daysSinceOrder);
  }

  // Risk flags
  attrs.has_returned_pillow = false;
  attrs.complaint_flag = false;
  attrs.refund_risk_flag = attrs.pain_trend === "worsening" && (attrs.avg_pain_7d ?? 0) >= 6;

  // App usage type
  attrs.used_sleep_quiz = profile?.quiz_completed || false;
  attrs.used_sleep_plan = usedPlan;
  attrs.app_usage_type = calculateAppUsageType(
    attrs.used_sleep_quiz,
    sleepLogs.length > 0,
    lastDashboardVisitDaysAgo !== null,
    usedPlan
  );

  // Risk and opportunity scores
  attrs.risk_level = calculateRiskLevel(
    attrs.sleep_trend,
    attrs.pain_trend,
    attrs.engagement_level,
    attrs.complaint_flag,
    attrs.refund_risk_flag
  );
  attrs.churn_risk_score = calculateChurnRiskScore(
    attrs.last_log_days_ago,
    attrs.engagement_level,
    attrs.sleep_trend,
    attrs.complaint_flag
  );
  attrs.upsell_score = calculateUpsellScore(
    attrs.sleep_trend,
    attrs.pain_trend,
    attrs.engagement_level,
    attrs.purchase_status,
    ordersCount
  );
  attrs.affiliate_potential_score = calculateAffiliatePotentialScore(
    attrs.sleep_trend,
    attrs.engagement_level,
    attrs.purchase_status,
    attrs.risk_level
  );

  // Channel preference
  attrs.prefers_channel = determinePreferredChannel(
    attrs.whatsapp_enabled,
    lastWhatsappInteractionDaysAgo,
    attrs.email_opens_last_30d
  );

  console.log(`[Sleep Sync] 3-layer attributes generated for: ${email}`);
  return attrs;
}

/**
 * Build Klaviyo Sleep Sync event payload
 * Includes all 3 layers for full Klaviyo profile sync
 */
export function buildSleepSyncEvent(attrs: SleepAttributes, source: string = "sleep_sync_v2"): SleepSyncEvent {
  return {
    eventName: "RBN_SleepSync_Updated",
    payload: {
      // Schema info
      schema_version: attrs.schema_version,
      source,
      timestamp: new Date().toISOString(),
      
      // User identity
      email: attrs.email,
      generated_at: attrs.generated_at,
      
      // === LAYER 1: STATIC IDENTITY ===
      sleep_position: attrs.sleep_position,
      pain_points: attrs.pain_points,
      temperature_preference: attrs.temperature_preference,
      stress_level: attrs.stress_level,
      wake_up_condition: attrs.wake_up_condition,
      products_owned: attrs.products_owned,
      quiz_completed: attrs.quiz_completed,
      
      // === LAYER 2: SEMI-STATIC ENVIRONMENT (rbn_ prefixed for Klaviyo) ===
      rbn_mattress_thickness: attrs.mattress_thickness,
      rbn_mattress_firmness: attrs.mattress_firmness,
      rbn_bed_height: attrs.bed_height,
      rbn_co_sleeping: attrs.co_sleeping,
      rbn_bedding_material: attrs.bedding_material,
      rbn_pillow_type: attrs.pillow_type,
      rbn_room_brightness: attrs.room_brightness,
      rbn_room_noise: attrs.room_noise,
      rbn_environment_updated_at: attrs.environment_updated_at,
      
      // === LAYER 3: DYNAMIC STATE ===
      // Sleep metrics
      sleep_trend: attrs.sleep_trend,
      pain_trend: attrs.pain_trend,
      sleep_stress_level: attrs.sleep_stress_level,
      avg_sleep_quality_7d: attrs.avg_sleep_quality_7d,
      avg_sleep_quality_14d: attrs.avg_sleep_quality_14d,
      avg_pain_7d: attrs.avg_pain_7d,
      avg_pain_14d: attrs.avg_pain_14d,
      hot_nights_7d: attrs.hot_nights_7d,
      stressed_nights_7d: attrs.stressed_nights_7d,
      streak_days: attrs.streak_days,
      last_log_days_ago: attrs.last_log_days_ago,
      log_consistency_score: attrs.log_consistency_score,
      temperature_sensitive: attrs.temperature_sensitive,
      
      // Engagement
      engagement_level: attrs.engagement_level,
      ai_coach_engagement_level: attrs.ai_coach_engagement_level,
      last_dashboard_visit_days_ago: attrs.last_dashboard_visit_days_ago,
      whatsapp_enabled: attrs.whatsapp_enabled,
      
      // Purchase lifecycle
      purchase_status: attrs.purchase_status,
      orders_count: attrs.orders_count,
      is_new_customer: attrs.is_new_customer,
      days_since_first_order: attrs.days_since_first_order,
      
      // App usage
      app_usage_type: attrs.app_usage_type,
      used_sleep_quiz: attrs.used_sleep_quiz,
      used_sleep_plan: attrs.used_sleep_plan,
      
      // Risk & opportunity
      risk_level: attrs.risk_level,
      churn_risk_score: attrs.churn_risk_score,
      upsell_score: attrs.upsell_score,
      affiliate_potential_score: attrs.affiliate_potential_score,
      
      // Channel
      prefers_channel: attrs.prefers_channel,
      
      // Plan tracking
      last_plan_generated_at: attrs.last_plan_generated_at,
      days_since_last_plan: attrs.days_since_last_plan,
      total_plans_generated: attrs.total_plans_generated,
    },
  };
}

/**
 * Build Klaviyo profile properties for $set operation
 * Mirrors all attributes to Klaviyo profile
 */
export function buildKlaviyoProfileProperties(attrs: SleepAttributes): Record<string, any> {
  return {
    // Layer 1: Static Identity
    rbn_sleep_position: attrs.sleep_position,
    rbn_pain_points: attrs.pain_points.join(', '),
    rbn_temperature_preference: attrs.temperature_preference,
    rbn_stress_level: attrs.stress_level,
    rbn_wake_up_condition: attrs.wake_up_condition,
    rbn_products_owned: attrs.products_owned.join(', '),
    rbn_quiz_completed: attrs.quiz_completed,
    
    // Layer 2: Semi-Static Environment
    rbn_mattress_thickness: attrs.mattress_thickness,
    rbn_mattress_firmness: attrs.mattress_firmness,
    rbn_bed_height: attrs.bed_height,
    rbn_co_sleeping: attrs.co_sleeping,
    rbn_bedding_material: attrs.bedding_material,
    rbn_pillow_type: attrs.pillow_type,
    rbn_room_brightness: attrs.room_brightness,
    rbn_room_noise: attrs.room_noise,
    
    // Layer 3: Dynamic State
    rbn_sleep_trend: attrs.sleep_trend,
    rbn_pain_trend: attrs.pain_trend,
    rbn_avg_sleep_quality_7d: attrs.avg_sleep_quality_7d,
    rbn_avg_pain_7d: attrs.avg_pain_7d,
    rbn_streak_days: attrs.streak_days,
    rbn_engagement_level: attrs.engagement_level,
    rbn_purchase_status: attrs.purchase_status,
    rbn_risk_level: attrs.risk_level,
    rbn_upsell_score: attrs.upsell_score,
    rbn_churn_risk_score: attrs.churn_risk_score,
    rbn_last_sync_at: attrs.generated_at,
  };
}

/**
 * Build WhatsApp-specific Klaviyo event
 */
export function buildWhatsAppEvent(
  eventType: string,
  email: string,
  attrs: SleepAttributes | null,
  additionalProps: Record<string, any> = {}
): SleepSyncEvent {
  return {
    eventName: eventType,
    payload: {
      email,
      sleep_quality_last_night: attrs?.avg_sleep_quality_7d ?? null,
      streak_days: attrs?.streak_days ?? 0,
      sleep_trend: attrs?.sleep_trend ?? "unknown",
      pain_trend: attrs?.pain_trend ?? "unknown",
      engagement_level: attrs?.engagement_level ?? "low",
      source: "sleep_coach_v2",
      timestamp: new Date().toISOString(),
      ...additionalProps,
    },
  };
}

/**
 * Store attributes in database and optionally send to Klaviyo
 * This is the unified sync function used by all triggers
 */
export async function syncAndStoreAttributes(
  supabase: any,
  email: string,
  source: SleepSyncSource = "manual"
): Promise<{ attributes: SleepAttributes; event: SleepSyncEvent }> {
  console.log(`[Sleep Sync] Starting 3-layer sync for: ${email}, source: ${source}`);
  
  const attributes = await generateSleepAttributes(supabase, email, source);
  const event = buildSleepSyncEvent(attributes, source);

  // Store in state table
  const { error: upsertError } = await supabase
    .from('sleep_attributes_state')
    .upsert({
      email,
      data: attributes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

  if (upsertError) {
    console.error('[Sleep Sync] Error storing state:', upsertError);
    throw upsertError;
  }

  // Store in history table
  await supabase
    .from('sleep_attributes_history')
    .insert({ email, data: attributes });

  console.log(`[Sleep Sync] 3-layer attributes synced successfully for: ${email}`);

  return { attributes, event };
}

/**
 * Update Klaviyo profile with $set operation
 */
export async function updateKlaviyoProfile(
  apiKey: string,
  email: string,
  attrs: SleepAttributes
): Promise<void> {
  const properties = buildKlaviyoProfileProperties(attrs);
  
  console.log(`[Klaviyo] Updating profile properties for: ${email}`);
  
  const response = await fetch('https://a.klaviyo.com/api/profiles/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'Content-Type': 'application/json',
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: {
          email,
          properties,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Handle duplicate profile case
    if (response.status === 409) {
      // Profile exists, need to PATCH instead
      const profileData = JSON.parse(errorText);
      const profileId = profileData.errors?.[0]?.meta?.duplicate_profile_id;
      if (profileId) {
        await fetch(`https://a.klaviyo.com/api/profiles/${profileId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-02-15',
          },
          body: JSON.stringify({
            data: {
              type: 'profile',
              id: profileId,
              attributes: { properties },
            },
          }),
        });
        console.log(`[Klaviyo] Profile updated via PATCH for: ${email}`);
        return;
      }
    }
    console.error(`[Klaviyo] Profile update error: ${errorText}`);
    throw new Error(`Klaviyo API error: ${response.status}`);
  }
  
  console.log(`[Klaviyo] Profile properties updated for: ${email}`);
}

/**
 * Send event to Klaviyo
 */
export async function sendKlaviyoEvent(
  apiKey: string,
  email: string,
  eventName: string,
  properties: Record<string, any>
): Promise<void> {
  console.log(`[Klaviyo] Sending event: ${eventName} for: ${email}`);
  
  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'Content-Type': 'application/json',
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: { data: { type: 'metric', attributes: { name: eventName } } },
          profile: { data: { type: 'profile', attributes: { email } } },
          properties,
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Klaviyo] Event error: ${errorText}`);
    throw new Error(`Klaviyo API error: ${response.status}`);
  }
  
  console.log(`[Klaviyo] Event sent successfully: ${eventName}`);
}

/**
 * Full sync: Generate attributes, store, send event, update profile
 */
export async function fullSleepSync(
  supabase: any,
  email: string,
  source: SleepSyncSource,
  klaviyoApiKey?: string
): Promise<{ attributes: SleepAttributes; event: SleepSyncEvent }> {
  const { attributes, event } = await syncAndStoreAttributes(supabase, email, source);
  
  if (klaviyoApiKey) {
    try {
      // Send event
      await sendKlaviyoEvent(klaviyoApiKey, email, event.eventName, event.payload);
      // Update profile properties
      await updateKlaviyoProfile(klaviyoApiKey, email, attributes);
    } catch (klaviyoError) {
      console.error('[Sleep Sync] Klaviyo sync error (non-blocking):', klaviyoError);
    }
  }
  
  return { attributes, event };
}
