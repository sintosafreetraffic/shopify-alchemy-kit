/**
 * Coach Metrics - Deterministic scoring and risk analysis
 * 
 * All calculations are 100% deterministic - NO AI involved.
 * These metrics drive plan regeneration, personalization, and segmentation.
 * 
 * PRINCIPLE: Accuracy over enthusiasm, data over assumptions.
 */

import { SleepAttributes, Level3, Trend3 } from "./types.ts";

// ============ RISK DRIVER TYPES ============

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

export interface RiskAnalysis {
  level: Level3;
  score: number;           // 0-100
  drivers: RiskDriver[];   // Top risk factors
  rationale: string;       // 1-2 sentence explanation
}

export interface CoachReadiness {
  score: number;           // 0-100
  label: "Early Stage" | "Developing" | "Ready" | "Advanced";
  dataCompleteness: number; // 0-100, how much data we have
  canPersonalize: boolean;  // Whether we have enough for AI personalization
  missingData: string[];    // What's needed for better personalization
}

export interface PlanRefreshTrigger {
  shouldRegenerate: boolean;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  daysSinceLastPlan: number | null;
}

// ============ RISK ANALYSIS ============

/**
 * Analyze user risk level with explainable drivers
 * Returns structured risk analysis for UI display and AI context
 */
