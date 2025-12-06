import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Type definitions
type Level3 = "low" | "medium" | "high";
type Trend3 = "improving" | "stable" | "worsening" | "unknown";

interface SleepAttributes {
  email: string;
  // --- Sleep condition & trends ---
  sleep_stress_level: Level3;
  sleep_trend: Trend3;
  pain_trend: Trend3;
  avg_sleep_quality_7d: number | null;
  avg_sleep_quality_14d: number | null;
  avg_pain_7d: number | null;
  avg_pain_14d: number | null;
  hot_nights_7d: number;
  hot_nights_14d: number;
  stressed_nights_7d: number;
  stressed_nights_14d: number;
  streak_days: number;
  last_log_days_ago: number | null;
  log_consistency_score: number;
  temperature_sensitive: boolean;

  // --- Engagement / behavior ---
  engagement_level: Level3;
  last_dashboard_visit_days_ago: number | null;
  last_whatsapp_interaction_days_ago: number | null;
  ai_coach_engagement_level: Level3;
  pdf_opens_last_30d: number;
  email_opens_last_30d: number;
  whatsapp_enabled: boolean;

  // --- Purchase behavior / lifecycle ---
  purchase_status: "not_bought" | "bought_once" | "repeat_buyer";
  orders_count: number;
  days_since_last_order: number | null;
  is_new_customer: boolean;
  has_returned_pillow: boolean;
  refund_risk_flag: boolean;
  complaint_flag: boolean;

  // --- App usage / feature adoption ---
  app_usage_type: "none" | "quiz_only" | "sleep_log_user" | "dashboard_user" | "full_user";
  used_sleep_quiz: boolean;
  used_sleep_plan: boolean;
  used_pillow_wizard: boolean;
  deep_sleep_supported: boolean;
  wearable_connected: boolean;

  // --- Opportunity / risk scoring ---
  risk_level: Level3;
  upsell_score: number;
  churn_risk_score: number;
  affiliate_potential_score: number;

  // --- Channel preferences ---
  prefers_channel: "email" | "whatsapp" | "both" | "unknown";
}

interface SleepLog {
  id: string;
  email: string;
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot: boolean;
  felt_stressed: boolean;
  time_to_sleep_minutes: number | null;
  wake_ups_per_night: number | null;
  notes: string | null;
  created_at: string;
}

interface SleepProfile {
  email: string;
  sleep_position: string;
  pain_points: string[];
  stress_level: string;
  temperature_preference: string;
  wake_up_condition: string;
  products_owned: string[];
  whatsapp_enabled: boolean;
  whatsapp_phone: string | null;
  purchase_count: number;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

interface EngagementMeta {
  email: string;
  last_seen_at: string | null;
  last_whatsapp_nudge_at: string | null;
  total_streak_days: number;
  inactivity_detected: boolean;
  decline_detected: boolean;
  improvement_detected: boolean;
  last_evaluation_at: string | null;
}

// Helper functions
function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
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
  
  // For pain, lower is better, so improving means recent < older
  if (olderAvg - recentAvg > 0.5) return "improving";
  if (recentAvg - olderAvg > 0.5) return "worsening";
  return "stable";
}

function calculateStressLevel(stressed7d: number, stressed14d: number): Level3 {
  if (stressed14d >= 4 || stressed7d >= 3) return "high";
  if (stressed14d >= 2 || stressed7d >= 1) return "medium";
  return "low";
}

function calculateLogConsistencyScore(logsInPeriod: number, periodDays: number): number {
  return Math.round((logsInPeriod / periodDays) * 100);
}

