/**
 * Adaptive Sleep Plan Engine
 * 
 * Research-grounded, adaptive weekly plan generation.
 * Analyzes notes for patterns, tracks progression phases,
 * and adjusts difficulty based on adherence.
 * 
 * PRINCIPLE: Plans evolve with the user's data, never static.
 */

import { SleepAttributes } from "./types.ts";

// Minimal log interface for pattern detection (works with various log shapes)
export interface MinimalSleepLog {
  date: string;
  notes?: string | null;
  sleep_quality?: number;
  pain_level_morning?: number;
  felt_hot?: boolean;
  felt_stressed?: boolean;
}

// ============ PROGRESSION PHASES ============

export type PlanPhase = "foundation" | "stabilization" | "optimization" | "resilience";

export interface PhaseConfig {
  label: string;
  description: string;
  focusTone: string;
  actionDepth: "simple" | "moderate" | "advanced";
  weekRange: string;
}

export const PHASE_CONFIGS: Record<PlanPhase, PhaseConfig> = {
  foundation: {
    label: "Foundation",
    description: "Building core sleep habits and awareness",
    focusTone: "gentle introduction",
    actionDepth: "simple",
    weekRange: "Weeks 1-2",
  },
  stabilization: {
    label: "Stabilization",
    description: "Reinforcing habits and identifying patterns",
    focusTone: "consistency focus",
    actionDepth: "moderate",
    weekRange: "Weeks 3-4",
  },
  optimization: {
    label: "Optimization",
    description: "Fine-tuning and advanced techniques",
    focusTone: "performance enhancement",
    actionDepth: "moderate",
    weekRange: "Weeks 5-8",
  },
  resilience: {
    label: "Resilience",
    description: "Maintaining gains and adapting to challenges",
    focusTone: "maintenance mastery",
    actionDepth: "advanced",
    weekRange: "Weeks 9+",
  },
};

// ============ NOTE PATTERN DETECTION ============

export type NotePattern = 
  | "alcohol"
  | "late_meal"
  | "stress_anxiety"
  | "temperature_discomfort"
  | "screen_time"
  | "travel"
  | "irregular_schedule"
  | "social_jetlag"
  | "caffeine"
  | "exercise_late"
  | "medication"
  | "partner_disruption";

export interface DetectedPattern {
  pattern: NotePattern;
  frequency: number;
  recentDates: string[];
  microEducation: string;
  nextWeekFocus: string;
}

const PATTERN_KEYWORDS: Record<NotePattern, string[]> = {
  alcohol: ["wine", "alcohol", "beer", "drink", "drinks", "cocktail", "whiskey", "drunk", "party", "celebration"],
  late_meal: ["late meal", "ate late", "dinner late", "heavy meal", "late dinner", "midnight snack", "late snack", "eating late"],
  stress_anxiety: ["stress", "stressed", "anxious", "anxiety", "worried", "worry", "work stress", "deadline", "overwhelmed", "racing thoughts", "can't stop thinking"],
  temperature_discomfort: ["hot", "cold", "sweating", "sweat", "too warm", "too cold", "temperature", "overheated", "freezing"],
  screen_time: ["phone", "screen", "tv", "netflix", "watching", "scrolling", "instagram", "social media", "laptop", "computer"],
  travel: ["travel", "traveling", "flight", "jet lag", "jetlag", "trip", "timezone", "time zone", "hotel"],
  irregular_schedule: ["irregular", "different time", "late night", "stayed up", "slept in", "inconsistent", "varying", "weekend"],
  social_jetlag: ["weekend", "saturday", "sunday", "slept in late", "caught up on sleep", "stayed out"],
  caffeine: ["coffee", "caffeine", "tea", "espresso", "energy drink", "late coffee", "afternoon coffee"],
  exercise_late: ["exercise", "workout", "gym", "late workout", "evening workout", "ran", "training"],
  medication: ["medication", "medicine", "pill", "pills", "supplement", "melatonin"],
  partner_disruption: ["partner", "snoring", "snored", "woke me", "disturbed", "moved around", "restless partner"],
};

