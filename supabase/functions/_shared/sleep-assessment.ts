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
 */

// ============ TYPES ============

export type SleepPersona = "jason" | "mila" | "leo";

export interface SleepIdentity {
  position: "side" | "back" | "stomach" | "mixed";
  label: string;
  description: string;
}

export interface AssessmentScores {
  alignment_risk_score: number;      // 0–100, higher = more risk
  neck_support_score: number;        // 0–100, higher = better support
  sleep_stability_score: number;     // 0–100, higher = more stable
  environment_score: number;         // 0–100, higher = better environment
  light_sensitivity_score: number;   // 0–100, higher = more affected by light
  temperature_disruption_score: number; // 0–100, higher = more disrupted by temp
}

export interface PersonaResult {
  guess: SleepPersona;
  rationale: string;
}

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
  // NEW: Segmentation fields for Klaviyo
  alignment_priority: boolean;
  environment_priority: boolean;
  top_risk_drivers: string[]; // Top 3 risk factors
}

// ============ PERSONA DETECTION ============

/**
 * Detect user persona based on quiz answers (pure function)
 * 
 * Jason → High alignment risk + neck pain + desk work indicators
 * Mila → Sleep instability + light/temperature issues  
 * Leo → High motivation/engagement + performance goals
 * 
 * Returns persona with calm, scientific rationale.
 */
export function detectPersona(quizAnswers: Record<string, any>): PersonaResult {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const sleepGoals = quizAnswers.sleepGoals || [];
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const sleepLatency = quizAnswers.sleepLatency || "";
  const painSeverity = quizAnswers.painSeverity ?? 5;
  
  // Calculate persona scores with refined weighting
  let jasonScore = 0;
  let milaScore = 0;
  let leoScore = 0;
  
  // Jason indicators: alignment/pain focused
  if (painAreas.includes("neck")) jasonScore += 4;
  if (painAreas.includes("shoulders")) jasonScore += 3;
  if (painAreas.includes("upper_back")) jasonScore += 3;
  if (painSeverity >= 6) jasonScore += 3;
  if (pillowSatisfaction <= 3) jasonScore += 3;
  if (pillowSatisfaction <= 5 && pillowSatisfaction > 3) jasonScore += 1;
  if (sleepGoals.includes("reduce_pain")) jasonScore += 3;
  if (sleepGoals.includes("better_posture")) jasonScore += 2;
  
  // Mila indicators: environment/stability focused
  if (roomBrightness === "bright") milaScore += 4;
  if (roomBrightness === "dim") milaScore += 2;
  if (sleepTemperature === "hot") milaScore += 4;
  if (sleepTemperature === "cold") milaScore += 2;
  if (nightAwakenings === "frequently") milaScore += 3;
  if (nightAwakenings === "twice") milaScore += 2;
  if (movesOften === "always") milaScore += 3;
  if (movesOften === "often") milaScore += 2;
  if (sleepGoals.includes("stay_asleep")) milaScore += 3;
  
  // Leo indicators: performance/motivation focused
  if (sleepGoals.includes("wake_refreshed")) leoScore += 3;
  if (sleepGoals.includes("better_quality")) leoScore += 3;
  if (sleepGoals.includes("fall_asleep_faster")) leoScore += 2;
  if (sleepLatency === "quick" || sleepLatency === "normal") leoScore += 2;
  if (sleepGoals.length >= 3) leoScore += 2;
  if (pillowSatisfaction >= 7) leoScore += 1; // Already doing okay, wants optimization
  
  // Determine winner with calm, scientific rationale
  if (jasonScore >= milaScore && jasonScore >= leoScore) {
    return {
      guess: "jason",
      rationale: "Your responses suggest that spinal alignment and neck support are your primary areas for improvement. Research shows that proper cervical positioning during sleep can meaningfully reduce morning tension and discomfort."
    };
  }
  
  if (milaScore >= jasonScore && milaScore >= leoScore) {
    return {
      guess: "mila",
      rationale: "Your sleep environment appears to be affecting your rest quality. Factors like light exposure, room temperature, and movement during sleep can fragment sleep cycles and reduce restorative deep sleep."
    };
  }
  
  return {
    guess: "leo",
    rationale: "You're focused on optimizing your sleep for energy and performance. With the right sleep setup and consistent habits, you can maximize your body's natural recovery processes and wake feeling more refreshed."
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
 */
export function generateProductRecommendations(
  quizAnswers: Record<string, any>,
  scores: AssessmentScores,
  persona: SleepPersona
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
  // Performance Set: Leo persona with multiple optimization goals
  else if (persona === "leo" && sleepGoals.length >= 2) {
    recommended_bundle = "performance_set";
    bundleConfidence = 80;
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
  
  return {
    primary_product,
    secondary_product,
    recommended_bundle,
    reasoning,
    recommendation_confidence,
    fit_explanation,
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

// ============ MAIN BUILDER ============

/**
 * Build complete SleepAssessment from quiz answers
 * Returns structured assessment with all segmentation fields.
 */
export function buildSleepAssessment(quizAnswers: Record<string, any>): SleepAssessment {
  const scores = calculateAssessmentScores(quizAnswers);
  const persona = detectPersona(quizAnswers);
  const sleepIdentity = generateSleepIdentity(quizAnswers, scores);
  const environmentFindings = generateEnvironmentFindings(quizAnswers, scores);
  const productRecommendations = generateProductRecommendations(quizAnswers, scores, persona.guess);
  const coachPreview = generateCoachPreview(quizAnswers, persona.guess, scores);
  
  // Calculate priority flags for Klaviyo segmentation
  const alignment_priority = scores.alignment_risk_score >= 45 || scores.neck_support_score < 65;
  const environment_priority = scores.environment_score < 70 || scores.light_sensitivity_score >= 55;
  
  // Identify top risk drivers
  const top_risk_drivers = identifyTopRiskDrivers(quizAnswers, scores);
  
  return {
    sleepIdentity,
    scores,
    persona,
    environmentFindings,
    productRecommendations,
    coachPreview,
    alignment_priority,
    environment_priority,
    top_risk_drivers,
  };
}
