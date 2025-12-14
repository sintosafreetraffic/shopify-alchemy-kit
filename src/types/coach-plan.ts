/**
 * Enhanced Coach Plan Types (v2)
 * 
 * Structured JSON contract for AI Sleep Plans
 * All scoring is deterministic - AI only generates text content
 */

// ============ FOCUS AREAS ============
export type FocusAreaKey = 
  | "alignment_support"
  | "temperature_consistency"
  | "wake_up_routine"
  | "wind_down_routine"
  | "pain_management"
  | "sleep_hygiene"
  | "environment_optimization"
  | "consistency_building";

export const FOCUS_AREA_LABELS: Record<FocusAreaKey, { label: string; description: string }> = {
  alignment_support: { label: "Alignment Support", description: "Proper pillow positioning and spinal alignment" },
  temperature_consistency: { label: "Temperature Control", description: "Optimal sleep temperature strategies" },
  wake_up_routine: { label: "Morning Routine", description: "Energizing morning mobility practices" },
  wind_down_routine: { label: "Wind-Down Routine", description: "Evening relaxation protocols" },
  pain_management: { label: "Pain Management", description: "Targeted comfort and relief strategies" },
  sleep_hygiene: { label: "Sleep Hygiene", description: "Daily habits for better sleep" },
  environment_optimization: { label: "Environment", description: "Light, noise, and comfort optimization" },
  consistency_building: { label: "Consistency", description: "Building sustainable sleep patterns" },
};

// ============ EFFORT LEVELS ============
export type EffortLevel = "low" | "medium";

export const EFFORT_LABELS: Record<EffortLevel, { label: string; time: string }> = {
  low: { label: "Quick", time: "2-5 min" },
  medium: { label: "Moderate", time: "5-15 min" },
};

// ============ DAILY PLAN STRUCTURE ============
export interface DayPlan {
  focus: string;
  morningTask: string;
  eveningTask: string;
  tip: string;
  // Enhanced fields (v2)
  microHabit?: string;
  estimatedEffort?: EffortLevel;
}

export interface WeeklyPlan {
  day1: DayPlan;
  day2: DayPlan;
  day3: DayPlan;
  day4: DayPlan;
  day5: DayPlan;
  day6: DayPlan;
  day7: DayPlan;
}

// ============ TODAY ACTIONS ============
export interface TodayAction {
  time: "morning" | "evening";
  action: string;
  duration: string;
  effort?: EffortLevel;
}

// ============ ENHANCED PLAN STRUCTURE ============
export interface EnhancedSleepPlan {
  // Core plan data
  weeklyPlan: WeeklyPlan;
  
  // AI-generated content
  planHeadline: string;           // Short, benefit-led title
  whyThisPlan: string;            // Rationale connecting identity + environment + state
  encouragement: string;          // Warm, personalized message
  
  // Focus and actions
  focusAreas: FocusAreaKey[];     // 3-4 focus theme keys
  todayActions: TodayAction[];    // 2-3 immediate actions
  
  // Spine score context (AI generates explanation text, not the score)
  spineScoreHint: string;         // Human explanation of what their score means
  
  // Risk focus (from deterministic risk analysis)
  riskFocus?: string;             // Gentle focus suggestion based on top risk driver
  
  // Resources
  pdfs: string[];
  
  // Deterministic score (NOT AI-generated, set post-AI)
  spineScore: number;
}

// ============ PERSONALIZATION INTENSITY ============
export type PersonalizationIntensity = "neutral" | "light" | "moderate" | "deep";

export function getPersonalizationIntensity(
  coachReadinessScore: number,
  logsCount: number,
  hasQuizData: boolean
): PersonalizationIntensity {
  if (!hasQuizData || logsCount === 0) return "neutral";
  if (coachReadinessScore < 40) return "light";
  if (coachReadinessScore < 70) return "moderate";
  return "deep";
}

// ============ REFRESH REASON CONTEXT ============
export type RefreshReason = 
  | "manual"
  | "expired"
  | "trend_worsening"
  | "pain_increased"
  | "quality_declined"
  | "quiz_updated"
  | "product_changed"
  | "stale"
  | "no_plan";