const PATTERN_EDUCATION: Record<NotePattern, { micro: string; focus: string }> = {
  alcohol: {
    micro: "Your logs suggest alcohol may be affecting rest. Even moderate amounts can reduce deep sleep quality and increase night awakenings. Small timing adjustments can support deeper recovery.",
    focus: "Consider finishing any drinks 3-4 hours before bed to allow metabolism and minimize sleep fragmentation.",
  },
  late_meal: {
    micro: "Late meals can affect sleep onset and quality. Digestion requires energy and can disrupt the body's natural wind-down process.",
    focus: "Aim to finish eating 2-3 hours before bed. If you need a late snack, keep it light and easy to digest.",
  },
  stress_anxiety: {
    micro: "Stress and racing thoughts are common sleep disruptors. Your nervous system needs time to downshift before quality sleep is possible.",
    focus: "Build a wind-down buffer. Try journaling worries or tomorrow's tasks 30-60 minutes before bed to externalize thoughts.",
  },
  temperature_discomfort: {
    micro: "Temperature plays a critical role in sleep quality. Your body needs to drop 1-2 degrees for optimal sleep onset.",
    focus: "Adjust room temperature, bedding layers, or consider breathable materials to find your comfort zone.",
  },
  screen_time: {
    micro: "Screen light can delay melatonin production by 30-60 minutes. The stimulation also keeps the mind alert.",
    focus: "Create a 30-minute screen-free buffer before bed. Try dimming lights and switching to relaxing activities.",
  },
  travel: {
    micro: "Travel disrupts circadian rhythm. Recovery typically takes one day per hour of time zone change.",
    focus: "Prioritize light exposure at destination mornings and maintain consistent meal times to reset your clock.",
  },
  irregular_schedule: {
    micro: "Irregular sleep timing fragments your circadian rhythm. Even 30-minute variations can affect sleep quality.",
    focus: "Aim for consistent wake times, even on weekends. This is more impactful than consistent bedtimes.",
  },
  social_jetlag: {
    micro: "Weekend sleep patterns that differ by more than an hour from weekdays create 'social jet lag' that can take days to recover from.",
    focus: "Try to keep weekend wake times within 1 hour of weekday times. Sleep in only moderately if needed.",
  },
  caffeine: {
    micro: "Caffeine has a half-life of 5-6 hours. Afternoon caffeine can still be in your system at bedtime.",
    focus: "Consider a caffeine cutoff time of early afternoon to ensure it's cleared by sleep time.",
  },
  exercise_late: {
    micro: "Exercise is excellent for sleep, but timing matters. Late workouts can elevate body temperature and adrenaline.",
    focus: "Allow 2-3 hours between intense exercise and bed. Gentle stretching or yoga in the evening is supportive.",
  },
  medication: {
    micro: "Some medications and supplements can affect sleep quality or timing. Consistent timing helps your body adapt.",
    focus: "Maintain consistent supplement timing. If you notice sleep effects, discuss timing with a healthcare provider.",
  },
  partner_disruption: {
    micro: "Sleep partner movements and sounds are common disruptors. Separate sleep solutions can help both partners.",
    focus: "Consider separate blankets, white noise, or addressing the root cause (like partner's sleep position).",
  },
};

/**
 * Detect patterns from sleep log notes
 */
export function detectNotePatterns(logs: MinimalSleepLog[]): DetectedPattern[] {
  const patternCounts: Map<NotePattern, { count: number; dates: string[] }> = new Map();
  
  for (const log of logs) {
    if (!log.notes) continue;
    const notesLower = log.notes.toLowerCase();
    
    for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (notesLower.includes(keyword)) {
          const existing = patternCounts.get(pattern as NotePattern) || { count: 0, dates: [] };
          existing.count++;
          existing.dates.push(log.date);
          patternCounts.set(pattern as NotePattern, existing);
          break; // Only count once per log per pattern
        }
      }
    }
  }
  
  // Convert to detected patterns (only patterns with 2+ occurrences)
  const detected: DetectedPattern[] = [];
  for (const [pattern, data] of patternCounts.entries()) {
    if (data.count >= 2) {
      const education = PATTERN_EDUCATION[pattern];
      detected.push({
        pattern,
        frequency: data.count,
        recentDates: data.dates.slice(0, 5),
        microEducation: education.micro,
        nextWeekFocus: education.focus,
      });
    }
  }
  
  // Sort by frequency
  return detected.sort((a, b) => b.frequency - a.frequency).slice(0, 3);
}

