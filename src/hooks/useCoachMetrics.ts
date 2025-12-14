/**
 * useCoachMetrics - Client-side hook for coach metrics calculations
 * 
 * Provides deterministic calculations for:
 * - Spine score breakdown
 * - Risk analysis
 * - Coach readiness
 * - Plan refresh triggers
 * 
 * All calculations are 100% deterministic - NO AI involved.
 */

import { useMemo } from "react";
import { TrendData, SleepProfile, CoachPlan } from "./useSleepApi";

// ============ TYPES ============

export type RiskDriver =
  | "pain_worsening"
  | "sleep_declining"
  | "low_engagement"
  | "high_churn_risk"
  | "temperature_sensitivity"
  | "stress_elevated"
  | "no_recent_logs"
  | "product_underutilized"
  | "environment_suboptimal";

export type Level3 = "low" | "medium" | "high";

export interface RiskAnalysis {
  level: Level3;
  score: number;
  drivers: RiskDriver[];
  rationale: string;
}

export interface SpineScoreFactor {
  name: string;
  impact: number;
  description: string;
}

export interface SpineScoreBreakdown {
  score: number;
  factors: SpineScoreFactor[];
  trend: "improving" | "stable" | "declining";
}

export interface CoachReadiness {
  score: number;
  label: "Early Stage" | "Developing" | "Ready" | "Advanced";
  dataCompleteness: number;
  canPersonalize: boolean;
  missingData: string[];
}

export interface PlanRefreshTrigger {
  shouldRegenerate: boolean;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  daysSinceLastPlan: number | null;
}

// ============ CALCULATIONS ============

function analyzeRiskDrivers(
  profile: SleepProfile | null,
  trends: TrendData | null,
  lastLogDaysAgo: number | null,
  streakDays: number
): RiskAnalysis {
  const drivers: RiskDriver[] = [];
  let riskScore = 0;

  if (!profile) {
    return {
      level: "low",
      score: 0,
      drivers: [],
      rationale: "Complete your sleep assessment to see personalized risk analysis.",
    };
  }

  // Pain trend worsening (using trends if available)
  if (trends && trends.avgPain >= 6) {
    drivers.push("pain_worsening");
    riskScore += 25;
  }

  // Sleep quality declining
  if (trends && trends.trend === "worsening") {
    drivers.push("sleep_declining");
    riskScore += 25;
  }

  // Low engagement (no recent logs or low streak)
  if (lastLogDaysAgo === null || lastLogDaysAgo >= 7) {
    drivers.push("no_recent_logs");
    riskScore += 20;
  } else if (streakDays < 3 && lastLogDaysAgo >= 3) {
    drivers.push("low_engagement");
    riskScore += 15;
  }

  // Temperature sensitivity
  if (trends && trends.hotNights >= 2) {
    drivers.push("temperature_sensitivity");
    riskScore += 10;
  }

  // Elevated stress
  if (profile.stress_level === "high" || (trends && trends.stressedNights >= 3)) {
    drivers.push("stress_elevated");
    riskScore += 15;
  }

  // Clamp score
  riskScore = Math.min(100, riskScore);

  // Determine level
  let level: Level3;
  if (riskScore >= 50) level = "high";
  else if (riskScore >= 25) level = "medium";
  else level = "low";

  // Build rationale
  const rationale = buildRiskRationale(level, drivers.slice(0, 3));

  return {
    level,
    score: riskScore,
    drivers: drivers.slice(0, 5),
    rationale,
  };
}

function buildRiskRationale(level: Level3, topDrivers: RiskDriver[]): string {
  if (topDrivers.length === 0) {
    return "Your sleep metrics are stable with no significant risk factors detected.";
  }

  const driverDescriptions: Record<RiskDriver, string> = {
    pain_worsening: "morning pain trending upward",
    sleep_declining: "sleep quality declining",
    low_engagement: "reduced app engagement",
    high_churn_risk: "signs of disengagement",
    temperature_sensitivity: "frequent temperature disruptions",
    stress_elevated: "elevated stress affecting sleep",
    no_recent_logs: "no recent sleep tracking",
    product_underutilized: "products not being used optimally",
    environment_suboptimal: "room environment affecting sleep",
  };

  const descriptions = topDrivers.map((d) => driverDescriptions[d]);

  if (level === "high") {
    return `Priority attention needed: ${descriptions.slice(0, 2).join(" and ")}.`;
  } else if (level === "medium") {
    return `Some areas to address: ${descriptions[0]}${descriptions[1] ? ` and ${descriptions[1]}` : ""}.`;
  } else {
    return `Minor optimization opportunity: ${descriptions[0]}.`;
  }
}

