/**
 * Sleep Assessment Types and Logic
 * 
 * Structured assessment types and deterministic persona/scoring logic
 * for the upgraded Sleep Quiz experience.
 * 
 * DESIGN PRINCIPLES:
 * - All calculations are deterministic (no AI)
 * - Calm, Scandinavian, scientific tone
 * - No medical claims
 * - Full segmentation support for Klaviyo
 * 
 * v8: Psychology-first persona detection with explicit PERSONA_RULES,
 *     separated signal detection, improved confidence logic
 */

// ============ TYPES ============

// Legacy persona types (backwards compatibility)
export type LegacyPersona = "jason" | "mila" | "leo";

// New persona system with clearer naming (v7: added recovery_sleeper)
export type PersonaCluster = "pain_sleeper" | "stress_insomnia" | "optimizer" | "recovery_sleeper";

// Keep SleepPersona for backward compatibility, but also export the new type
export type SleepPersona = LegacyPersona;

// Core need mapping for Klaviyo segmentation (v7: added recovery)
export type CoreNeed = "alignment" | "environment" | "optimization" | "recovery";

// v10: Persona confidence levels
export type PersonaConfidenceLevel = "low" | "medium" | "high";

// v10: Coach readiness labels
export type CoachReadinessLabel = "Early Stage" | "Developing" | "Ready";

// Core need mapping helper (v7: added recovery_sleeper)
export const CORE_NEED_MAP: Record<PersonaCluster, CoreNeed> = {
  pain_sleeper: "alignment",
  stress_insomnia: "environment",
  optimizer: "optimization",
  recovery_sleeper: "recovery",
};

/**
 * Get persona confidence level from score
 */
export function getPersonaConfidenceLevel(confidence: number): PersonaConfidenceLevel {
  if (confidence < 50) return "low";
  if (confidence < 75) return "medium";
  return "high";
}

/**
 * Determine if persona-specific messaging should be shown
 * Returns false when confidence < 50 (use neutral messaging instead)
 */
export function shouldPersonalizePersonaMessaging(confidence: number | null | undefined): boolean {
  if (confidence === null || confidence === undefined) return false;
  return confidence >= 50;
}

/**
 * Get coach readiness label from score
 */
export function getCoachReadinessLabel(score: number): CoachReadinessLabel {
  if (score < 40) return "Early Stage";
  if (score < 70) return "Developing";
  return "Ready";
}

// Klaviyo segmentation snapshot interface
export interface KlaviyoSegmentationSnapshot {
  persona_cluster: PersonaCluster;
  persona_label: string;
  core_need: CoreNeed;
  primary_product: string;
  secondary_product: string | null;
  recommended_bundle: string | null;
}

/**
 * Build a flat segmentation snapshot for Klaviyo flows
 * This helper ensures stable fields for segmentation
 */
export function buildKlaviyoSegmentationSnapshot(assessment: SleepAssessment): KlaviyoSegmentationSnapshot {
  const coreNeedMap: Record<PersonaCluster, CoreNeed> = {
    pain_sleeper: "alignment",
    stress_insomnia: "environment",
    optimizer: "optimization",
    recovery_sleeper: "recovery",
  };
  
  return {
    persona_cluster: assessment.persona.cluster,
    persona_label: assessment.persona.label,
    core_need: coreNeedMap[assessment.persona.cluster],
    primary_product: assessment.productRecommendations.primary_product,
    secondary_product: assessment.productRecommendations.secondary_product || null,
    recommended_bundle: assessment.productRecommendations.recommended_bundle || null,
  };
}

export interface SleepIdentity {
  position: "side" | "back" | "stomach" | "mixed";
  label: string;
  description: string;
}

// v9: Extended identity metrics
export interface SleepIdentityV2 {
  position: "side" | "back" | "stomach" | "mixed";
  label: string;
  description: string;
  // v9: New structured risk/load scores
  sleep_posture_risk_level: "low" | "moderate" | "high";   // Deterministic posture risk
  environmental_stress_score: number;  // 0-100, higher = more env stress
  recovery_load_score: number;         // 0-100, higher = more recovery need
}

export interface AssessmentScores {
  alignment_risk_score: number;      // 0–100, higher = more risk
  neck_support_score: number;        // 0–100, higher = better support
  sleep_stability_score: number;     // 0–100, higher = more stable
  environment_score: number;         // 0–100, higher = better environment
  light_sensitivity_score: number;   // 0–100, higher = more affected by light
  temperature_disruption_score: number; // 0–100, higher = more disrupted by temp
}

// v9: Extended scores with new metrics
export interface AssessmentScoresV2 extends AssessmentScores {
  // v9: Early Morning Energy Score
  energy_potential_score: number;    // 0-100, derived from pain + environment + optimization readiness
}

export interface PersonaResult {
  guess: SleepPersona;         // jason | mila | leo (legacy)
  rationale: string;
  // Enhanced persona fields
  cluster: PersonaCluster;
  name?: string;            // INTERNAL ONLY - Human name for Klaviyo segmentation (optional)
  label: string;            // Customer-facing label (e.g., "Pain Sleeper")
  description: string;
  recommended_modules: number[];
  legacyType: LegacyPersona;
  // v9: Confidence score (0-100) based on weighted signal strength
  confidence: number;
  // v10: Confidence reasoning (1-2 sentences explaining confidence level)
  confidence_reasoning: string;
}

// v9: Module relevance weighting
export interface ModuleRelevance {
  module_id: number;
  relevance_score: number; // 0-100
  name: string;
  description: string;
}

/**
 * Human persona names - INTERNAL ONLY for Klaviyo segmentation
 * 
 * These names should NOT be displayed in customer-facing UI.
 * Use cluster labels (Pain Sleeper, Stress & Environment Sleeper, etc.) for UI.
 */
export const PERSONA_HUMAN_NAMES: Record<PersonaCluster, string> = {
  pain_sleeper: "Jason",
  stress_insomnia: "Mila",
  optimizer: "Leo",
  recovery_sleeper: "Riley",
};

/**
 * Persona definitions for system-wide use
 * 
 * NOTE: The `name` field is INTERNAL ONLY (Jason, Mila, Leo, Riley).
 * Customer-facing surfaces should use `label` (Pain Sleeper, etc.)
 */
export const PERSONA_DEFINITIONS: Record<PersonaCluster, {
  name: string;           // INTERNAL ONLY - Human name for Klaviyo segmentation
  label: string;          // Customer-facing label (e.g., "Pain Sleeper")
  description: string;
  recommended_modules: number[];
  legacyType: LegacyPersona;
}> = {
  pain_sleeper: {
    name: "Jason",
    label: "The Pain Sleeper",
    description: "A sleeper whose rest is shaped by physical tension and alignment challenges. Improving cervical and spinal support meaningfully enhances comfort and morning ease.",
    recommended_modules: [4, 10, 11],
    legacyType: "jason",
  },
  stress_insomnia: {
    name: "Mila",
    label: "The Stress & Environment Sleeper",
    description: "A sleeper whose rest is influenced by environmental cues and nervous-system activation. Calming routines and environmental control strengthen sleep continuity.",
    recommended_modules: [6, 9, 12],
    legacyType: "mila",
  },
  optimizer: {
    name: "Leo",
    label: "The Sleep Optimizer",
    description: "A motivated sleeper focused on enhancing recovery, energy, and long-term performance through consistent, measurable sleep improvements.",
    recommended_modules: [7, 8, 10, 12],
    legacyType: "leo",
  },
  recovery_sleeper: {
    name: "Riley",
    label: "The Recovery Sleeper",
    description: "A sleeper oriented toward physical restoration and training recovery. Temperature regulation, deep sleep optimization, and morning readiness support athletic and active lifestyles.",
    recommended_modules: [7, 8, 10],
    legacyType: "leo",
  },
};