export function analyzeRiskDrivers(attrs: SleepAttributes): RiskAnalysis {
  const drivers: RiskDriver[] = [];
  let riskScore = 0;
  
  // Pain trend worsening
  if (attrs.pain_trend === "worsening") {
    drivers.push("pain_worsening");
    riskScore += 25;
  }
  
  // Sleep quality declining
  if (attrs.sleep_trend === "worsening") {
    drivers.push("sleep_declining");
    riskScore += 25;
  }
  
  // Low engagement
  if (attrs.engagement_level === "low") {
    drivers.push("low_engagement");
    riskScore += 15;
  }
  
  // High churn risk
  if (attrs.churn_risk_score >= 60) {
    drivers.push("high_churn_risk");
    riskScore += 20;
  }
  
  // Temperature sensitivity with hot nights
  if (attrs.temperature_sensitive && attrs.hot_nights_7d >= 2) {
    drivers.push("temperature_sensitivity");
    riskScore += 10;
  }
  
  // Elevated stress
  if (attrs.sleep_stress_level === "high") {
    drivers.push("stress_elevated");
    riskScore += 15;
  }
  
  // No recent logs (disengagement signal)
  if (attrs.last_log_days_ago === null || attrs.last_log_days_ago >= 7) {
    drivers.push("no_recent_logs");
    riskScore += 20;
  }
  
  // Environment suboptimal (from quiz data)
  if (attrs.room_brightness === "bright" || attrs.room_noise === "noisy") {
    drivers.push("environment_suboptimal");
    riskScore += 10;
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
    drivers: drivers.slice(0, 5), // Top 5 drivers
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
  
  const descriptions = topDrivers.map(d => driverDescriptions[d]);
  
  if (level === "high") {
    return `Priority attention needed: ${descriptions.slice(0, 2).join(" and ")}.`;
  } else if (level === "medium") {
    return `Some areas to address: ${descriptions[0]}${descriptions[1] ? ` and ${descriptions[1]}` : ""}.`;
  } else {
    return `Minor optimization opportunity: ${descriptions[0]}.`;
  }
}

// ============ COACH READINESS ============

/**
 * Calculate how ready the user is for personalized coaching
 * Determines data completeness and personalization capability
 */
export function calculateCoachReadiness(attrs: SleepAttributes): CoachReadiness {
  const missingData: string[] = [];
  let dataPoints = 0;
  const maxDataPoints = 10;
  
  // Check core identity data
  if (attrs.quiz_completed) dataPoints += 2;
  else missingData.push("Sleep assessment");
  
  // Check sleep logs
  if (attrs.last_log_days_ago !== null && attrs.last_log_days_ago <= 7) {
    dataPoints += 2;
  } else {
    missingData.push("Recent sleep logs");
  }
  
  // Check log consistency
  if (attrs.log_consistency_score >= 50) dataPoints += 1;
  else if (attrs.log_consistency_score < 30) missingData.push("More consistent logging");
  
  // Check profile completeness
  if (attrs.sleep_position && attrs.sleep_position !== "side") dataPoints += 1; // Non-default
  else if (attrs.pain_points?.length > 0) dataPoints += 1;
  
  // Check environment data
  if (attrs.environment_updated_at) dataPoints += 1;
  else missingData.push("Sleep environment details");
  
  // Check engagement history
  if (attrs.streak_days >= 3) dataPoints += 1;
  
  // Check products owned (for product-specific tips)
  if (attrs.products_owned?.length > 0) dataPoints += 1;
  
  // Check trend data availability
  if (attrs.sleep_trend !== "unknown") dataPoints += 1;
  
  const dataCompleteness = Math.round((dataPoints / maxDataPoints) * 100);
  
  // Determine readiness score and label
  let score = dataCompleteness;
  let label: CoachReadiness["label"];
  
  if (score >= 80) label = "Advanced";
  else if (score >= 60) label = "Ready";
  else if (score >= 40) label = "Developing";
  else label = "Early Stage";
  
  // Can personalize if we have at least quiz + some logs
  const canPersonalize = attrs.quiz_completed && (attrs.last_log_days_ago !== null && attrs.last_log_days_ago <= 14);
  
  return {
    score,
    label,
    dataCompleteness,
    canPersonalize,
    missingData: missingData.slice(0, 3),
  };
}

// ============ PLAN REFRESH TRIGGERS ============

/**
 * Determine if a new plan should be generated
 * Returns structured trigger info for UI and automation
 */
export function shouldRefreshPlan(
  attrs: SleepAttributes,
  lastPlanDate: string | null,
  lastPlanTrend: Trend3 | null
): PlanRefreshTrigger {
  const now = new Date();
  let daysSinceLastPlan: number | null = null;
  
  if (lastPlanDate) {
    daysSinceLastPlan = Math.floor((now.getTime() - new Date(lastPlanDate).getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Priority 1: No plan exists
  if (!lastPlanDate) {
    return {
      shouldRegenerate: true,
      reason: "no_plan",
      priority: "high",
      daysSinceLastPlan: null,
    };
  }
  
  // Priority 2: Plan expired (>7 days)
  if (daysSinceLastPlan !== null && daysSinceLastPlan >= 7) {
    return {
      shouldRegenerate: true,
      reason: "expired",
      priority: "high",
      daysSinceLastPlan,
    };
  }
  
  // Priority 3: Significant trend change
  if (lastPlanTrend && attrs.sleep_trend !== "unknown") {
    if (lastPlanTrend === "improving" && attrs.sleep_trend === "worsening") {
      return {
        shouldRegenerate: true,
        reason: "trend_worsening",
        priority: "urgent",
        daysSinceLastPlan,
      };
    }
    if (lastPlanTrend === "stable" && attrs.sleep_trend === "worsening") {
      return {
        shouldRegenerate: true,
        reason: "quality_declined",
        priority: "high",
        daysSinceLastPlan,
      };
    }
  }
  
  // Priority 4: Pain increased significantly
  if (attrs.pain_trend === "worsening" && (attrs.avg_pain_7d ?? 0) >= 6) {
    return {
      shouldRegenerate: true,
      reason: "pain_increased",
      priority: "high",
      daysSinceLastPlan,
    };
  }
  
  // Priority 5: Products changed (for product-specific recommendations)
  // This would need to be checked against the plan's profile_snapshot
  // For now, we skip this check here and handle it in the UI
  
  // Priority 6: Stale plan (4-6 days) - suggest but don't force
  if (daysSinceLastPlan !== null && daysSinceLastPlan >= 4) {
    return {
      shouldRegenerate: false, // Suggest only
      reason: "stale",
      priority: "low",
      daysSinceLastPlan,
    };
  }
  
  // No refresh needed
  return {
    shouldRegenerate: false,
    reason: "current",
    priority: "low",
    daysSinceLastPlan,
  };
}

// ============ SPINE SCORE V2 ============

/**
 * Enhanced spine score calculation with transparency
 * Returns score + breakdown for UI display
 */
export interface SpineScoreBreakdown {
  score: number;           // 0-100
  factors: {
    name: string;
    impact: number;        // Positive or negative
    description: string;
  }[];
  trend: "improving" | "stable" | "declining";
}

export function calculateSpineScoreV2(attrs: SleepAttributes): SpineScoreBreakdown {
  const factors: SpineScoreBreakdown["factors"] = [];
  let score = 70; // Base
  
  // Pain points impact
  const painCount = attrs.pain_points?.filter(p => p !== "none").length || 0;
  if (painCount > 0) {
    const impact = -painCount * 5;
    score += impact;
    factors.push({
      name: "Pain Areas",
      impact,
      description: `${painCount} area${painCount > 1 ? "s" : ""} of concern`,
    });
  }
  
  // Sleep quality impact
  if (attrs.avg_sleep_quality_7d !== null) {
    let impact = 0;
    let desc = "";
    if (attrs.avg_sleep_quality_7d >= 7) {
      impact = 15;
      desc = "Excellent sleep quality";
    } else if (attrs.avg_sleep_quality_7d >= 5) {
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
  if (attrs.avg_pain_7d !== null) {
    let impact = 0;
    let desc = "";
    if (attrs.avg_pain_7d >= 7) {
      impact = -15;
      desc = "High morning pain levels";
    } else if (attrs.avg_pain_7d >= 5) {
      impact = -8;
      desc = "Moderate morning discomfort";
    } else if (attrs.avg_pain_7d <= 3) {
      impact = 5;
      desc = "Low pain levels";
    }
    if (impact !== 0) {
      score += impact;
      factors.push({ name: "Morning Pain", impact, description: desc });
    }
  }
  
  // Trend impact
  if (attrs.sleep_trend === "improving") {
    score += 10;
    factors.push({ name: "Trend", impact: 10, description: "Sleep improving week-over-week" });
  } else if (attrs.sleep_trend === "worsening") {
    score -= 10;
    factors.push({ name: "Trend", impact: -10, description: "Sleep declining, needs attention" });
  }
  
  // Products owned bonus
  const productsCount = attrs.products_owned?.length || 0;
  if (productsCount > 0) {
    const impact = productsCount * 3;
    score += impact;
    factors.push({
      name: "Sleep Products",
      impact,
      description: `Using ${productsCount} Rise By Night product${productsCount > 1 ? "s" : ""}`,
    });
  }
  
  // Streak bonus
  if (attrs.streak_days >= 7) {
    score += 5;
    factors.push({ name: "Tracking Streak", impact: 5, description: `${attrs.streak_days}-day logging streak` });
  }
  
  // Clamp and determine trend
  score = Math.max(0, Math.min(100, score));
  
  const trend: SpineScoreBreakdown["trend"] = 
    attrs.sleep_trend === "improving" ? "improving" :
    attrs.sleep_trend === "worsening" ? "declining" : "stable";
  
  return {
    score,
    factors: factors.filter(f => f.impact !== 0),
    trend,
  };
}

// ============ PERSONALIZATION INTENSITY ============

/**
 * Determine how intensely to personalize based on confidence
 * Used by AI prompts to calibrate specificity
 */
export type PersonalizationIntensity = "neutral" | "light" | "moderate" | "deep";

export function getPersonalizationIntensity(attrs: SleepAttributes): PersonalizationIntensity {
  const readiness = calculateCoachReadiness(attrs);
  
  if (!readiness.canPersonalize) return "neutral";
  if (readiness.score >= 80) return "deep";
  if (readiness.score >= 60) return "moderate";
  if (readiness.score >= 40) return "light";
  return "neutral";
}

/**
 * Build AI prompt modifier based on personalization intensity
 * Returns text to append to AI system prompts
 */
export function buildPersonalizationPromptModifier(intensity: PersonalizationIntensity): string {
  switch (intensity) {
    case "deep":
      return `
PERSONALIZATION LEVEL: DEEP
You have extensive data about this user. Be highly specific:
- Reference their exact sleep position and pain areas by name
- Tailor all recommendations to their specific products owned
- Reference their specific trends and recent patterns
- Use their environment data for context (mattress, room conditions)
`;
    
    case "moderate":
      return `
PERSONALIZATION LEVEL: MODERATE
You have good data about this user. Be reasonably specific:
- Reference their sleep position and main pain areas
- Tailor recommendations to products they own
- Acknowledge their general trends
`;
    
    case "light":
      return `
PERSONALIZATION LEVEL: LIGHT
You have limited data about this user. Be generally helpful:
- Reference their stated sleep position
- Keep product references generic unless they own specific items
- Provide broadly applicable advice
`;
    
    case "neutral":
    default:
      return `
PERSONALIZATION LEVEL: NEUTRAL
You have minimal data about this user. Provide general guidance:
- Use inclusive language ("many sleepers find...")
- Avoid specific product references unless requested
- Encourage them to complete their sleep assessment for better personalization
`;
  }
}