function calculateSpineScoreBreakdown(
  profile: SleepProfile | null,
  trends: TrendData | null
): SpineScoreBreakdown {
  const factors: SpineScoreFactor[] = [];
  let score = 70; // Base

  if (!profile) {
    return { score: 50, factors: [], trend: "stable" };
  }

  // Pain points impact
  const painCount = profile.pain_points?.filter((p) => p !== "none").length || 0;
  if (painCount > 0) {
    const impact = -painCount * 5;
    score += impact;
    factors.push({
      name: "Pain Areas",
      impact,
      description: `${painCount} area${painCount > 1 ? "s" : ""} of concern`,
    });
  }

  // Sleep quality impact (from trends)
  if (trends && trends.avgSleepQuality > 0) {
    let impact = 0;
    let desc = "";
    if (trends.avgSleepQuality >= 7) {
      impact = 15;
      desc = "Excellent sleep quality";
    } else if (trends.avgSleepQuality >= 5) {
      impact = 5;
      desc = "Moderate sleep quality";
    } else {
      impact = -10;
      desc = "Sleep quality needs improvement";
    }
    score += impact;
    factors.push({ name: "Sleep Quality", impact, description: desc });
  }

  // Morning pain impact
  if (trends && trends.avgPain > 0) {
    let impact = 0;
    let desc = "";
    if (trends.avgPain >= 7) {
      impact = -15;
      desc = "High morning pain levels";
    } else if (trends.avgPain >= 5) {
      impact = -8;
      desc = "Moderate morning discomfort";
    } else if (trends.avgPain <= 3) {
      impact = 5;
      desc = "Low pain levels";
    }
    if (impact !== 0) {
      score += impact;
      factors.push({ name: "Morning Pain", impact, description: desc });
    }
  }

  // Trend impact
  if (trends) {
    if (trends.trend === "improving") {
      score += 10;
      factors.push({
        name: "Trend",
        impact: 10,
        description: "Sleep improving week-over-week",
      });
    } else if (trends.trend === "worsening") {
      score -= 10;
      factors.push({
        name: "Trend",
        impact: -10,
        description: "Sleep declining, needs attention",
      });
    }
  }

  // Products owned bonus
  const productsCount = profile.products_owned?.length || 0;
  if (productsCount > 0) {
    const impact = productsCount * 3;
    score += impact;
    factors.push({
      name: "Sleep Products",
      impact,
      description: `Using ${productsCount} Rise By Night product${productsCount > 1 ? "s" : ""}`,
    });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const trend: SpineScoreBreakdown["trend"] =
    trends?.trend === "improving"
      ? "improving"
      : trends?.trend === "worsening"
        ? "declining"
        : "stable";

  return {
    score,
    factors: factors.filter((f) => f.impact !== 0),
    trend,
  };
}

function calculateCoachReadiness(
  profile: SleepProfile | null,
  logsCount: number,
  lastLogDaysAgo: number | null,
  streakDays: number
): CoachReadiness {
  const missingData: string[] = [];
  let dataPoints = 0;
  const maxDataPoints = 10;

  // Check quiz completed
  if (profile?.sleep_assessment && Object.keys(profile.sleep_assessment).length > 0) {
    dataPoints += 2;
  } else {
    missingData.push("Sleep assessment");
  }

  // Check sleep logs
  if (lastLogDaysAgo !== null && lastLogDaysAgo <= 7) {
    dataPoints += 2;
  } else {
    missingData.push("Recent sleep logs");
  }

  // Check log consistency
  const consistency = logsCount >= 7 ? 70 : logsCount >= 3 ? 40 : 20;
  if (consistency >= 50) dataPoints += 1;
  else if (consistency < 30) missingData.push("More consistent logging");

  // Check profile completeness
  if (profile?.sleep_position && profile.sleep_position !== "side") dataPoints += 1;
  else if (profile?.pain_points && profile.pain_points.length > 0) dataPoints += 1;

  // Check environment data
  if (profile?.environment_updated_at) dataPoints += 1;
  else missingData.push("Sleep environment details");

  // Check streak
  if (streakDays >= 3) dataPoints += 1;

  // Check products owned
  if (profile?.products_owned && profile.products_owned.length > 0) dataPoints += 1;

  // Check trends available
  if (logsCount >= 7) dataPoints += 1;

  const dataCompleteness = Math.round((dataPoints / maxDataPoints) * 100);

  let label: CoachReadiness["label"];
  if (dataCompleteness >= 80) label = "Advanced";
  else if (dataCompleteness >= 60) label = "Ready";
  else if (dataCompleteness >= 40) label = "Developing";
  else label = "Early Stage";

  const canPersonalize =
    profile?.sleep_assessment &&
    Object.keys(profile.sleep_assessment).length > 0 &&
    lastLogDaysAgo !== null &&
    lastLogDaysAgo <= 14;

  return {
    score: dataCompleteness,
    label,
    dataCompleteness,
    canPersonalize: !!canPersonalize,
    missingData: missingData.slice(0, 3),
  };
}

function shouldRefreshPlan(
  plan: CoachPlan | null,
  trends: TrendData | null
): PlanRefreshTrigger {
  const now = new Date();
  let daysSinceLastPlan: number | null = null;

  if (plan?.generated_at) {
    daysSinceLastPlan = Math.floor(
      (now.getTime() - new Date(plan.generated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // No plan exists
  if (!plan) {
    return {
      shouldRegenerate: true,
      reason: "no_plan",
      priority: "high",
      daysSinceLastPlan: null,
    };
  }

  // Plan expired (>7 days)
  if (daysSinceLastPlan !== null && daysSinceLastPlan >= 7) {
    return {
      shouldRegenerate: true,
      reason: "expired",
      priority: "high",
      daysSinceLastPlan,
    };
  }

  // Significant trend change
  if (trends && trends.trend === "worsening") {
    return {
      shouldRegenerate: true,
      reason: "trend_worsening",
      priority: "urgent",
      daysSinceLastPlan,
    };
  }

  // Pain increased
  if (trends && trends.avgPain >= 6) {
    return {
      shouldRegenerate: true,
      reason: "pain_increased",
      priority: "high",
      daysSinceLastPlan,
    };
  }

  // Stale plan (4-6 days)
  if (daysSinceLastPlan !== null && daysSinceLastPlan >= 4) {
    return {
      shouldRegenerate: false,
      reason: "stale",
      priority: "low",
      daysSinceLastPlan,
    };
  }

  return {
    shouldRegenerate: false,
    reason: "current",
    priority: "low",
    daysSinceLastPlan,
  };
}

// ============ HOOK ============

interface UseCoachMetricsInput {
  profile: SleepProfile | null;
  trends: TrendData | null;
  plan: CoachPlan | null;
  logsCount: number;
  lastLogDaysAgo: number | null;
  streakDays: number;
}

export function useCoachMetrics({
  profile,
  trends,
  plan,
  logsCount,
  lastLogDaysAgo,
  streakDays,
}: UseCoachMetricsInput) {
  const spineScore = useMemo(
    () => calculateSpineScoreBreakdown(profile, trends),
    [profile, trends]
  );

  const riskAnalysis = useMemo(
    () => analyzeRiskDrivers(profile, trends, lastLogDaysAgo, streakDays),
    [profile, trends, lastLogDaysAgo, streakDays]
  );

  const coachReadiness = useMemo(
    () => calculateCoachReadiness(profile, logsCount, lastLogDaysAgo, streakDays),
    [profile, logsCount, lastLogDaysAgo, streakDays]
  );

  const planRefreshTrigger = useMemo(
    () => shouldRefreshPlan(plan, trends),
    [plan, trends]
  );

  return {
    spineScore,
    riskAnalysis,
    coachReadiness,
    planRefreshTrigger,
  };
}