// Module definitions for display (v7: added module 12)
export const MODULE_DEFINITIONS: Record<number, { name: string; description: string }> = {
  4: { name: "Alignment Fundamentals", description: "Core spinal alignment principles" },
  6: { name: "Environment Optimization", description: "Light, noise, and temperature control" },
  7: { name: "Temperature Regulation", description: "Optimal sleep temperature strategies" },
  8: { name: "Deep Sleep Enhancement", description: "Maximizing restorative sleep phases" },
  9: { name: "Evening Routine Reset", description: "Wind-down protocols for better sleep onset" },
  10: { name: "Morning Mobility", description: "Gentle morning movement practices" },
  11: { name: "Hip & Lower Body", description: "Lower body alignment techniques" },
  12: { name: "Sleep Hygiene Foundations", description: "Daily habits that support consistent, higher-quality sleep" },
};

export interface EnvironmentFindings {
  keyIssues: string[];
  summary: string;
}

export type PrimaryProduct = "ergonomic_pillow";
export type SecondaryProduct = "knee_pillow" | "silk_mask";
export type RecommendedBundle = "alignment_set" | "deep_sleep_set" | "performance_set";

export interface ProductRecommendations {
  primary_product: PrimaryProduct;
  secondary_product?: SecondaryProduct;
  recommended_bundle?: RecommendedBundle;
  reasoning: string;
  recommendation_confidence: number; // 0–100
  fit_explanation: string; // "Why this setup fits your sleep identity"
  persona_reasoning: string; // Why this recommendation matches the persona
  // v10: Enhanced product fit scoring
  product_fit_score: number;           // 0-100, how well products match user needs
  product_fit_reasoning: string;        // Explanation of fit score
  confidence_weighted_recommendation: boolean; // True if persona confidence >= 50
}

export interface CoachPreview {
  day_1_3: string;
  day_4_7: string;
  day_7_14: string;
}

export interface SleepAssessment {
  sleepIdentity: SleepIdentity;
  scores: AssessmentScores;
  persona: PersonaResult;
  environmentFindings: EnvironmentFindings;
  productRecommendations: ProductRecommendations;
  coachPreview: CoachPreview;
  // Segmentation fields for Klaviyo
  alignment_priority: boolean;
  environment_priority: boolean;
  top_risk_drivers: string[]; // Top 3 risk factors
  // v9: Extended metrics
  energy_potential_score?: number;     // 0-100, derived morning energy potential
  module_relevance?: ModuleRelevance[]; // Weighted module ordering
  // v10: Coach readiness
  coach_readiness_score: number;        // 0-100
  coach_readiness_label: CoachReadinessLabel;
  coach_readiness_rationale: string;
}

// ============ v8: PSYCHOLOGY-FIRST PERSONA DETECTION ============

/**
 * v8: Detected signals from quiz answers
 * 
 * Signals are boolean indicators derived from quiz answers.
 * They represent psychological and behavioral patterns, not just symptoms.
 */
interface DetectedSignals {
  // Pain Sleeper signals (alignment/physical comfort)
  hasNeckPain: boolean;
  hasShoulderPain: boolean;
  hasUpperBackPain: boolean;
  hasLowerBackPain: boolean;
  hasHipPain: boolean;
  hasHighPainSeverity: boolean;      // painSeverity >= 6
  hasModeratePainSeverity: boolean;  // painSeverity >= 4
  hasLowPillowSatisfaction: boolean; // pillowSatisfaction <= 4
  hasPainReductionGoal: boolean;
  hasPostureGoal: boolean;
  hasMorningStiffnessPattern: boolean; // moves often + pain areas
  hasMultiplePillows: boolean;
  
  // Stress & Environment Sleeper signals (environment/nervous system)
  hasBrightRoom: boolean;
  hasDimRoom: boolean;
  hasSleepHot: boolean;
  hasSleepCold: boolean;
  hasFrequentAwakenings: boolean;    // 4+ times
  hasModerateAwakenings: boolean;    // 2-3 times
  hasSlowSleepOnset: boolean;        // 30-60 min
  hasVerySlowSleepOnset: boolean;    // 60+ min
  hasRestlessWithoutPain: boolean;   // moves often but no pain
  hasStayAsleepGoal: boolean;
  hasFallAsleepFasterGoal: boolean;
  hasHighScreenUse: boolean;         // always/often
  hasNoisyEnvironment: boolean;
  hasRacingMindPattern: boolean;     // slow onset + high screen + stress indicators
  
  // Recovery Sleeper signals (physical restoration/training)
  hasRecoveryGoal: boolean;          // faster_recovery, better_recovery, muscle_repair
  hasWakeRefreshedGoal: boolean;
  hasMoreEnergyGoal: boolean;
  usesWearables: boolean;            // oura, whoop, fitness tracker
  hasMultiplePerformanceGoals: boolean;
  hasLowPainBaseline: boolean;       // painSeverity <= 3 && no pain areas
  hasGoodSleepStability: boolean;    // rarely/never awakenings
  
  // Optimizer signals (performance/motivation)
  hasBetterQualityGoal: boolean;
  hasMultipleGoals: boolean;         // 3+ goals
  hasHighPillowSatisfaction: boolean; // pillowSatisfaction >= 7
  hasQuickSleepOnset: boolean;       // quick or normal
  hasMinimalIssues: boolean;         // low pain + good environment + stable sleep
}

/**
 * v8: Explicit persona scoring rules
 * 
 * Each rule maps a signal to a weight for each persona.
 * Positive weights indicate the signal supports that persona.
 * Negative weights indicate the signal contradicts that persona.
 */