function calculateEngagementLevel(
  logConsistency: number,
  dashboardVisitDays: number | null,
  whatsappInteractionDays: number | null,
  coachEngagement: Level3
): Level3 {
  let score = 0;
  
  // Log consistency contributes 40%
  score += (logConsistency / 100) * 40;
  
  // Dashboard visits contribute 20%
  if (dashboardVisitDays !== null) {
    if (dashboardVisitDays <= 1) score += 20;
    else if (dashboardVisitDays <= 3) score += 15;
    else if (dashboardVisitDays <= 7) score += 10;
    else if (dashboardVisitDays <= 14) score += 5;
  }
  
  // WhatsApp interaction contributes 20%
  if (whatsappInteractionDays !== null) {
    if (whatsappInteractionDays <= 1) score += 20;
    else if (whatsappInteractionDays <= 3) score += 15;
    else if (whatsappInteractionDays <= 7) score += 10;
  }
  
  // Coach engagement contributes 20%
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

function calculateAppUsageType(
  usedQuiz: boolean,
  hasLogs: boolean,
  hasDashboardVisit: boolean,
  usedPlan: boolean
): "none" | "quiz_only" | "sleep_log_user" | "dashboard_user" | "full_user" {
  if (hasLogs && hasDashboardVisit && usedPlan) return "full_user";
  if (hasLogs && !hasDashboardVisit) return "sleep_log_user";
  if (hasDashboardVisit && !hasLogs) return "dashboard_user";
  if (usedQuiz && !hasLogs && !hasDashboardVisit) return "quiz_only";
  return "none";
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
  purchaseStatus: string,
  ordersCount: number
): number {
  let score = 0;
  
  // Improving trends = more likely to upsell
  if (sleepTrend === "improving") score += 25;
  else if (sleepTrend === "stable") score += 15;
  
  if (painTrend === "improving") score += 25;
  else if (painTrend === "stable") score += 15;
  
  // Higher engagement = more likely to buy
  if (engagementLevel === "high") score += 30;
  else if (engagementLevel === "medium") score += 15;
  
  // Existing customers more likely to buy again
  if (purchaseStatus === "repeat_buyer") score += 20;
  else if (purchaseStatus === "bought_once") score += 10;
  
  return Math.min(100, score);
}

function calculateAffiliatePotentialScore(
  sleepTrend: Trend3,
  engagementLevel: Level3,
  purchaseStatus: string,
  riskLevel: Level3
): number {
  let score = 0;
  
  // Happy customers make best affiliates
  if (sleepTrend === "improving") score += 35;
  else if (sleepTrend === "stable") score += 20;
  
  // Engaged users more likely to share
  if (engagementLevel === "high") score += 30;
  else if (engagementLevel === "medium") score += 15;
  
  // Must be a customer
  if (purchaseStatus === "repeat_buyer") score += 25;
  else if (purchaseStatus === "bought_once") score += 15;
  
  // Low risk = happy = good affiliate
  if (riskLevel === "low") score += 10;
  else if (riskLevel === "high") score -= 20;
  
  return Math.max(0, Math.min(100, score));
}

function determinePreferredChannel(
  whatsappEnabled: boolean,
  whatsappInteractionDays: number | null,
  emailOpens: number
): "email" | "whatsapp" | "both" | "unknown" {
  const hasWhatsappActivity = whatsappEnabled && whatsappInteractionDays !== null && whatsappInteractionDays <= 14;
  const hasEmailActivity = emailOpens > 0;
  
  if (hasWhatsappActivity && hasEmailActivity) return "both";
  if (hasWhatsappActivity) return "whatsapp";
  if (hasEmailActivity) return "email";
  return "unknown";
}

// Main attribute generation function
async function generateSleepAttributes(
  supabase: any,
  email: string
): Promise<SleepAttributes> {
  const now = new Date();
  
  // Fetch sleep profile
  const { data: profile } = await supabase
    .from('sleep_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  // Fetch last 14 sleep logs
  const { data: logs } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('email', email)
    .order('date', { ascending: false })
    .limit(14);
  
  const sleepLogs: SleepLog[] = logs || [];
  
  // Fetch engagement metadata
  const { data: engagementMeta } = await supabase
    .from('engagement_meta')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  // Fetch coach plans
  const { data: coachPlans } = await supabase
    .from('coach_plans')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });
  
  const plans = coachPlans || [];
  
  // Calculate log-based metrics
  const logs7d = sleepLogs.filter(log => {
    const logDate = new Date(log.date);
    return daysBetween(logDate, now) <= 7;
  });
  
  const logs14d = sleepLogs.filter(log => {
    const logDate = new Date(log.date);
    return daysBetween(logDate, now) <= 14;
  });
  
  const recentLogs = logs7d;
  const olderLogs = sleepLogs.filter(log => {
    const logDate = new Date(log.date);
    const days = daysBetween(logDate, now);
    return days > 7 && days <= 14;
  });
  
  // Sleep quality averages (normalized to 1-5 scale for backwards compatibility)
  const avgSleepQuality7d = calculateAverage(logs7d.map(l => l.sleep_quality / 2)); // Convert 1-10 to 1-5
  const avgSleepQuality14d = calculateAverage(logs14d.map(l => l.sleep_quality / 2));
  
  // Pain averages (0-10 scale)
  const avgPain7d = calculateAverage(logs7d.map(l => l.pain_level_morning));
  const avgPain14d = calculateAverage(logs14d.map(l => l.pain_level_morning));
  
  // Hot/stressed nights
  const hotNights7d = logs7d.filter(l => l.felt_hot).length;
  const hotNights14d = logs14d.filter(l => l.felt_hot).length;
  const stressedNights7d = logs7d.filter(l => l.felt_stressed).length;
  const stressedNights14d = logs14d.filter(l => l.felt_stressed).length;
  
  // Trends
  const sleepTrend = calculateSleepTrend(recentLogs, olderLogs);
  const painTrend = calculatePainTrend(recentLogs, olderLogs);
  
  // Last log days ago
  const lastLogDaysAgo = sleepLogs.length > 0 
    ? daysBetween(new Date(sleepLogs[0].date), now)
    : null;
  
  // Streak days (from engagement meta or calculate)
  const streakDays = engagementMeta?.total_streak_days || 0;
  
  // Log consistency score
  const logConsistencyScore = calculateLogConsistencyScore(logs14d.length, 14);
  
  // Temperature sensitive
  const temperatureSensitive = hotNights14d >= 3 || (profile?.temperature_preference === 'warm');
  
  // Stress level
  const sleepStressLevel = calculateStressLevel(stressedNights7d, stressedNights14d);
  
  // Dashboard visit days ago
  const lastDashboardVisitDaysAgo = engagementMeta?.last_seen_at 
    ? daysBetween(new Date(engagementMeta.last_seen_at), now)
    : null;
  
  // WhatsApp interaction days ago
  const lastWhatsappInteractionDaysAgo = engagementMeta?.last_whatsapp_nudge_at
    ? daysBetween(new Date(engagementMeta.last_whatsapp_nudge_at), now)
    : null;
  
  // AI Coach engagement
  const usedSleepPlan = plans.length > 0;
  const lastPlanDaysAgo = plans.length > 0 
    ? daysBetween(new Date(plans[0].created_at), now)
    : null;
  const aiCoachEngagementLevel = calculateAICoachEngagement(usedSleepPlan, plans.length, lastPlanDaysAgo);
  
  // Engagement level
  const engagementLevel = calculateEngagementLevel(
    logConsistencyScore,
    lastDashboardVisitDaysAgo,
    lastWhatsappInteractionDaysAgo,
    aiCoachEngagementLevel
  );
  
  // WhatsApp enabled
  const whatsappEnabled = profile?.whatsapp_enabled || false;
  
  // Purchase behavior
  const ordersCount = profile?.purchase_count || 0;
  const purchaseStatus: "not_bought" | "bought_once" | "repeat_buyer" = 
    ordersCount === 0 ? "not_bought" : ordersCount === 1 ? "bought_once" : "repeat_buyer";
  
  // Days since last order (based on delivery_date if available)
  const daysSinceLastOrder = profile?.delivery_date 
    ? daysBetween(new Date(profile.delivery_date), now)
    : null;
  
  // Is new customer (first order within 30 days)
  const isNewCustomer = daysSinceLastOrder !== null && daysSinceLastOrder <= 30;
  
  // Placeholder flags (would need additional data sources in production)
  const hasReturnedPillow = false;
  const complaintFlag = false;
  const refundRiskFlag = painTrend === "worsening" && avgPain7d !== null && avgPain7d >= 6;
  
  // PDF and email opens (placeholders - would come from Klaviyo integration)
  const pdfOpensLast30d = 0;
  const emailOpensLast30d = 0;
  
  // App usage type
  const usedSleepQuiz = profile !== null; // If profile exists, they likely used quiz
  const hasLogs = sleepLogs.length > 0;
  const hasDashboardVisit = lastDashboardVisitDaysAgo !== null;
  const appUsageType = calculateAppUsageType(usedSleepQuiz, hasLogs, hasDashboardVisit, usedSleepPlan);
  
  // Risk level
  const riskLevel = calculateRiskLevel(sleepTrend, painTrend, engagementLevel, complaintFlag, refundRiskFlag);
  
  // Scores
  const churnRiskScore = calculateChurnRiskScore(lastLogDaysAgo, engagementLevel, sleepTrend, complaintFlag);
  const upsellScore = calculateUpsellScore(sleepTrend, painTrend, engagementLevel, purchaseStatus, ordersCount);
  const affiliatePotentialScore = calculateAffiliatePotentialScore(sleepTrend, engagementLevel, purchaseStatus, riskLevel);
  
  // Preferred channel
  const prefersChannel = determinePreferredChannel(whatsappEnabled, lastWhatsappInteractionDaysAgo, emailOpensLast30d);
  
  return {
    email,
    sleep_stress_level: sleepStressLevel,
    sleep_trend: sleepTrend,
    pain_trend: painTrend,
    avg_sleep_quality_7d: avgSleepQuality7d,
    avg_sleep_quality_14d: avgSleepQuality14d,
    avg_pain_7d: avgPain7d,
    avg_pain_14d: avgPain14d,
    hot_nights_7d: hotNights7d,
    hot_nights_14d: hotNights14d,
    stressed_nights_7d: stressedNights7d,
    stressed_nights_14d: stressedNights14d,
    streak_days: streakDays,
    last_log_days_ago: lastLogDaysAgo,
    log_consistency_score: logConsistencyScore,
    temperature_sensitive: temperatureSensitive,
    engagement_level: engagementLevel,
    last_dashboard_visit_days_ago: lastDashboardVisitDaysAgo,
    last_whatsapp_interaction_days_ago: lastWhatsappInteractionDaysAgo,
    ai_coach_engagement_level: aiCoachEngagementLevel,
    pdf_opens_last_30d: pdfOpensLast30d,
    email_opens_last_30d: emailOpensLast30d,
    whatsapp_enabled: whatsappEnabled,
    purchase_status: purchaseStatus,
    orders_count: ordersCount,
    days_since_last_order: daysSinceLastOrder,
    is_new_customer: isNewCustomer,
    has_returned_pillow: hasReturnedPillow,
    refund_risk_flag: refundRiskFlag,
    complaint_flag: complaintFlag,
    app_usage_type: appUsageType,
    used_sleep_quiz: usedSleepQuiz,
    used_sleep_plan: usedSleepPlan,
    used_pillow_wizard: false, // Placeholder for future feature
    deep_sleep_supported: false,
    wearable_connected: false,
    risk_level: riskLevel,
    upsell_score: upsellScore,
    churn_risk_score: churnRiskScore,
    affiliate_potential_score: affiliatePotentialScore,
    prefers_channel: prefersChannel,
  };
}

