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
 * v7: Added recovery_sleeper persona, refined optimizer detection,
 *     added Sleep Hygiene module (12)
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

// ============ PERSONA DETECTION ============

/**
 * Detect user persona based on quiz answers using weighted scoring
 * 
 * Pain Sleeper → High alignment risk + neck pain + physical discomfort indicators
 * Stress/Insomnia → Sleep instability + light/temperature issues + environment sensitivity
 * Optimizer → High motivation/engagement + performance goals + good baseline
 * Recovery Sleeper → Recovery/training focus + performance goals + good baseline (v7)
 * 
 * v7: Added recovery_sleeper detection, refined optimizer scoring to prevent
 *     misclassification when pain/environment issues are dominant.
 * 
 * Returns enhanced persona with cluster, label, description, rationale, and recommended modules.
 */
export function detectPersona(quizAnswers: Record<string, any>, scores?: AssessmentScores): PersonaResult {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const sleepGoals = quizAnswers.sleepGoals || [];
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const sleepLatency = quizAnswers.sleepLatency || "";
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const sleepEquipment = quizAnswers.sleepEquipment || [];
  
  // Calculate persona scores with refined weighting
  let painSleeperScore = 0;
  let stressInsomniaScore = 0;
  let optimizerScore = 0;
  let recoverySleeperScore = 0; // v7: New recovery persona
  
  // ===== PAIN SLEEPER INDICATORS (alignment/pain focused) =====
  // Primary pain signals
  if (painAreas.includes("neck")) painSleeperScore += 5;
  if (painAreas.includes("shoulders")) painSleeperScore += 4;
  if (painAreas.includes("upper_back")) painSleeperScore += 4;
  if (painAreas.includes("lower_back")) painSleeperScore += 5;
  if (painAreas.includes("hips")) painSleeperScore += 4;
  
  // Pain severity weighting
  if (painSeverity >= 7) painSleeperScore += 6;
  else if (painSeverity >= 5) painSleeperScore += 3;
  else if (painSeverity >= 3) painSleeperScore += 1;
  
  // Pillow dissatisfaction (key pain indicator)
  if (pillowSatisfaction <= 3) painSleeperScore += 4;
  else if (pillowSatisfaction <= 5) painSleeperScore += 2;
  
  // Pain-focused goals
  if (sleepGoals.includes("reduce_pain")) painSleeperScore += 5;
  if (sleepGoals.includes("better_posture")) painSleeperScore += 3;
  
  // Morning stiffness indicator (restless movement often = discomfort)
  if (movesOften === "always" && painAreas.length > 0) painSleeperScore += 3;
  
  // ===== STRESS / INSOMNIA INDICATORS (environment/stability focused) =====
  // Light sensitivity
  if (roomBrightness === "bright") stressInsomniaScore += 5;
  else if (roomBrightness === "dim") stressInsomniaScore += 3;
  
  // Temperature disruption
  if (sleepTemperature === "hot") stressInsomniaScore += 5;
  else if (sleepTemperature === "cold") stressInsomniaScore += 3;
  
  // Sleep fragmentation
  if (nightAwakenings === "frequently") stressInsomniaScore += 5;
  else if (nightAwakenings === "twice") stressInsomniaScore += 3;
  else if (nightAwakenings === "once") stressInsomniaScore += 1;
  
  // Restless movement (without pain = environment/stress cause)
  if (movesOften === "always" && painAreas.length === 0) stressInsomniaScore += 4;
  else if (movesOften === "often") stressInsomniaScore += 2;
  
  // Sleep onset difficulty
  if (sleepLatency === "very_slow") stressInsomniaScore += 4;
  else if (sleepLatency === "slow") stressInsomniaScore += 2;
  
  // Environment-focused goals
  if (sleepGoals.includes("stay_asleep")) stressInsomniaScore += 4;
  if (sleepGoals.includes("fall_asleep_faster")) stressInsomniaScore += 3;
  
  // ===== RECOVERY SLEEPER INDICATORS (v7: recovery/training focused) =====
  // Explicit recovery goals
  if (sleepGoals.includes("faster_recovery")) recoverySleeperScore += 6;
  if (sleepGoals.includes("better_recovery")) recoverySleeperScore += 6;
  if (sleepGoals.includes("muscle_repair")) recoverySleeperScore += 5;
  
  // Performance/energy goals (shared with optimizer but stronger for recovery)
  if (sleepGoals.includes("wake_refreshed")) recoverySleeperScore += 3;
  if (sleepGoals.includes("more_energy")) recoverySleeperScore += 4;
  
  // Device tracking indicates performance-focused user
  if (sleepEquipment.includes("oura") || sleepEquipment.includes("whoop")) {
    recoverySleeperScore += 4;
    optimizerScore += 2; // Also benefits optimizer
  }
  if (sleepEquipment.includes("fitness_tracker") || sleepEquipment.includes("smart_watch")) {
    recoverySleeperScore += 2;
    optimizerScore += 1;
  }
  
  // Multiple performance goals = recovery focus
  const performanceGoals = sleepGoals.filter((g: string) => 
    ['faster_recovery', 'better_recovery', 'muscle_repair', 'wake_refreshed', 'more_energy'].includes(g)
  );
  if (performanceGoals.length >= 2) recoverySleeperScore += 3;
  
  // Low pain baseline benefits recovery persona
  if (painSeverity <= 3 && painAreas.length === 0) recoverySleeperScore += 2;
  
  // ===== OPTIMIZER INDICATORS (performance/motivation focused) =====
  // Performance-driven goals
  if (sleepGoals.includes("wake_refreshed")) optimizerScore += 4;
  if (sleepGoals.includes("better_quality")) optimizerScore += 4;
  if (sleepGoals.includes("more_energy")) optimizerScore += 3;
  
  // Already doing okay, seeking optimization
  if (pillowSatisfaction >= 7) optimizerScore += 3;
  if (sleepLatency === "quick" || sleepLatency === "normal") optimizerScore += 2;
  
  // Multiple goals = motivated optimizer
  if (sleepGoals.length >= 3) optimizerScore += 3;
  if (sleepGoals.length >= 4) optimizerScore += 2;
  
  // Low pain baseline = optimizer focus
  if (painSeverity <= 2 && painAreas.length === 0) optimizerScore += 3;
  else if (painSeverity <= 3) optimizerScore += 1;
  
  // Good sleep stability = room for optimization
  if (nightAwakenings === "rarely" || nightAwakenings === "never") optimizerScore += 2;
  
  // ===== v7: REFINED PERSONA SELECTION WITH SAFEGUARDS =====
  // Prevent optimizer/recovery from winning when pain or environment is clearly dominant
  
  const hasDominantPain = painSeverity >= 6 || (scores?.alignment_risk_score ?? 0) >= 50;
  const hasDominantEnvIssues = (scores?.environment_score ?? 100) < 55;
  
  // Cap optimizer and recovery scores if pain/environment issues are dominant
  if (hasDominantPain) {
    optimizerScore = Math.min(optimizerScore, painSleeperScore - 2);
    recoverySleeperScore = Math.min(recoverySleeperScore, painSleeperScore - 2);
  }
  
  if (hasDominantEnvIssues && !hasDominantPain) {
    optimizerScore = Math.min(optimizerScore, stressInsomniaScore - 2);
    recoverySleeperScore = Math.min(recoverySleeperScore, stressInsomniaScore - 2);
  }
  
  // Determine winner with calm, scientific rationale
  let cluster: PersonaCluster;
  let rationale: string;
  
  // v9: Calculate persona confidence based on signal strength
  const maxScore = Math.max(painSleeperScore, stressInsomniaScore, optimizerScore, recoverySleeperScore);
  const allScores = [painSleeperScore, stressInsomniaScore, optimizerScore, recoverySleeperScore].sort((a, b) => b - a);
  const secondScore = allScores[1] || 0;
  
  // Confidence = how much the winner leads + signal strength
  // Higher lead over second place = higher confidence
  // More total signals = higher confidence (capped)
  const leadMargin = maxScore - secondScore;
  const signalStrength = Math.min(maxScore / 15, 1); // Normalize to 0-1, cap at 15 points
  const leadConfidence = Math.min(leadMargin / 8, 1); // Normalize lead margin
  const confidence = Math.round((signalStrength * 50 + leadConfidence * 50)); // 0-100
  
  // Use clear decision logic with tie-breaking
  
  if (painSleeperScore === maxScore && painSleeperScore > 0) {
    cluster = "pain_sleeper";
    
    // Build specific rationale based on signals
    const painDetails: string[] = [];
    if (painAreas.includes("neck")) painDetails.push("neck tension");
    if (painAreas.includes("lower_back")) painDetails.push("lower back discomfort");
    if (painAreas.includes("shoulders")) painDetails.push("shoulder stiffness");
    if (painAreas.includes("hips")) painDetails.push("hip alignment concerns");
    
    const painFocus = painDetails.length > 0 
      ? painDetails.slice(0, 2).join(" and ") 
      : "physical comfort";
    
    rationale = `Your responses indicate that ${painFocus} ${painDetails.length > 1 ? 'are' : 'is'} your primary area for improvement. Addressing cervical and spinal support can meaningfully reduce morning tension and enhance your overall sleep comfort.`;
    
  } else if (stressInsomniaScore === maxScore && stressInsomniaScore > 0) {
    cluster = "stress_insomnia";
    
    // Build specific rationale based on signals
    const envDetails: string[] = [];
    if (roomBrightness === "bright" || roomBrightness === "dim") envDetails.push("light exposure");
    if (sleepTemperature === "hot" || sleepTemperature === "cold") envDetails.push("temperature regulation");
    if (nightAwakenings === "frequently" || nightAwakenings === "twice") envDetails.push("sleep continuity");
    if (sleepLatency === "very_slow" || sleepLatency === "slow") envDetails.push("sleep onset");
    
    const envFocus = envDetails.length > 0 
      ? envDetails.slice(0, 2).join(" and ") 
      : "environmental factors";
    
    rationale = `Your sleep patterns suggest that ${envFocus} ${envDetails.length > 1 ? 'are' : 'is'} influencing your rest quality. Optimizing your sleep environment and establishing calming routines can strengthen your natural sleep cycles.`;
    
  } else if (recoverySleeperScore === maxScore && recoverySleeperScore > 0) {
    // v7: Recovery sleeper wins
    cluster = "recovery_sleeper";
    
    // Build specific rationale for recovery focus
    const recoveryDetails: string[] = [];
    if (sleepGoals.includes("faster_recovery") || sleepGoals.includes("better_recovery")) {
      recoveryDetails.push("physical recovery");
    }
    if (sleepGoals.includes("wake_refreshed")) recoveryDetails.push("morning readiness");
    if (sleepGoals.includes("more_energy")) recoveryDetails.push("sustained energy");
    if (sleepEquipment.includes("oura") || sleepEquipment.includes("whoop") || sleepEquipment.includes("fitness_tracker")) {
      recoveryDetails.push("performance tracking");
    }
    
    const recoveryFocus = recoveryDetails.length > 0 
      ? recoveryDetails.slice(0, 2).join(" and ") 
      : "physical restoration and recovery";
    
    // v7: Acknowledge good foundation while focusing on recovery
    const foundationNote = hasDominantPain || hasDominantEnvIssues 
      ? ""
      : " You already have a relatively stable sleep foundation. ";
    
    rationale = `Your focus on ${recoveryFocus} indicates a recovery-oriented approach to sleep.${foundationNote}Optimizing deep sleep phases and temperature regulation can enhance your body's natural restoration processes.`;
    
  } else {
    cluster = "optimizer";
    
    // Build specific rationale based on goals
    const goalDetails: string[] = [];
    if (sleepGoals.includes("wake_refreshed")) goalDetails.push("morning energy");
    if (sleepGoals.includes("better_quality")) goalDetails.push("deeper sleep");
    if (sleepGoals.includes("more_energy")) goalDetails.push("daytime performance");
    
    const goalFocus = goalDetails.length > 0 
      ? goalDetails.slice(0, 2).join(" and ") 
      : "sleep quality and recovery";
    
    // v7: Acknowledge any minor issues while focusing on optimization
    const foundationNote = hasDominantPain || hasDominantEnvIssues 
      ? " While some areas may benefit from attention, "
      : " With a solid sleep foundation, ";
    
    rationale = `You're focused on enhancing ${goalFocus}.${foundationNote}targeted improvements to your setup and consistent habits can maximize your body's natural recovery processes.`;
  }
  
  // Get persona definition and potentially add sleep hygiene module (v7)
  const definition = PERSONA_DEFINITIONS[cluster];
  let recommended_modules = [...definition.recommended_modules];
  
  // v7: Add Sleep Hygiene module (12) for stress_insomnia and optimizer/recovery when 
  // sleep stability is moderate (not severe, not excellent)
  if (scores) {
    const stabilityModerate = scores.sleep_stability_score >= 40 && scores.sleep_stability_score <= 75;
    const envModerate = scores.environment_score >= 50 && scores.environment_score <= 80;
    
    if ((cluster === "stress_insomnia" || cluster === "optimizer" || cluster === "recovery_sleeper") && 
        (stabilityModerate || envModerate) && 
        !recommended_modules.includes(12)) {
      recommended_modules.push(12);
    }
  }
  
  // v10: Generate confidence reasoning
  const confidenceLevel = getPersonaConfidenceLevel(confidence);
  let confidence_reasoning = "";
  if (confidenceLevel === "high") {
    confidence_reasoning = `Your responses show clear ${cluster === "pain_sleeper" ? "alignment and comfort" : cluster === "stress_insomnia" ? "environmental sensitivity" : cluster === "recovery_sleeper" ? "recovery-focused" : "optimization"} signals with strong consistency across multiple indicators.`;
  } else if (confidenceLevel === "medium") {
    confidence_reasoning = `Your responses suggest ${cluster === "pain_sleeper" ? "alignment needs" : cluster === "stress_insomnia" ? "environmental factors" : cluster === "recovery_sleeper" ? "recovery focus" : "optimization goals"} as primary, though some secondary patterns were also detected.`;
  } else {
    confidence_reasoning = `Your sleep profile shows mixed signals. Recommendations are balanced across multiple areas rather than heavily personalized to one focus.`;
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
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  
  // Pain-related drivers
  if (painAreas.includes("neck")) drivers.push({ factor: "neck_pain", weight: painSeverity });
  if (painAreas.includes("shoulders")) drivers.push({ factor: "shoulder_tension", weight: painSeverity * 0.8 });
  if (painAreas.includes("lower_back")) drivers.push({ factor: "lower_back_pain", weight: painSeverity * 0.9 });
  if (painAreas.includes("hips")) drivers.push({ factor: "hip_alignment", weight: painSeverity * 0.85 });
  
  // Environment drivers
  if (scores.light_sensitivity_score >= 60) drivers.push({ factor: "light_exposure", weight: scores.light_sensitivity_score / 15 });
  if (scores.temperature_disruption_score >= 60) drivers.push({ factor: "temperature_discomfort", weight: scores.temperature_disruption_score / 15 });
  
  // Stability drivers
  if (nightAwakenings === "frequently") drivers.push({ factor: "sleep_fragmentation", weight: 7 });
  if (nightAwakenings === "twice") drivers.push({ factor: "sleep_fragmentation", weight: 5 });
  if (movesOften === "always") drivers.push({ factor: "restless_movement", weight: 6 });
  
  // Support drivers
  if (pillowSatisfaction <= 4) drivers.push({ factor: "inadequate_pillow_support", weight: (10 - pillowSatisfaction) });
  
  // Sort by weight and return top 3
  return drivers
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(d => d.factor);
}

// ============ PRODUCT RECOMMENDATIONS ============

/**
 * Generate structured product recommendations
 * Uses explicit, deterministic logic matching Shopify handles.
 * v7: Added recovery_sleeper persona handling with performance_set bundle preference.
 */
export function generateProductRecommendations(
  quizAnswers: Record<string, any>,
  scores: AssessmentScores,
  persona: SleepPersona,
  personaCluster?: PersonaCluster
): ProductRecommendations {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepPosition = quizAnswers.sleepPosition || "";
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const sleepGoals = quizAnswers.sleepGoals || [];
  
  // Primary is always the ergonomic pillow
  const primary_product: PrimaryProduct = "ergonomic_pillow";
  
  // Determine secondary product with explicit logic
  let secondary_product: SecondaryProduct | undefined;
  let secondaryScore = 0;
  
  // Knee pillow scoring
  let kneePillowScore = 0;
  if (painAreas.includes("lower_back")) kneePillowScore += 4;
  if (painAreas.includes("hips")) kneePillowScore += 4;
  if (sleepPosition === "side") kneePillowScore += 3;
  if (painSeverity >= 6 && (painAreas.includes("lower_back") || painAreas.includes("hips"))) kneePillowScore += 2;
  
  // Silk mask scoring
  let silkMaskScore = 0;
  if (roomBrightness === "bright") silkMaskScore += 5;
  if (roomBrightness === "dim") silkMaskScore += 3;
  if (scores.light_sensitivity_score >= 60) silkMaskScore += 2;
  if (sleepGoals.includes("stay_asleep")) silkMaskScore += 1;
  
  // Determine winner
  if (kneePillowScore >= silkMaskScore && kneePillowScore >= 3) {
    secondary_product = "knee_pillow";
    secondaryScore = kneePillowScore;
  } else if (silkMaskScore >= 3) {
    secondary_product = "silk_mask";
    secondaryScore = silkMaskScore;
  }
  
  // Determine bundle with explicit logic
  let recommended_bundle: RecommendedBundle | undefined;
  let bundleConfidence = 0;
  
  // Alignment Set: Jason persona OR high alignment risk with knee pillow need
  if (persona === "jason" && secondary_product === "knee_pillow") {
    recommended_bundle = "alignment_set";
    bundleConfidence = 85;
  } else if (scores.alignment_risk_score >= 50 && secondary_product === "knee_pillow") {
    recommended_bundle = "alignment_set";
    bundleConfidence = 75;
  }
  // Deep Sleep Set: Mila persona OR high light sensitivity
  else if (persona === "mila" && (secondary_product === "silk_mask" || scores.light_sensitivity_score >= 60)) {
    recommended_bundle = "deep_sleep_set";
    bundleConfidence = 85;
  } else if (scores.light_sensitivity_score >= 70 && scores.environment_score < 65) {
    recommended_bundle = "deep_sleep_set";
    bundleConfidence = 70;
  }
  // Performance Set: Leo persona (optimizer or recovery_sleeper) with multiple optimization goals
  else if (persona === "leo" && sleepGoals.length >= 2) {
    recommended_bundle = "performance_set";
    bundleConfidence = 80;
  }
  // v7: Recovery sleeper gets performance_set by default unless alignment is critical
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
  
  // Generate persona-specific reasoning (v7: added recovery_sleeper)
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
  
  // v10: Calculate product fit score based on alignment between recommendations and needs
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
  
  // v10: Soft-limit upsells when confidence < 50 (neutral messaging)
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
  // v7: Pass scores to detectPersona for refined detection and module assignment
  const persona = detectPersona(quizAnswers, scores);
  const sleepIdentity = generateSleepIdentity(quizAnswers, scores);
  const environmentFindings = generateEnvironmentFindings(quizAnswers, scores);
  // v7: Pass persona cluster for recovery_sleeper handling
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
  
  // v10: Adjust product recommendations based on persona confidence
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