// ============ PROGRESSION PHASE DETECTION ============

export interface UserProgressionContext {
  phase: PlanPhase;
  weekNumber: number;
  totalLogsAllTime: number;
  plansCompleted: number;
  adherenceRate: number; // 0-100
  shouldProgress: boolean;
  progressionReason: string;
}

/**
 * Determine user's progression phase based on history
 */
export function determineProgressionPhase(
  firstLogDate: string | null,
  totalLogs: number,
  plansGenerated: number,
  avgAdherenceRate: number // 0-100, calculated from completed actions
): UserProgressionContext {
  if (!firstLogDate) {
    return {
      phase: "foundation",
      weekNumber: 1,
      totalLogsAllTime: totalLogs,
      plansCompleted: plansGenerated,
      adherenceRate: avgAdherenceRate,
      shouldProgress: false,
      progressionReason: "New user, starting with foundation phase",
    };
  }
  
  const firstLog = new Date(firstLogDate);
  const now = new Date();
  const daysSinceFirst = Math.floor((now.getTime() - firstLog.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.max(1, Math.ceil(daysSinceFirst / 7));
  
  // Determine phase based on time + engagement
  let phase: PlanPhase;
  let shouldProgress = false;
  let progressionReason = "";
  
  if (weekNumber <= 2 || totalLogs < 7) {
    phase = "foundation";
    shouldProgress = weekNumber >= 2 && totalLogs >= 7 && avgAdherenceRate >= 50;
    progressionReason = shouldProgress 
      ? "Completing foundation phase with good consistency"
      : "Building foundation habits";
  } else if (weekNumber <= 4 || totalLogs < 21) {
    phase = "stabilization";
    shouldProgress = weekNumber >= 4 && totalLogs >= 21 && avgAdherenceRate >= 60;
    progressionReason = shouldProgress
      ? "Patterns established, ready for optimization"
      : "Reinforcing sleep patterns";
  } else if (weekNumber <= 8 || totalLogs < 42) {
    phase = "optimization";
    shouldProgress = weekNumber >= 8 && totalLogs >= 42 && avgAdherenceRate >= 70;
    progressionReason = shouldProgress
      ? "Strong foundation, advancing to resilience"
      : "Fine-tuning sleep quality";
  } else {
    phase = "resilience";
    shouldProgress = false;
    progressionReason = "Maintaining gains and adapting to challenges";
  }
  
  return {
    phase,
    weekNumber,
    totalLogsAllTime: totalLogs,
    plansCompleted: plansGenerated,
    adherenceRate: avgAdherenceRate,
    shouldProgress,
    progressionReason,
  };
}

// ============ ADAPTIVE DIFFICULTY ============

export type AdaptiveDifficulty = "simplified" | "standard" | "progressive";

export interface AdaptiveAdjustment {
  difficulty: AdaptiveDifficulty;
  reason: string;
  morningTaskDuration: string;
  eveningTaskDuration: string;
  microHabitCount: number;
  includeProductTips: boolean;
}

/**
 * Calculate adaptive difficulty based on adherence and trends
 */
export function calculateAdaptiveDifficulty(
  adherenceRate: number,
  sleepTrend: string,
  painTrend: string,
  streakDays: number,
  previousPlanCompleted: boolean
): AdaptiveAdjustment {
  // Simplify if struggling
  if (adherenceRate < 40 || !previousPlanCompleted) {
    return {
      difficulty: "simplified",
      reason: "Simplifying actions to build momentum",
      morningTaskDuration: "2-3 min",
      eveningTaskDuration: "3-5 min",
      microHabitCount: 1,
      includeProductTips: false,
    };
  }
  
  // Progress if thriving
  if (adherenceRate >= 70 && sleepTrend === "improving" && streakDays >= 5) {
    return {
      difficulty: "progressive",
      reason: "Excellent progress, introducing new elements",
      morningTaskDuration: "8-12 min",
      eveningTaskDuration: "10-15 min",
      microHabitCount: 3,
      includeProductTips: true,
    };
  }
  
  // Standard path
  return {
    difficulty: "standard",
    reason: "Maintaining current difficulty level",
    morningTaskDuration: "5-8 min",
    eveningTaskDuration: "5-10 min",
    microHabitCount: 2,
    includeProductTips: true,
  };
}

// ============ RESEARCH-GROUNDED TIMELINES ============

export interface ImprovementTimeline {
  category: string;
  typicalOnset: string;
  fullEffect: string;
  weeklyProgression: string[];
}

export const IMPROVEMENT_TIMELINES: Record<string, ImprovementTimeline> = {
  alignment_posture: {
    category: "Alignment & Posture",
    typicalOnset: "3-5 days for awareness",
    fullEffect: "2-4 weeks for lasting change",
    weeklyProgression: [
      "Week 1: Awareness + micro-adjustments (notice posture, check pillow height)",
      "Week 2: Consistent positioning cues (bedtime position setup)",
      "Week 3: Sustained adjustments (full night positioning)",
      "Week 4+: Integrated habits (automatic positioning, body memory)",
    ],
  },
  stress_regulation: {
    category: "Stress & Nervous System",
    typicalOnset: "7-14 days",
    fullEffect: "3-6 weeks",
    weeklyProgression: [
      "Week 1: Introduction to breathwork (simple 4-7-8 or box breathing)",
      "Week 2: Consistency building (same time daily)",
      "Week 3: Integration with routine (linked to existing habits)",
      "Week 4+: Automatic regulation response",
    ],
  },
  temperature: {
    category: "Temperature Regulation",
    typicalOnset: "1-3 days",
    fullEffect: "1-2 weeks",
    weeklyProgression: [
      "Week 1: Environment adjustments (room temp, bedding)",
      "Week 2: Body-based strategies (shower timing, cooling)",
      "Week 3+: Fine-tuning based on feedback",
    ],
  },
  circadian: {
    category: "Circadian Consistency",
    typicalOnset: "3-5 days",
    fullEffect: "10-14 days",
    weeklyProgression: [
      "Week 1: Anchor wake time (same time ±30 min daily)",
      "Week 2: Add light exposure protocol (morning light)",
      "Week 3+: Stabilized rhythm maintenance",
    ],
  },
  wind_down: {
    category: "Wind-Down Routines",
    typicalOnset: "3-7 days",
    fullEffect: "2-3 weeks",
    weeklyProgression: [
      "Week 1: Single transition cue (light dimming or device cutoff)",
      "Week 2: Add second element (relaxation practice)",
      "Week 3: Full sequence established",
      "Week 4+: Automatic nervous system association",
    ],
  },
  pain_management: {
    category: "Comfort & Pain Management",
    typicalOnset: "Immediate awareness, 1-2 weeks for measurable change",
    fullEffect: "3-4 weeks",
    weeklyProgression: [
      "Week 1: Positioning awareness + morning stretch introduction",
      "Week 2: Consistent stretching routine (morning)",
      "Week 3: Evening positioning protocol added",
      "Week 4+: Integrated mobility practice",
    ],
  },
};

// ============ ADAPTIVE PLAN OUTPUT STRUCTURE ============

export interface AdaptiveDayPlan {
  dayName: string;
  focus: string;
  morningMobility: string;
  eveningWindDown: string;
  environmentAdjustment: string;
  behavioralFocus: string;
  productCue?: string; // Only if owns product, never salesy
}

export interface AdaptiveWeeklyPlan {
  week_focus: string;
  weekly_priorities: string[];
  adaptive_summary: string;
  phase: PlanPhase;
  detected_patterns: DetectedPattern[];
  days: {
    monday: AdaptiveDayPlan;
    tuesday: AdaptiveDayPlan;
    wednesday: AdaptiveDayPlan;
    thursday: AdaptiveDayPlan;
    friday: AdaptiveDayPlan;
    saturday: AdaptiveDayPlan;
    sunday: AdaptiveDayPlan;
  };
}

// ============ COMPREHENSIVE CONTEXT BUILDER ============

export interface AdaptivePlanContext {
  // User progression
  progression: UserProgressionContext;
  
  // Detected patterns from notes
  notePatterns: DetectedPattern[];
  
  // Adaptive difficulty
  adaptation: AdaptiveAdjustment;
  
  // Research timelines relevant to this user
  relevantTimelines: ImprovementTimeline[];
  
  // Summary for AI prompt
  adaptiveSummary: string;
}

/**
 * Build comprehensive adaptive context for plan generation
 */
export function buildAdaptivePlanContext(
  logs: MinimalSleepLog[],
  attrs: SleepAttributes,
  plansGenerated: number,
  previousPlanCompleted: boolean,
  adherenceRate: number = 50
): AdaptivePlanContext {
  // Get first log date for progression
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : null;
  
  // Calculate progression phase
  const progression = determineProgressionPhase(
    firstLogDate,
    logs.length,
    plansGenerated,
    adherenceRate
  );
  
  // Detect note patterns (use recent 30 days)
  const recentLogs = logs.slice(0, 30);
  const notePatterns = detectNotePatterns(recentLogs);
  
  // Calculate adaptive difficulty
  const adaptation = calculateAdaptiveDifficulty(
    adherenceRate,
    attrs.sleep_trend || "stable",
    attrs.pain_trend || "stable",
    attrs.streak_days || 0,
    previousPlanCompleted
  );
  
  // Determine relevant timelines based on user's focus areas
  const relevantTimelines: ImprovementTimeline[] = [];
  
  if (attrs.pain_points?.some(p => p !== "none")) {
    relevantTimelines.push(IMPROVEMENT_TIMELINES.pain_management);
    relevantTimelines.push(IMPROVEMENT_TIMELINES.alignment_posture);
  }
  
  if (attrs.stress_level === "high" || attrs.sleep_stress_level === "high") {
    relevantTimelines.push(IMPROVEMENT_TIMELINES.stress_regulation);
    relevantTimelines.push(IMPROVEMENT_TIMELINES.wind_down);
  }
  
  if (attrs.temperature_sensitive || attrs.hot_nights_7d >= 2) {
    relevantTimelines.push(IMPROVEMENT_TIMELINES.temperature);
  }
  
  if (notePatterns.some(p => p.pattern === "irregular_schedule" || p.pattern === "social_jetlag")) {
    relevantTimelines.push(IMPROVEMENT_TIMELINES.circadian);
  }
  
  // Default if nothing specific
  if (relevantTimelines.length === 0) {
    relevantTimelines.push(IMPROVEMENT_TIMELINES.wind_down);
    relevantTimelines.push(IMPROVEMENT_TIMELINES.circadian);
  }
  
  // Build summary
  const adaptiveSummary = buildAdaptiveSummaryText(
    progression,
    notePatterns,
    adaptation,
    attrs
  );
  
  return {
    progression,
    notePatterns,
    adaptation,
    relevantTimelines: relevantTimelines.slice(0, 3),
    adaptiveSummary,
  };
}

function buildAdaptiveSummaryText(
  progression: UserProgressionContext,
  patterns: DetectedPattern[],
  adaptation: AdaptiveAdjustment,
  attrs: SleepAttributes
): string {
  const parts: string[] = [];
  
  // Phase context
  parts.push(`Phase: ${PHASE_CONFIGS[progression.phase].label} (Week ${progression.weekNumber})`);
  
  // Adaptation reason
  parts.push(adaptation.reason);
  
  // Pattern insights
  if (patterns.length > 0) {
    const patternNames = patterns.map(p => p.pattern.replace(/_/g, " ")).join(", ");
    parts.push(`Detected patterns: ${patternNames}`);
  }
  
  // Trend context
  if (attrs.sleep_trend === "worsening" || attrs.pain_trend === "worsening") {
    parts.push("Focus on stabilization and identifying triggers");
  } else if (attrs.sleep_trend === "improving") {
    parts.push("Building on positive momentum");
  }
  
  return parts.join(". ") + ".";
}

/**
 * Build the comprehensive AI prompt section for adaptive planning
 */
export function buildAdaptivePromptSection(context: AdaptivePlanContext): string {
  const phaseConfig = PHASE_CONFIGS[context.progression.phase];
  
  let prompt = `
=== ADAPTIVE PLAN ENGINE ===

PHASE: ${phaseConfig.label.toUpperCase()}
${phaseConfig.description}
Week Number: ${context.progression.weekNumber}
Action Depth: ${phaseConfig.actionDepth}
Tone: ${phaseConfig.focusTone}

${context.progression.progressionReason}

=== ADAPTIVE DIFFICULTY: ${context.adaptation.difficulty.toUpperCase()} ===
Reason: ${context.adaptation.reason}
Morning Task Duration: ${context.adaptation.morningTaskDuration}
Evening Task Duration: ${context.adaptation.eveningTaskDuration}
Micro-habits per day: ${context.adaptation.microHabitCount}
${context.adaptation.difficulty === "simplified" 
  ? "SIMPLIFY everything. Single-step actions. Break down complex tasks. Focus on ONE win per day." 
  : context.adaptation.difficulty === "progressive"
  ? "User is thriving. Introduce progressive challenges. Layer multiple elements."
  : "Standard difficulty. Clear, actionable steps."}
`;

  // Pattern-based adjustments
  if (context.notePatterns.length > 0) {
    prompt += `
=== DETECTED PATTERNS FROM NOTES ===
The following patterns were detected in the user's notes. Address these specifically:
`;
    for (const pattern of context.notePatterns) {
      prompt += `
Pattern: ${pattern.pattern.replace(/_/g, " ")} (${pattern.frequency} occurrences)
Micro-education to include: "${pattern.microEducation}"
Next week focus: "${pattern.nextWeekFocus}"
`;
    }
  }

  // Research timelines
  if (context.relevantTimelines.length > 0) {
    prompt += `
=== RESEARCH-GROUNDED TIMELINES ===
Use these evidence-based timelines to set realistic expectations:
`;
    for (const timeline of context.relevantTimelines) {
      const currentWeek = Math.min(context.progression.weekNumber, timeline.weeklyProgression.length);
      const currentProgression = timeline.weeklyProgression[currentWeek - 1] || timeline.weeklyProgression[timeline.weeklyProgression.length - 1];
      prompt += `
${timeline.category}:
- Typical onset: ${timeline.typicalOnset}
- Full effect: ${timeline.fullEffect}
- Current focus: ${currentProgression}
`;
    }
  }

  prompt += `
=== ADAPTIVE PLAN RULES ===

1. PROGRESSION LOGIC:
   - If user completed last week's actions → PROGRESS to next level
   - If user did NOT complete actions → SIMPLIFY this week
   - Never punish. Always support with smaller steps.

2. PATTERN RESPONSE:
   - If alcohol/late meal detected → Add micro-education and timing adjustment
   - If stress detected → Add wind-down rituals
   - If temperature issues → Add cooling strategies
   - If irregular schedule → Add circadian anchors

3. RESEARCH TIMING:
   - Posture changes: 2-4 weeks for habit formation
   - Breathing work: 7-14 days to take effect
   - Temperature: Immediate feedback (1-3 days)
   - Circadian: 10-14 days to stabilize

4. NEVER REPETITIVE:
   - Each day must have UNIQUE focus
   - Vary morning tasks across the week
   - Progress from awareness → practice → integration

5. PREMIUM SCANDINAVIAN TONE:
   - Calm, grounded language
   - No emojis
   - No clinical terms
   - Science-informed but warm
   - "supports" not "fixes"

=== ADAPTIVE SUMMARY ===
${context.adaptiveSummary}
`;

  return prompt;
}