export const REFRESH_REASON_TONES: Record<RefreshReason, { tone: string; focus: string }> = {
  manual: { tone: "maintenance", focus: "Continue optimizing your current routine" },
  expired: { tone: "renewal", focus: "Fresh week, fresh focus areas" },
  trend_worsening: { tone: "supportive", focus: "Smaller wins, gentler approach" },
  pain_increased: { tone: "recovery", focus: "Pain relief and comfort prioritized" },
  quality_declined: { tone: "stabilization", focus: "Identifying triggers and stabilizing" },
  quiz_updated: { tone: "discovery", focus: "New insights from your updated assessment" },
  product_changed: { tone: "integration", focus: "Getting the most from your new products" },
  stale: { tone: "maintenance", focus: "Refreshing based on your recent logs" },
  no_plan: { tone: "onboarding", focus: "Building your personalized foundation" },
};

// ============ PRODUCT TIPS BY PERSONA ============
export type PersonaCluster = "pain_sleeper" | "stress_insomnia" | "optimizer" | "recovery_sleeper";

export interface ProductTip {
  product: string;
  tip: string;
  personaCopy: string;
}

export const PERSONA_PRODUCT_COPY: Record<PersonaCluster, Record<string, ProductTip>> = {
  pain_sleeper: {
    ergonomic_pillow: {
      product: "Ergonomic Sleep Pillow",
      tip: "Position in the cervical curve for neck support",
      personaCopy: "Helps ease morning neck tension and supports alignment through the night",
    },
    knee_pillow: {
      product: "Knee Pillow",
      tip: "Place between knees to align hips",
      personaCopy: "Reduces lower back pressure and maintains hip alignment for side sleepers",
    },
    sleep_mask: {
      product: "Silk Sleep Mask",
      tip: "Wear for complete darkness",
      personaCopy: "Blocks light disruptions for deeper, more restorative rest",
    },
  },
  stress_insomnia: {
    ergonomic_pillow: {
      product: "Ergonomic Sleep Pillow",
      tip: "Let the contour support your relaxation",
      personaCopy: "Comfortable support that helps you drift off without restless repositioning",
    },
    knee_pillow: {
      product: "Knee Pillow",
      tip: "Nestle between legs for comfort",
      personaCopy: "Creates a cozy, supported sleep position for calmer rest",
    },
    sleep_mask: {
      product: "Silk Sleep Mask",
      tip: "Use during your wind-down routine",
      personaCopy: "Signals to your nervous system that it's time to rest",
    },
  },
  optimizer: {
    ergonomic_pillow: {
      product: "Ergonomic Sleep Pillow",
      tip: "Maintain consistent positioning nightly",
      personaCopy: "Consistent alignment supports measurable sleep quality improvements",
    },
    knee_pillow: {
      product: "Knee Pillow",
      tip: "Track how positioning affects your metrics",
      personaCopy: "Fine-tune your sleep posture for peak morning energy",
    },
    sleep_mask: {
      product: "Silk Sleep Mask",
      tip: "Maximize darkness for deep sleep phases",
      personaCopy: "Helps optimize deep sleep stages for better recovery metrics",
    },
  },
  recovery_sleeper: {
    ergonomic_pillow: {
      product: "Ergonomic Sleep Pillow",
      tip: "Supports muscle recovery during sleep",
      personaCopy: "Optimal neck support for athletes focused on overnight recovery",
    },
    knee_pillow: {
      product: "Knee Pillow",
      tip: "Reduces strain on tired muscles",
      personaCopy: "Aligns hips and lower body for better physical restoration",
    },
    sleep_mask: {
      product: "Silk Sleep Mask",
      tip: "Enhances deep sleep for training recovery",
      personaCopy: "Complete darkness promotes the restorative sleep phases athletes need",
    },
  },
};

// Helper to get product tips for user's owned products
export function getProductTipsForUser(
  productsOwned: string[],
  personaCluster: PersonaCluster
): ProductTip[] {
  const tips: ProductTip[] = [];
  const personaCopy = PERSONA_PRODUCT_COPY[personaCluster];
  
  for (const product of productsOwned) {
    const productLower = product.toLowerCase();
    if (productLower.includes("ergonomic") && productLower.includes("pillow")) {
      tips.push(personaCopy.ergonomic_pillow);
    } else if (productLower.includes("knee")) {
      tips.push(personaCopy.knee_pillow);
    } else if (productLower.includes("mask")) {
      tips.push(personaCopy.sleep_mask);
    }
  }
  
  return tips;
}