// Build Klaviyo event payload
function buildSleepSyncEvent(attrs: SleepAttributes) {
  return {
    eventName: "RBN_SleepSync_Updated",
    payload: {
      email: attrs.email,
      sleep_stress_level: attrs.sleep_stress_level,
      sleep_trend: attrs.sleep_trend,
      pain_trend: attrs.pain_trend,
      avg_sleep_quality_7d: attrs.avg_sleep_quality_7d,
      avg_sleep_quality_14d: attrs.avg_sleep_quality_14d,
      avg_pain_7d: attrs.avg_pain_7d,
      avg_pain_14d: attrs.avg_pain_14d,
      hot_nights_7d: attrs.hot_nights_7d,
      hot_nights_14d: attrs.hot_nights_14d,
      stressed_nights_7d: attrs.stressed_nights_7d,
      stressed_nights_14d: attrs.stressed_nights_14d,
      streak_days: attrs.streak_days,
      last_log_days_ago: attrs.last_log_days_ago,
      log_consistency_score: attrs.log_consistency_score,
      temperature_sensitive: attrs.temperature_sensitive,
      engagement_level: attrs.engagement_level,
      last_dashboard_visit_days_ago: attrs.last_dashboard_visit_days_ago,
      last_whatsapp_interaction_days_ago: attrs.last_whatsapp_interaction_days_ago,
      ai_coach_engagement_level: attrs.ai_coach_engagement_level,
      pdf_opens_last_30d: attrs.pdf_opens_last_30d,
      email_opens_last_30d: attrs.email_opens_last_30d,
      whatsapp_enabled: attrs.whatsapp_enabled,
      purchase_status: attrs.purchase_status,
      orders_count: attrs.orders_count,
      days_since_last_order: attrs.days_since_last_order,
      is_new_customer: attrs.is_new_customer,
      has_returned_pillow: attrs.has_returned_pillow,
      refund_risk_flag: attrs.refund_risk_flag,
      complaint_flag: attrs.complaint_flag,
      app_usage_type: attrs.app_usage_type,
      used_sleep_quiz: attrs.used_sleep_quiz,
      used_sleep_plan: attrs.used_sleep_plan,
      used_pillow_wizard: attrs.used_pillow_wizard,
      deep_sleep_supported: attrs.deep_sleep_supported,
      wearable_connected: attrs.wearable_connected,
      risk_level: attrs.risk_level,
      upsell_score: attrs.upsell_score,
      churn_risk_score: attrs.churn_risk_score,
      affiliate_potential_score: attrs.affiliate_potential_score,
      prefers_channel: attrs.prefers_channel,
      source: "sleep_sync_v1",
      timestamp: new Date().toISOString()
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = user.email;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'POST' && path === 'sync') {
      // POST /sync - Generate and store attributes
      console.log(`Generating sleep attributes for: ${email}`);
      
      const attributes = await generateSleepAttributes(supabase, email);
      const event = buildSleepSyncEvent(attributes);
      
      // Store in database
      const { error: upsertError } = await supabase
        .from('sleep_attributes_state')
        .upsert({
          email,
          data: attributes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (upsertError) {
        console.error('Error storing attributes:', upsertError);
        throw upsertError;
      }

      // Also store in history
      await supabase
        .from('sleep_attributes_history')
        .insert({
          email,
          data: attributes,
        });

      console.log(`Sleep attributes synced successfully for: ${email}`);

      return new Response(JSON.stringify({
        email,
        attributes,
        event,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (req.method === 'GET') {
      // GET - Retrieve current attributes
      const { data, error } = await supabase
        .from('sleep_attributes_state')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(JSON.stringify({ 
          email, 
          attributes: null,
          message: 'No attributes found. Call POST /sync first.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        email,
        attributes: data.data,
        updated_at: data.updated_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Error in sleep-attributes-sync:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