const PERSONA_RULES: Record<keyof DetectedSignals, {
  pain_sleeper: number;
  stress_insomnia: number;
  optimizer: number;
  recovery_sleeper: number;
}> = {
  // === PAIN SLEEPER PRIMARY SIGNALS ===
  hasNeckPain:              { pain_sleeper: 6, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasShoulderPain:          { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasUpperBackPain:         { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasLowerBackPain:         { pain_sleeper: 6, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasHipPain:               { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasHighPainSeverity:      { pain_sleeper: 7, stress_insomnia: 0, optimizer: -3, recovery_sleeper: -2 },
  hasModeratePainSeverity:  { pain_sleeper: 4, stress_insomnia: 0, optimizer: -1, recovery_sleeper: -1 },
  hasLowPillowSatisfaction: { pain_sleeper: 5, stress_insomnia: 1, optimizer: -2, recovery_sleeper: -1 },
  hasPainReductionGoal:     { pain_sleeper: 6, stress_insomnia: 0, optimizer: 0, recovery_sleeper: 1 },
  hasPostureGoal:           { pain_sleeper: 4, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 1 },
  hasMorningStiffnessPattern: { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasMultiplePillows:       { pain_sleeper: 4, stress_insomnia: 1, optimizer: -1, recovery_sleeper: 0 },
  
  // === STRESS & ENVIRONMENT SLEEPER PRIMARY SIGNALS ===
  hasBrightRoom:            { pain_sleeper: 0, stress_insomnia: 6, optimizer: -1, recovery_sleeper: -1 },
  hasDimRoom:               { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasSleepHot:              { pain_sleeper: 0, stress_insomnia: 5, optimizer: -1, recovery_sleeper: 1 },
  hasSleepCold:             { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasFrequentAwakenings:    { pain_sleeper: 1, stress_insomnia: 6, optimizer: -2, recovery_sleeper: -1 },
  hasModerateAwakenings:    { pain_sleeper: 1, stress_insomnia: 4, optimizer: -1, recovery_sleeper: 0 },
  hasSlowSleepOnset:        { pain_sleeper: 0, stress_insomnia: 4, optimizer: -1, recovery_sleeper: 0 },
  hasVerySlowSleepOnset:    { pain_sleeper: 0, stress_insomnia: 6, optimizer: -2, recovery_sleeper: -1 },
  hasRestlessWithoutPain:   { pain_sleeper: 0, stress_insomnia: 5, optimizer: 0, recovery_sleeper: 0 },
  hasStayAsleepGoal:        { pain_sleeper: 1, stress_insomnia: 5, optimizer: 1, recovery_sleeper: 1 },
  hasFallAsleepFasterGoal:  { pain_sleeper: 0, stress_insomnia: 5, optimizer: 1, recovery_sleeper: 0 },
  hasHighScreenUse:         { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasNoisyEnvironment:      { pain_sleeper: 0, stress_insomnia: 4, optimizer: -1, recovery_sleeper: -1 },
  hasRacingMindPattern:     { pain_sleeper: 0, stress_insomnia: 5, optimizer: -1, recovery_sleeper: -1 },
  
  // === RECOVERY SLEEPER PRIMARY SIGNALS ===
  hasRecoveryGoal:          { pain_sleeper: 1, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 7 },
  hasWakeRefreshedGoal:     { pain_sleeper: 1, stress_insomnia: 1, optimizer: 4, recovery_sleeper: 4 },
  hasMoreEnergyGoal:        { pain_sleeper: 1, stress_insomnia: 1, optimizer: 3, recovery_sleeper: 5 },
  usesWearables:            { pain_sleeper: 0, stress_insomnia: 0, optimizer: 3, recovery_sleeper: 5 },
  hasMultiplePerformanceGoals: { pain_sleeper: 0, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 4 },
  hasLowPainBaseline:       { pain_sleeper: -3, stress_insomnia: 1, optimizer: 3, recovery_sleeper: 3 },
  hasGoodSleepStability:    { pain_sleeper: 0, stress_insomnia: -2, optimizer: 3, recovery_sleeper: 2 },
  
  // === OPTIMIZER PRIMARY SIGNALS ===
  hasBetterQualityGoal:     { pain_sleeper: 1, stress_insomnia: 1, optimizer: 5, recovery_sleeper: 2 },
  hasMultipleGoals:         { pain_sleeper: 1, stress_insomnia: 1, optimizer: 4, recovery_sleeper: 2 },
  hasHighPillowSatisfaction: { pain_sleeper: -2, stress_insomnia: 0, optimizer: 4, recovery_sleeper: 2 },
  hasQuickSleepOnset:       { pain_sleeper: 0, stress_insomnia: -2, optimizer: 3, recovery_sleeper: 2 },
  hasMinimalIssues:         { pain_sleeper: -4, stress_insomnia: -3, optimizer: 5, recovery_sleeper: 3 },
};

/**
 * v8: Detect signals from quiz answers
 * 
 * This function translates raw quiz answers into psychological/behavioral signals.
 * Signals are easier to reason about and adjust than raw answer checks.
 */
function detectSignals(quizAnswers: Record<string, any>): DetectedSignals {
  const painAreas: string[] = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const sleepGoals: string[] = quizAnswers.sleepGoals || [];
  const sleepEquipment: string[] = quizAnswers.sleepEquipment || [];
  const nightAwakenings: string = quizAnswers.nightAwakenings || "";
  const movesOften: string = quizAnswers.movesOften || "";
  const roomBrightness: string = quizAnswers.roomBrightness || "";
  const sleepTemperature: string = quizAnswers.sleepTemperature || "";
  const pillowSatisfaction: number = quizAnswers.pillowSatisfaction ?? 5;
  const sleepLatency: string = quizAnswers.sleepLatency || "";
  const painSeverity: number = quizAnswers.painSeverity ?? 5;
  const pillowCount: string = quizAnswers.pillowCount || "";
  const eveningScreenUse: string = quizAnswers.eveningScreenUse || "";
  const roomNoise: string = quizAnswers.roomNoise || "";
  
  // Helper: check if any pain areas exist (excluding "none")
  const hasPain = painAreas.some(p => p !== "none" && p !== "no_pain");
  
  // Detect performance-related goals
  const performanceGoals = ['faster_recovery', 'better_recovery', 'muscle_repair', 'wake_refreshed', 'more_energy'];
  const recoveryGoals = ['faster_recovery', 'better_recovery', 'muscle_repair'];
  
  return {
    // Pain Sleeper signals
    hasNeckPain: painAreas.includes("neck"),
    hasShoulderPain: painAreas.includes("shoulders"),
    hasUpperBackPain: painAreas.includes("upper_back"),
    hasLowerBackPain: painAreas.includes("lower_back"),
    hasHipPain: painAreas.includes("hips"),
    hasHighPainSeverity: painSeverity >= 6,
    hasModeratePainSeverity: painSeverity >= 4 && painSeverity < 6,
    hasLowPillowSatisfaction: pillowSatisfaction <= 4,
    hasPainReductionGoal: sleepGoals.includes("reduce_pain"),
    hasPostureGoal: sleepGoals.includes("better_posture"),
    hasMorningStiffnessPattern: (movesOften === "always" || movesOften === "often") && hasPain,
    hasMultiplePillows: pillowCount === "2" || pillowCount === "3" || pillowCount === "3+",
    
    // Stress & Environment Sleeper signals
    hasBrightRoom: roomBrightness === "bright",
    hasDimRoom: roomBrightness === "dim",
    hasSleepHot: sleepTemperature === "hot",
    hasSleepCold: sleepTemperature === "cold",
    hasFrequentAwakenings: nightAwakenings === "frequently",
    hasModerateAwakenings: nightAwakenings === "twice",
    hasSlowSleepOnset: sleepLatency === "slow",
    hasVerySlowSleepOnset: sleepLatency === "very_slow",
    hasRestlessWithoutPain: (movesOften === "always" || movesOften === "often") && !hasPain,
    hasStayAsleepGoal: sleepGoals.includes("stay_asleep"),
    hasFallAsleepFasterGoal: sleepGoals.includes("fall_asleep_faster"),
    hasHighScreenUse: eveningScreenUse === "always" || eveningScreenUse === "often",
    hasNoisyEnvironment: roomNoise === "noisy",
    hasRacingMindPattern: (sleepLatency === "slow" || sleepLatency === "very_slow") && 
                          (eveningScreenUse === "always" || eveningScreenUse === "often"),
    
    // Recovery Sleeper signals
    hasRecoveryGoal: recoveryGoals.some(g => sleepGoals.includes(g)),
    hasWakeRefreshedGoal: sleepGoals.includes("wake_refreshed"),
    hasMoreEnergyGoal: sleepGoals.includes("more_energy"),
    usesWearables: sleepEquipment.includes("oura") || sleepEquipment.includes("whoop") || 
                   sleepEquipment.includes("fitness_tracker") || sleepEquipment.includes("smart_watch"),
    hasMultiplePerformanceGoals: sleepGoals.filter(g => performanceGoals.includes(g)).length >= 2,
    hasLowPainBaseline: painSeverity <= 3 && !hasPain,
    hasGoodSleepStability: nightAwakenings === "rarely" || nightAwakenings === "never",
    
    // Optimizer signals
    hasBetterQualityGoal: sleepGoals.includes("better_quality"),
    hasMultipleGoals: sleepGoals.length >= 3,
    hasHighPillowSatisfaction: pillowSatisfaction >= 7,
    hasQuickSleepOnset: sleepLatency === "quick" || sleepLatency === "normal",
    hasMinimalIssues: painSeverity <= 2 && !hasPain && 
                      (roomBrightness === "dark" || roomBrightness === "") &&
                      (sleepTemperature === "neutral" || sleepTemperature === "") &&
                      (nightAwakenings === "rarely" || nightAwakenings === "never"),
  };
}

/**
 * v8: Calculate persona scores from detected signals
 * 
 * Iterates through all detected signals and applies PERSONA_RULES weights.
 * Returns raw scores for each persona.
 */
function calculatePersonaScores(signals: DetectedSignals): Record<PersonaCluster, number> {
  const scores: Record<PersonaCluster, number> = {
    pain_sleeper: 0,
    stress_insomnia: 0,
    optimizer: 0,
    recovery_sleeper: 0,
  };
  
  // Apply each rule
  for (const [signalKey, isActive] of Object.entries(signals)) {
    if (isActive) {
      const rule = PERSONA_RULES[signalKey as keyof DetectedSignals];
      scores.pain_sleeper += rule.pain_sleeper;
      scores.stress_insomnia += rule.stress_insomnia;
      scores.optimizer += rule.optimizer;
      scores.recovery_sleeper += rule.recovery_sleeper;
    }
  }
  
  // Ensure no negative scores (just floor at 0)
  scores.pain_sleeper = Math.max(0, scores.pain_sleeper);
  scores.stress_insomnia = Math.max(0, scores.stress_insomnia);
  scores.optimizer = Math.max(0, scores.optimizer);
  scores.recovery_sleeper = Math.max(0, scores.recovery_sleeper);
  
  return scores;
}

/**
 * v8: Build psychology-first rationale from signals
 * 
 * Creates human-readable explanations based on which signals were detected.
 * Uses calm, scientific, non-medical language.
 */
function buildRationale(cluster: PersonaCluster, signals: DetectedSignals): string {
  const observations: string[] = [];
  
  if (cluster === "pain_sleeper") {
    // Build specific observations for pain sleeper
    if (signals.hasNeckPain) observations.push("neck tension");
    if (signals.hasShoulderPain) observations.push("shoulder stiffness");
    if (signals.hasLowerBackPain) observations.push("lower back discomfort");
    if (signals.hasHipPain) observations.push("hip alignment concerns");
    if (signals.hasHighPainSeverity) observations.push("elevated morning discomfort levels");
    if (signals.hasLowPillowSatisfaction) observations.push("current pillow not meeting your support needs");
    if (signals.hasMorningStiffnessPattern) observations.push("restless movement patterns suggesting discomfort");
    
    const focus = observations.slice(0, 3).join(", ") || "physical comfort and alignment";
    return `Your responses indicate that ${focus} ${observations.length > 1 ? 'are' : 'is'} influencing your sleep quality. Addressing cervical and spinal support can meaningfully reduce tension and enhance your overall rest.`;
  }
  
  if (cluster === "stress_insomnia") {
    // Build specific observations for stress & environment sleeper
    if (signals.hasBrightRoom) observations.push("light exposure in your sleep environment");
    if (signals.hasSleepHot) observations.push("elevated sleep temperature");
    if (signals.hasSleepCold) observations.push("cooler-than-ideal sleep environment");
    if (signals.hasFrequentAwakenings || signals.hasModerateAwakenings) observations.push("fragmented sleep patterns");
    if (signals.hasVerySlowSleepOnset || signals.hasSlowSleepOnset) observations.push("difficulty winding down at night");
    if (signals.hasRacingMindPattern) observations.push("an active mind before bed");
    if (signals.hasNoisyEnvironment) observations.push("environmental noise disruptions");
    
    const focus = observations.slice(0, 3).join(", ") || "environmental factors and wind-down difficulty";
    return `Your sleep patterns suggest that ${focus} ${observations.length > 1 ? 'are' : 'is'} influencing your rest quality. Optimizing your sleep environment and establishing calming routines can strengthen your natural sleep cycles.`;
  }
  
  if (cluster === "recovery_sleeper") {
    // Build specific observations for recovery sleeper
    if (signals.hasRecoveryGoal) observations.push("a focus on physical recovery");
    if (signals.hasWakeRefreshedGoal) observations.push("morning readiness as a priority");
    if (signals.hasMoreEnergyGoal) observations.push("sustained daytime energy");
    if (signals.usesWearables) observations.push("data-driven sleep tracking");
    if (signals.hasLowPainBaseline) observations.push("a solid physical foundation");
    if (signals.hasGoodSleepStability) observations.push("generally stable sleep patterns");
    
    const focus = observations.slice(0, 3).join(", ") || "physical restoration and recovery";
    const foundationNote = (signals.hasLowPainBaseline || signals.hasGoodSleepStability) 
      ? " You already have a relatively stable sleep foundation. "
      : " ";
    return `Your focus on ${focus} indicates a recovery-oriented approach to sleep.${foundationNote}Optimizing deep sleep phases and temperature regulation can enhance your body's natural restoration processes.`;
  }
  
  // Optimizer
  if (signals.hasBetterQualityGoal) observations.push("overall sleep quality improvement");
  if (signals.hasWakeRefreshedGoal) observations.push("morning energy optimization");
  if (signals.hasMultipleGoals) observations.push("multiple improvement goals");
  if (signals.hasHighPillowSatisfaction) observations.push("a functional current setup");
  if (signals.hasQuickSleepOnset) observations.push("efficient sleep onset");
  if (signals.hasMinimalIssues) observations.push("a solid baseline to build upon");
  
  const focus = observations.slice(0, 3).join(", ") || "sleep quality and recovery";
  const foundationNote = signals.hasMinimalIssues 
    ? " With a solid sleep foundation, "
    : " ";
  return `You're focused on enhancing ${focus}.${foundationNote}Targeted improvements to your setup and consistent habits can maximize your body's natural recovery processes.`;
}

/**
 * v8: Build confidence reasoning from signals and confidence level
 */
function buildConfidenceReasoning(
  cluster: PersonaCluster, 
  confidence: number, 
  signals: DetectedSignals,
  scores: Record<PersonaCluster, number>
): string {
  const confidenceLevel = getPersonaConfidenceLevel(confidence);
  
  // Count active signals for the winning persona
  const clusterSignalMapping: Record<PersonaCluster, (keyof DetectedSignals)[]> = {
    pain_sleeper: ['hasNeckPain', 'hasShoulderPain', 'hasUpperBackPain', 'hasLowerBackPain', 
                   'hasHipPain', 'hasHighPainSeverity', 'hasLowPillowSatisfaction', 
                   'hasPainReductionGoal', 'hasMorningStiffnessPattern'],
    stress_insomnia: ['hasBrightRoom', 'hasSleepHot', 'hasFrequentAwakenings', 
                      'hasVerySlowSleepOnset', 'hasRacingMindPattern', 'hasStayAsleepGoal',
                      'hasFallAsleepFasterGoal', 'hasNoisyEnvironment'],
    optimizer: ['hasBetterQualityGoal', 'hasMultipleGoals', 'hasHighPillowSatisfaction',
                'hasQuickSleepOnset', 'hasMinimalIssues'],
    recovery_sleeper: ['hasRecoveryGoal', 'usesWearables', 'hasMultiplePerformanceGoals',
                       'hasLowPainBaseline', 'hasGoodSleepStability', 'hasMoreEnergyGoal'],
  };
  
  const relevantSignals = clusterSignalMapping[cluster];
  const activeSignalCount = relevantSignals.filter(s => signals[s]).length;
  
  // Get top 3 active signals for this persona (for debugging)
  const topSignals = relevantSignals.filter(s => signals[s]).slice(0, 3);
  console.log(`[Persona Detection] ${cluster}: confidence=${confidence}, activeSignals=${activeSignalCount}, topSignals=${topSignals.join(', ')}, scores=${JSON.stringify(scores)}`);
  
  if (confidenceLevel === "high") {
    return `Your responses show clear ${
      cluster === "pain_sleeper" ? "alignment and physical comfort" : 
      cluster === "stress_insomnia" ? "environmental sensitivity and wind-down" : 
      cluster === "recovery_sleeper" ? "recovery and restoration" : 
      "optimization and performance"
    } signals with strong consistency across ${activeSignalCount} key indicators.`;
  }
  
  if (confidenceLevel === "medium") {
    return `Your responses suggest ${
      cluster === "pain_sleeper" ? "alignment needs" : 
      cluster === "stress_insomnia" ? "environmental factors" : 
      cluster === "recovery_sleeper" ? "recovery focus" : 
      "optimization goals"
    } as your primary area, though some secondary patterns were also detected.`;
  }
  
  return `Your sleep profile shows mixed signals across multiple areas. Recommendations are balanced rather than heavily personalized to one focus, which can actually be helpful for addressing multiple factors.`;
}

/**
 * v8: Detect user persona using psychology-first approach
 * 
 * This function uses explicit signal detection and scoring rules
 * for clearer, more maintainable persona detection.
 * 
 * Returns enhanced persona with cluster, label, description, rationale, and recommended modules.
 */
export function detectPersona(quizAnswers: Record<string, any>, scores?: AssessmentScores): PersonaResult {
  // Step 1: Detect all signals from quiz answers
  const signals = detectSignals(quizAnswers);
  
  // Step 2: Calculate raw persona scores using explicit rules
  const personaScores = calculatePersonaScores(signals);
  
  // Step 3: Apply safeguards for dominant issues
  // If pain or environment is clearly dominant, cap optimizer/recovery
  const hasDominantPain = signals.hasHighPainSeverity || 
                          (scores?.alignment_risk_score ?? 0) >= 50;
  const hasDominantEnvIssues = (scores?.environment_score ?? 100) < 55;
  
  if (hasDominantPain) {
    personaScores.optimizer = Math.min(personaScores.optimizer, personaScores.pain_sleeper - 2);
    personaScores.recovery_sleeper = Math.min(personaScores.recovery_sleeper, personaScores.pain_sleeper - 2);
  }
  
  if (hasDominantEnvIssues && !hasDominantPain) {
    personaScores.optimizer = Math.min(personaScores.optimizer, personaScores.stress_insomnia - 2);
    personaScores.recovery_sleeper = Math.min(personaScores.recovery_sleeper, personaScores.stress_insomnia - 2);
  }
  
  // Ensure non-negative after safeguards
  personaScores.optimizer = Math.max(0, personaScores.optimizer);
  personaScores.recovery_sleeper = Math.max(0, personaScores.recovery_sleeper);
  
  // Step 4: Determine winner
  const allScores = [
    { cluster: "pain_sleeper" as PersonaCluster, score: personaScores.pain_sleeper },
    { cluster: "stress_insomnia" as PersonaCluster, score: personaScores.stress_insomnia },
    { cluster: "optimizer" as PersonaCluster, score: personaScores.optimizer },
    { cluster: "recovery_sleeper" as PersonaCluster, score: personaScores.recovery_sleeper },
  ].sort((a, b) => b.score - a.score);
  
  const winner = allScores[0];
  const runnerUp = allScores[1];
  const cluster = winner.cluster;
  
  // Step 5: Calculate confidence (0-100)
  // Formula: (signal strength * 50) + (lead margin * 50)
  // Signal strength: how strong is the winner's score (normalized to 0-1, capped at 20 points)
  // Lead margin: how much the winner leads over runner-up (normalized, capped at 10 points)
  const signalStrength = Math.min(winner.score / 20, 1);
  const leadMargin = Math.min((winner.score - runnerUp.score) / 10, 1);
  const confidence = Math.round((signalStrength * 50) + (leadMargin * 50));
  
  // Step 6: Build rationale from signals
  const rationale = buildRationale(cluster, signals);
  
  // Step 7: Build confidence reasoning
  const confidence_reasoning = buildConfidenceReasoning(cluster, confidence, signals, personaScores);
  
  // Step 8: Get persona definition and add Sleep Hygiene module if needed
  const definition = PERSONA_DEFINITIONS[cluster];
  let recommended_modules = [...definition.recommended_modules];
  
  // Add Sleep Hygiene module (12) for stress_insomnia and optimizer/recovery when appropriate
  if (scores) {
    const stabilityModerate = scores.sleep_stability_score >= 40 && scores.sleep_stability_score <= 75;
    const envModerate = scores.environment_score >= 50 && scores.environment_score <= 80;
    
    if ((cluster === "stress_insomnia" || cluster === "optimizer" || cluster === "recovery_sleeper") && 
        (stabilityModerate || envModerate) && 
        !recommended_modules.includes(12)) {
      recommended_modules.push(12);
    }
  }
  
  return {
    guess: definition.legacyType,
    rationale,
    cluster,
    name: definition.name,
    label: definition.label,
    description: definition.description,
    recommended_modules,
    legacyType: definition.legacyType,
    confidence,
    confidence_reasoning,
  };
}

// ============ SCORE CALCULATION ============

/**
 * Calculate extended assessment scores from quiz answers
 * All calculations are deterministic and based on established sleep science principles.
 */
export function calculateAssessmentScores(quizAnswers: Record<string, any>): AssessmentScores {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const roomBrightness = quizAnswers.roomBrightness || "";
  const roomNoise = quizAnswers.roomNoise || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const pillowCount = quizAnswers.pillowCount || "";
  const mattressFirmness = quizAnswers.mattressFirmness || "";
  const sleepPosition = quizAnswers.sleepPosition || "";
  const sleepHours = quizAnswers.sleepHours || "";

  // Alignment Risk Score (higher = more risk)
  let alignmentRisk = 0;
  const painCount = painAreas.filter((p: string) => p !== "none" && p !== "no_pain").length;
  alignmentRisk += painCount * 10;
  alignmentRisk += Math.max(0, painSeverity - 3) * 8; // Pain severity above 3 adds risk
  alignmentRisk += Math.max(0, 10 - pillowSatisfaction) * 4;
  if (movesOften === "often") alignmentRisk += 12;
  if (movesOften === "always") alignmentRisk += 20;
  if (pillowCount === "2") alignmentRisk += 10;
  if (pillowCount === "3" || pillowCount === "3+") alignmentRisk += 18;
  // Position-specific risks
  if (sleepPosition === "stomach") alignmentRisk += 15;
  if (sleepPosition === "combination") alignmentRisk += 8;
  const alignment_risk_score = Math.min(100, Math.max(0, alignmentRisk));

  // Neck Support Score (100 = optimal support)
  let neckSupport = 100;
  if (painAreas.includes("neck")) neckSupport -= 25;
  if (painAreas.includes("shoulders")) neckSupport -= 12;
  if (painAreas.includes("upper_back")) neckSupport -= 8;
  neckSupport -= Math.max(0, 10 - pillowSatisfaction) * 5;
  neckSupport -= Math.max(0, painSeverity - 3) * 4;
  if (pillowCount === "2" || pillowCount === "3" || pillowCount === "3+") neckSupport -= 15;
  if (sleepPosition === "side" && mattressFirmness === "soft") neckSupport -= 12;
  if (sleepPosition === "stomach") neckSupport -= 10;
  const neck_support_score = Math.min(100, Math.max(0, neckSupport));

  // Sleep Stability Score (100 = highly stable)
  let stability = 100;
  if (sleepLatency === "slow") stability -= 12;
  if (sleepLatency === "very_slow") stability -= 25;
  if (nightAwakenings === "once") stability -= 8;
  if (nightAwakenings === "twice") stability -= 18;
  if (nightAwakenings === "frequently") stability -= 32;
  if (movesOften === "often") stability -= 12;
  if (movesOften === "always") stability -= 22;
  // Sleep duration affects stability
  if (sleepHours === "less_than_5" || sleepHours === "5_6") stability -= 15;
  const sleep_stability_score = Math.min(100, Math.max(0, stability));

  // Environment Score (100 = optimal environment)
  let environment = 100;
  if (roomBrightness === "bright") environment -= 22;
  if (roomBrightness === "dim") environment -= 10;
  if (roomNoise === "noisy") environment -= 18;
  if (roomNoise === "some") environment -= 8;
  if (sleepTemperature === "hot") environment -= 18;
  if (sleepTemperature === "cold") environment -= 10;
  const environment_score = Math.min(100, Math.max(0, environment));

  // Light Sensitivity Score (higher = more affected by light)
  let lightSensitivity = 15; // baseline
  if (roomBrightness === "bright") lightSensitivity = 85;
  else if (roomBrightness === "dim") lightSensitivity = 45;
  else if (roomBrightness === "dark") lightSensitivity = 15;
  // Night awakenings may indicate light sensitivity
  if (nightAwakenings === "frequently" && roomBrightness !== "dark") lightSensitivity += 10;
  const light_sensitivity_score = Math.min(100, lightSensitivity);

  // Temperature Disruption Score (higher = more disrupted)
  let tempDisruption = 15; // baseline
  if (sleepTemperature === "hot") tempDisruption = 78;
  else if (sleepTemperature === "cold") tempDisruption = 42;
  else tempDisruption = 15;
  // Movement may indicate temperature discomfort
  if (movesOften === "always" && sleepTemperature !== "comfortable") tempDisruption += 8;
  const temperature_disruption_score = Math.min(100, tempDisruption);

  return {
    alignment_risk_score,
    neck_support_score,
    sleep_stability_score,
    environment_score,
    light_sensitivity_score,
    temperature_disruption_score,
  };
}

// ============ SLEEP IDENTITY ============

/**
 * Generate sleep identity label and description
 * Uses calm, Scandinavian, scientific tone.
 */
export function generateSleepIdentity(quizAnswers: Record<string, any>, scores: AssessmentScores): SleepIdentity {
  const sleepPosition = quizAnswers.sleepPosition || "combination";
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const movesOften = quizAnswers.movesOften || "";
  const painSeverity = quizAnswers.painSeverity ?? 5;
  
  const positionMap: Record<string, "side" | "back" | "stomach" | "mixed"> = {
    "side": "side",
    "back": "back",
    "stomach": "stomach",
    "combination": "mixed"
  };
  const position = positionMap[sleepPosition] || "mixed";
  
  const positionLabel = position === "side" ? "Side sleeper" :
                        position === "back" ? "Back sleeper" :
                        position === "stomach" ? "Stomach sleeper" : "Combination sleeper";
  
  // Build modifier based on primary concern
  let modifier = "";
  if (painAreas.includes("neck") && (scores.neck_support_score < 65 || painSeverity >= 6)) {
    modifier = " with elevated neck tension";
  } else if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    modifier = " with lower body alignment focus";
  } else if (movesOften === "always") {
    modifier = " with restless movement patterns";
  } else if (movesOften === "often") {
    modifier = " with frequent position changes";
  } else if (scores.alignment_risk_score >= 45) {
    modifier = " with alignment optimization needs";
  } else if (scores.environment_score < 70) {
    modifier = " with environment optimization potential";
  }
  
  const label = `${positionLabel}${modifier}`;
  
  // Generate calm, scientific description
  let description = "";
  if (position === "side") {
    description = "Side sleeping is the most common position and offers natural benefits for spinal alignment. The key is ensuring proper support between your shoulder and neck to maintain neutral cervical positioning throughout the night.";
  } else if (position === "back") {
    description = "Back sleeping allows your spine to rest in its natural alignment when properly supported. Consistent cervical support helps maintain this position and can reduce morning tension.";
  } else if (position === "stomach") {
    description = "Stomach sleeping presents unique considerations for neck and lower back comfort. A lower-profile pillow and attention to spinal positioning can help reduce strain in this position.";
  } else {
    description = "As a combination sleeper, you naturally adjust positions throughout the night. Versatile support that adapts across positions helps maintain comfort without disrupting your sleep cycles.";
  }
  
  return { position, label, description };
}

// ============ ENVIRONMENT FINDINGS ============

/**
 * Generate environment findings from quiz answers
 * Identifies key issues with calm, actionable language.
 */
export function generateEnvironmentFindings(quizAnswers: Record<string, any>, scores: AssessmentScores): EnvironmentFindings {
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const roomNoise = quizAnswers.roomNoise || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  
  const keyIssues: string[] = [];
  
  // Light-related findings
  if (roomBrightness === "bright") {
    keyIssues.push("Light exposure may be affecting melatonin production and reducing time in deep sleep stages");
  } else if (roomBrightness === "dim") {
    keyIssues.push("Ambient light could be subtly affecting your sleep depth and natural circadian rhythm");
  }
  
  // Temperature findings
  if (sleepTemperature === "hot") {
    keyIssues.push("Elevated sleep temperature can fragment sleep cycles and reduce time in restorative REM sleep");
  } else if (sleepTemperature === "cold") {
    keyIssues.push("Cool sleep environment may be causing your body to work harder to maintain core temperature");
  }
  
  // Noise findings
  if (roomNoise === "noisy") {
    keyIssues.push("Environmental noise may be causing micro-awakenings that reduce overall sleep quality");
  }
  
  // Sleep pattern findings
  if (nightAwakenings === "frequently") {
    keyIssues.push("Frequent night awakenings are interrupting your natural sleep cycles");
  }
  
  if (movesOften === "always") {
    keyIssues.push("Restless movement may indicate your body is searching for a comfortable position");
  }
  
  if (sleepLatency === "very_slow") {
    keyIssues.push("Extended time to fall asleep may benefit from a consistent wind-down routine");
  }
  
  // Limit to top 3 most relevant issues
  const topIssues = keyIssues.slice(0, 3);
  
  // Generate summary based on overall environment score
  let summary = "";
  if (scores.environment_score >= 85) {
    summary = "Your sleep environment is well-optimized. Maintaining these conditions consistently will support your natural sleep patterns.";
  } else if (scores.environment_score >= 70) {
    summary = "Your sleep environment has a solid foundation with some areas for refinement. Small adjustments could meaningfully enhance your rest quality.";
  } else if (scores.environment_score >= 55) {
    summary = "Several environmental factors may be affecting your sleep quality. Addressing the factors above could lead to noticeable improvements in how rested you feel.";
  } else {
    summary = "Your sleep environment has significant optimization potential. Prioritizing environmental improvements could meaningfully enhance your sleep quality and daytime energy.";
  }
  
  return { keyIssues: topIssues, summary };
}

// ============ TOP RISK DRIVERS ============

/**
 * Identify top 3 risk drivers for segmentation
 */
function identifyTopRiskDrivers(quizAnswers: Record<string, any>, scores: AssessmentScores): string[] {
  const drivers: { factor: string; weight: number }[] = [];
  
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  
  // Alignment-related drivers
  if (painAreas.includes("neck") || painAreas.includes("shoulders")) {
    drivers.push({ factor: "neck_shoulder_tension", weight: 8 + (painSeverity > 5 ? 4 : 0) });
  }
  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    drivers.push({ factor: "lower_body_alignment", weight: 7 + (painSeverity > 5 ? 3 : 0) });
  }
  if (pillowSatisfaction <= 4) {
    drivers.push({ factor: "pillow_support_inadequate", weight: 6 });
  }
  
  // Environment-related drivers
  if (roomBrightness === "bright") {
    drivers.push({ factor: "light_exposure", weight: 7 });
  }
  if (sleepTemperature === "hot") {
    drivers.push({ factor: "temperature_too_warm", weight: 6 });
  }
  
  // Stability-related drivers
  if (nightAwakenings === "frequently") {
    drivers.push({ factor: "sleep_fragmentation", weight: 8 });
  } else if (nightAwakenings === "twice") {
    drivers.push({ factor: "sleep_fragmentation", weight: 5 });
  }
  if (sleepLatency === "very_slow") {
    drivers.push({ factor: "difficulty_falling_asleep", weight: 7 });
  }
  if (movesOften === "always") {
    drivers.push({ factor: "restless_movement", weight: 6 });
  }
  
  // Sort by weight and return top 3
  return drivers
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(d => d.factor);
}

// ============ PRODUCT RECOMMENDATIONS ============

/**
 * Generate product recommendations based on assessment
 */
export function generateProductRecommendations(
  quizAnswers: Record<string, any>,
  scores: AssessmentScores,
  persona: SleepPersona,
  personaCluster?: PersonaCluster
): ProductRecommendations {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const sleepPosition = quizAnswers.sleepPosition || "side";
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepGoals = quizAnswers.sleepGoals || [];
  const painSeverity = quizAnswers.painSeverity ?? 5;
  
  // Primary product is always the ergonomic pillow
  const primary_product: PrimaryProduct = "ergonomic_pillow";
  
  // Determine secondary product
  let secondary_product: SecondaryProduct | undefined;
  
  // Knee pillow for side sleepers with lower body issues
  if (sleepPosition === "side" && 
      (painAreas.includes("lower_back") || painAreas.includes("hips") || scores.alignment_risk_score >= 45)) {
    secondary_product = "knee_pillow";
  }
  // Silk mask for light sensitivity
  else if (roomBrightness === "bright" || roomBrightness === "dim" || scores.light_sensitivity_score >= 55) {
    secondary_product = "silk_mask";
  }
  // Knee pillow for side sleepers with pain
  else if (sleepPosition === "side" && painSeverity >= 5) {
    secondary_product = "knee_pillow";
  }
  
  // Determine recommended bundle
  let recommended_bundle: RecommendedBundle | undefined;
  let bundleConfidence = 0;
  
  // Alignment set for pain sleepers with lower body issues
  if (persona === "jason" && secondary_product === "knee_pillow") {
    recommended_bundle = "alignment_set";
    bundleConfidence = 85;
  }
  // Deep sleep set for environment-sensitive sleepers
  else if (persona === "mila" && secondary_product === "silk_mask") {
    recommended_bundle = "deep_sleep_set";
    bundleConfidence = 80;
  }
  // Performance set for optimizers with multiple goals
  else if (persona === "leo" && sleepGoals.length >= 2) {
    recommended_bundle = "performance_set";
    bundleConfidence = 80;
  }
  // Recovery sleeper gets performance_set by default unless alignment is critical
  else if (personaCluster === "recovery_sleeper") {
    if (scores.alignment_risk_score >= 50 && secondary_product === "knee_pillow") {
      recommended_bundle = "alignment_set";
      bundleConfidence = 75;
    } else {
      recommended_bundle = "performance_set";
      bundleConfidence = 75;
    }
  }
  
  // Calculate overall recommendation confidence
  let recommendation_confidence = 60; // baseline
  if (scores.alignment_risk_score >= 40) recommendation_confidence += 10;
  if (secondary_product) recommendation_confidence += 10;
  if (recommended_bundle) recommendation_confidence += bundleConfidence > 75 ? 15 : 10;
  if (painSeverity >= 6) recommendation_confidence += 5;
  recommendation_confidence = Math.min(95, recommendation_confidence);
  
  // Generate reasoning with calm, scientific tone
  let reasoning = "";
  if (recommended_bundle === "alignment_set") {
    reasoning = "Based on your alignment needs and sleep position, the Alignment Set provides comprehensive support from cervical spine through hip alignment, addressing the interconnected nature of spinal positioning during sleep.";
  } else if (recommended_bundle === "deep_sleep_set") {
    reasoning = "Your environment analysis indicates that light and proper support are key factors. The Deep Sleep Set combines ergonomic cervical support with complete light blocking to support uninterrupted sleep cycles.";
  } else if (recommended_bundle === "performance_set") {
    reasoning = "For optimizing your sleep quality, this complete set addresses multiple factors including support, alignment, and environment—creating conditions for maximum recovery and morning energy.";
  } else if (secondary_product === "knee_pillow") {
    reasoning = "The ergonomic pillow provides targeted cervical support, while the knee pillow helps maintain proper hip and lower back alignment—particularly beneficial for side sleepers.";
  } else if (secondary_product === "silk_mask") {
    reasoning = "The ergonomic pillow offers proper neck support, while the silk mask helps create complete darkness, supporting your body's natural melatonin production for deeper sleep.";
  } else {
    reasoning = "The ergonomic pillow is designed to support your specific sleep position and address the alignment needs identified in your assessment.";
  }
  
  // Generate persona-specific reasoning
  let persona_reasoning = "";
  if (persona === "jason") {
    persona_reasoning = "As a Pain Sleeper, your physical comfort and alignment are the primary focus. This setup directly addresses your tension points and supports healthier spinal positioning throughout the night.";
  } else if (persona === "mila") {
    persona_reasoning = "As a Stress & Environment Sleeper, controlling environmental factors is key to your sleep quality. This recommendation creates optimal conditions for uninterrupted rest.";
  } else if (personaCluster === "recovery_sleeper") {
    persona_reasoning = "As a Recovery Sleeper, optimizing deep sleep and temperature regulation are essential for physical restoration. This setup supports consistent recovery and morning readiness for active lifestyles.";
  } else {
    persona_reasoning = "As a Sleep Optimizer, you're looking to maximize recovery and performance. This setup provides the foundation for measurable improvements in your sleep quality.";
  }
  
  // Generate fit explanation
  let fit_explanation = "";
  const positionLabel = sleepPosition === "side" ? "side sleeper" :
                        sleepPosition === "back" ? "back sleeper" :
                        sleepPosition === "stomach" ? "stomach sleeper" : "combination sleeper";
  
  if (recommended_bundle) {
    fit_explanation = `As a ${positionLabel}${painAreas.length > 0 ? ` with ${painAreas[0].replace('_', ' ')} concerns` : ''}, this setup addresses your specific support needs while creating optimal conditions for restorative sleep.`;
  } else {
    fit_explanation = `Designed for ${positionLabel}s, this recommendation addresses the key factors identified in your assessment for improved sleep quality.`;
  }
  
  // Calculate product fit score based on alignment between recommendations and needs
  let product_fit_score = 50; // baseline
  if (scores.alignment_risk_score >= 40 && secondary_product === "knee_pillow") product_fit_score += 20;
  if (scores.light_sensitivity_score >= 60 && secondary_product === "silk_mask") product_fit_score += 20;
  if (recommended_bundle) product_fit_score += 15;
  if (painSeverity >= 5 && painAreas.length > 0) product_fit_score += 10;
  product_fit_score = Math.min(100, product_fit_score);
  
  const product_fit_reasoning = product_fit_score >= 80 
    ? "This setup strongly matches your identified sleep needs and has high potential to improve your rest quality."
    : product_fit_score >= 60 
    ? "This setup addresses your main sleep concerns and provides a solid foundation for improvement."
    : "This setup provides general sleep support. Further assessment may refine recommendations.";
  
  // Soft-limit upsells when confidence < 50 (neutral messaging)
  const confidence_weighted_recommendation = true; // Will be adjusted by persona confidence in caller
  
  return {
    primary_product,
    secondary_product,
    recommended_bundle,
    reasoning,
    recommendation_confidence,
    fit_explanation,
    persona_reasoning,
    product_fit_score,
    product_fit_reasoning,
    confidence_weighted_recommendation,
  };
}

// ============ COACH PREVIEW ============

/**
 * Generate sleep coach plan preview
 * Calm, actionable guidance for each phase.
 */
export function generateCoachPreview(
  quizAnswers: Record<string, any>,
  persona: SleepPersona,
  scores: AssessmentScores
): CoachPreview {
  const sleepGoals = quizAnswers.sleepGoals || [];
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  
  // Day 1-3: Setup and baseline
  let day_1_3 = "";
  if (persona === "jason") {
    day_1_3 = "Begin with proper pillow positioning for your sleep style. Gentle neck mobility exercises before bed can help release accumulated tension and prepare your body for rest.";
  } else if (persona === "mila") {
    day_1_3 = "Focus on optimizing your sleep environment—address light and temperature factors. Establish a consistent 20-minute wind-down routine to signal your body it's time for rest.";
  } else {
    day_1_3 = "Set up your sleep equipment and establish your baseline habits. Begin tracking your sleep quality to measure improvement over time.";
  }
  
  // Day 4-7: Adjustment and optimization
  let day_4_7 = "";
  if (scores.neck_support_score < 60) {
    day_4_7 = "Fine-tune your pillow positioning based on initial comfort. Your body is adapting to proper alignment—some adjustment period is normal as muscles recalibrate.";
  } else if (scores.sleep_stability_score < 60) {
    day_4_7 = "Focus on sleep timing consistency and refining your pre-bed routine. Begin identifying patterns in your sleep quality and what factors influence your rest.";
  } else if (scores.environment_score < 70) {
    day_4_7 = "Continue optimizing your sleep environment. Small adjustments to light, temperature, and your routine can compound into meaningful improvements.";
  } else {
    day_4_7 = "Build on your initial progress by layering complementary habits. Identify what's working well and refine your approach based on your experience.";
  }
  
  // Day 7-14: Consolidation
  let day_7_14 = "";
  if (sleepGoals.includes("reduce_pain") || painAreas.length > 0) {
    day_7_14 = "Evaluate your comfort and make any final positioning adjustments. By now, proper alignment should be noticeably reducing morning tension.";
  } else if (sleepGoals.includes("wake_refreshed")) {
    day_7_14 = "Consolidate your new sleep habits for sustained energy. Focus on maintaining your improved sleep quality with consistent routines.";
  } else if (sleepGoals.includes("fall_asleep_faster")) {
    day_7_14 = "Your body should be adapting to your new routine. Continue refining your wind-down process for faster, more reliable sleep onset.";
  } else {
    day_7_14 = "Review your progress and identify sustainable habits. Your AI coach will help maintain improvements and suggest optimizations as your sleep data develops.";
  }
  
  return { day_1_3, day_4_7, day_7_14 };
}

// ============ v9: ENERGY POTENTIAL SCORE ============

/**
 * Calculate Early Morning Energy Score
 * 
 * Derived from pain + environment + optimization readiness
 * Used for benefit-led copy ("More morning ease")
 * 
 * Higher score = more morning energy potential
 */
function calculateEnergyPotentialScore(scores: AssessmentScores): number {
  // Weights: pain/alignment (40%), environment (30%), stability/consistency (30%)
  const painComponent = (100 - scores.alignment_risk_score) * 0.4;
  const envComponent = scores.environment_score * 0.3;
  const stabilityComponent = scores.sleep_stability_score * 0.3;
  
  return Math.round(painComponent + envComponent + stabilityComponent);
}

/**
 * Calculate Module Relevance Scores
 * 
 * Weights each module based on persona and quiz signals
 * Used for personalized module ordering
 */
function calculateModuleRelevance(
  persona: PersonaResult,
  scores: AssessmentScores,
  quizAnswers: Record<string, any>
): ModuleRelevance[] {
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const painAreas = quizAnswers.painAreas || [];
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const roomBrightness = quizAnswers.roomBrightness || "";
  
  const relevanceScores: ModuleRelevance[] = [];
  
  for (const moduleId of persona.recommended_modules) {
    const moduleDef = MODULE_DEFINITIONS[moduleId];
    if (!moduleDef) continue;
    
    let relevance = 50; // Base relevance for recommended modules
    
    // Boost based on signals
    switch (moduleId) {
      case 4: // Alignment Fundamentals
        if (painAreas.includes("neck") || painAreas.includes("upper_back")) relevance += 25;
        if (painSeverity >= 5) relevance += 15;
        break;
      case 6: // Environment Optimization
        if (roomBrightness === "bright") relevance += 25;
        if (sleepTemperature === "hot" || sleepTemperature === "cold") relevance += 15;
        break;
      case 7: // Temperature Regulation
        if (sleepTemperature === "hot" || sleepTemperature === "cold") relevance += 30;
        break;
      case 8: // Deep Sleep Enhancement
        if (scores.sleep_stability_score < 60) relevance += 20;
        break;
      case 9: // Evening Routine Reset
        if (scores.light_sensitivity_score >= 50) relevance += 20;
        break;
      case 10: // Morning Mobility
        if (painAreas.length > 0) relevance += 20;
        break;
      case 11: // Hip & Lower Body
        if (painAreas.includes("hips") || painAreas.includes("lower_back")) relevance += 30;
        break;
      case 12: // Sleep Hygiene Foundations
        if (scores.sleep_stability_score < 70) relevance += 15;
        break;
    }
    
    relevanceScores.push({
      module_id: moduleId,
      relevance_score: Math.min(100, relevance),
      name: moduleDef.name,
      description: moduleDef.description,
    });
  }
  
  // Sort by relevance (descending)
  return relevanceScores.sort((a, b) => b.relevance_score - a.relevance_score);
}

// ============ MAIN BUILDER ============

/**
 * Build complete SleepAssessment from quiz answers
 * Returns structured assessment with all segmentation fields.
 */
export function buildSleepAssessment(quizAnswers: Record<string, any>): SleepAssessment {
  const scores = calculateAssessmentScores(quizAnswers);
  // v8: Pass scores to detectPersona for refined detection and module assignment
  const persona = detectPersona(quizAnswers, scores);
  const sleepIdentity = generateSleepIdentity(quizAnswers, scores);
  const environmentFindings = generateEnvironmentFindings(quizAnswers, scores);
  // Pass persona cluster for recovery_sleeper handling
  const productRecommendations = generateProductRecommendations(quizAnswers, scores, persona.guess, persona.cluster);
  const coachPreview = generateCoachPreview(quizAnswers, persona.guess, scores);
  
  // Calculate priority flags for Klaviyo segmentation
  const alignment_priority = scores.alignment_risk_score >= 45 || scores.neck_support_score < 65;
  const environment_priority = scores.environment_score < 70 || scores.light_sensitivity_score >= 55;
  
  // Identify top risk drivers
  const top_risk_drivers = identifyTopRiskDrivers(quizAnswers, scores);
  
  // v9: Calculate extended metrics
  const energy_potential_score = calculateEnergyPotentialScore(scores);
  const module_relevance = calculateModuleRelevance(persona, scores, quizAnswers);
  
  // v10: Calculate coach readiness score
  const coach_readiness = calculateCoachReadiness(quizAnswers, scores);
  
  // Adjust product recommendations based on persona confidence
  const adjustedProductRecommendations = {
    ...productRecommendations,
    confidence_weighted_recommendation: shouldPersonalizePersonaMessaging(persona.confidence),
  };
  
  return {
    sleepIdentity,
    scores,
    persona,
    environmentFindings,
    productRecommendations: adjustedProductRecommendations,
    coachPreview,
    alignment_priority,
    environment_priority,
    top_risk_drivers,
    energy_potential_score,
    module_relevance,
    coach_readiness_score: coach_readiness.score,
    coach_readiness_label: coach_readiness.label,
    coach_readiness_rationale: coach_readiness.rationale,
  };
}

// ============ v10: COACH READINESS CALCULATION ============

/**
 * Calculate Coach Readiness Score (0-100)
 * 
 * Based on:
 * - Sleep schedule consistency (from quiz signals)
 * - Environment stability  
 * - Pillow satisfaction
 * - Pain vs no pain baseline
 * - Number of awakenings
 * 
 * Higher score = more ready for coaching improvements
 */
function calculateCoachReadiness(quizAnswers: Record<string, any>, scores: AssessmentScores): {
  score: number;
  label: CoachReadinessLabel;
  rationale: string;
} {
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const painSeverity = quizAnswers.painSeverity ?? 5;
  
  let score = 50; // baseline
  
  // Environment stability component (better environment = more ready)
  score += Math.round(scores.environment_score * 0.2); // 0-20 points
  
  // Sleep stability component (more stable = more ready)
  score += Math.round(scores.sleep_stability_score * 0.15); // 0-15 points
  
  // Pillow satisfaction (higher satisfaction = ready to optimize further)
  if (pillowSatisfaction >= 7) score += 10;
  else if (pillowSatisfaction >= 5) score += 5;
  else score -= 5; // Low satisfaction = early stage
  
  // Pain baseline (no/low pain = ready for optimization; high pain = early stage)
  if (painAreas.length === 0 || painSeverity <= 2) score += 10;
  else if (painSeverity >= 6) score -= 15;
  else if (painSeverity >= 4) score -= 5;
  
  // Sleep latency (faster = more ready)
  if (sleepLatency === "quick" || sleepLatency === "normal") score += 5;
  else if (sleepLatency === "very_slow") score -= 10;
  
  // Night awakenings (fewer = more ready)
  if (nightAwakenings === "rarely" || nightAwakenings === "never") score += 10;
  else if (nightAwakenings === "frequently") score -= 10;
  
  // Clamp score to 0-100
  score = Math.min(100, Math.max(0, score));
  
  // Determine label
  const label = getCoachReadinessLabel(score);
  
  // Generate rationale
  let rationale = "";
  if (label === "Ready") {
    rationale = "Your sleep foundation is solid. You're well-positioned to see meaningful improvements from personalized coaching and optimization strategies.";
  } else if (label === "Developing") {
    rationale = "You have a moderate foundation for sleep improvement. Addressing current challenges will help unlock coaching benefits.";
  } else {
    rationale = "Your sleep patterns show significant optimization potential. Starting with foundational improvements will create the best path forward.";
  }
  
  return { score, label, rationale };
}
