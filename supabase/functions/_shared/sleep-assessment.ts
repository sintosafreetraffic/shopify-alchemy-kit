/**
 * Sleep Assessment Types and Logic
 * 
 * Structured assessment types and deterministic persona/scoring logic
 * for the upgraded Sleep Quiz experience.
 */

// ============ TYPES ============

export type SleepPersona = "jason" | "mila" | "leo";

export interface SleepIdentity {
  position: "side" | "back" | "stomach" | "mixed";
  label: string;
  description: string;
}

export interface AssessmentScores {
  alignment_risk_score: number;
  neck_support_score: number;
  sleep_stability_score: number;
  environment_score: number;
  light_sensitivity_score: number;
  temperature_disruption_score: number;
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
}

// ============ PERSONA DETECTION ============

/**
 * Detect user persona based on quiz answers (pure function)
 * 
 * Jason → High alignment risk + neck pain + desk work indicators
 * Mila → Sleep instability + light/temperature issues
 * Leo → High motivation/engagement + performance goals
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
  
  // Calculate persona scores
  let jasonScore = 0;
  let milaScore = 0;
  let leoScore = 0;
  
  // Jason indicators: alignment/pain focused
  if (painAreas.includes("neck")) jasonScore += 3;
  if (painAreas.includes("shoulders")) jasonScore += 2;
  if (painAreas.includes("upper_back")) jasonScore += 2;
  if (pillowSatisfaction <= 4) jasonScore += 2;
  if (sleepGoals.includes("reduce_pain")) jasonScore += 2;
  if (sleepGoals.includes("better_posture")) jasonScore += 2;
  
  // Mila indicators: environment/stability focused
  if (roomBrightness === "bright" || roomBrightness === "dim") milaScore += 3;
  if (sleepTemperature === "hot") milaScore += 3;
  if (nightAwakenings === "twice" || nightAwakenings === "frequently") milaScore += 2;
  if (movesOften === "often" || movesOften === "always") milaScore += 2;
  if (sleepGoals.includes("stay_asleep")) milaScore += 2;
  
  // Leo indicators: performance/motivation focused
  if (sleepGoals.includes("wake_refreshed")) leoScore += 2;
  if (sleepGoals.includes("better_quality")) leoScore += 2;
  if (sleepGoals.includes("fall_asleep_faster")) leoScore += 2;
  if (sleepLatency === "quick" || sleepLatency === "normal") leoScore += 1;
  if (sleepGoals.length >= 3) leoScore += 1;
  
  // Determine winner
  if (jasonScore >= milaScore && jasonScore >= leoScore) {
    return {
      guess: "jason",
      rationale: "Your responses indicate alignment and neck support are primary concerns. Like many who spend time at desks or have specific posture needs, optimizing spinal alignment during sleep would have the greatest impact."
    };
  }
  
  if (milaScore >= jasonScore && milaScore >= leoScore) {
    return {
      guess: "mila",
      rationale: "Your sleep environment appears to be disrupting your rest. Light, temperature, or frequent awakenings are fragmenting your sleep cycles. Addressing these environmental factors will improve your sleep quality."
    };
  }
  
  return {
    guess: "leo",
    rationale: "You're focused on optimizing your sleep for better performance and energy. With your motivation to improve, the right sleep setup will help you wake refreshed and maintain consistent energy levels."
  };
}

// ============ SCORE CALCULATION ============

/**
 * Calculate extended assessment scores from quiz answers
 */
export function calculateAssessmentScores(quizAnswers: Record<string, any>): AssessmentScores {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const roomBrightness = quizAnswers.roomBrightness || "";
  const roomNoise = quizAnswers.roomNoise || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  const pillowCount = quizAnswers.pillowCount || "";
  const mattressFirmness = quizAnswers.mattressFirmness || "";
  const sleepPosition = quizAnswers.sleepPosition || "";

  // Alignment Risk Score (higher = more risk, inverted for display)
  let alignmentRisk = 0;
  alignmentRisk += painAreas.filter((p: string) => p !== "none").length * 12;
  alignmentRisk += (10 - pillowSatisfaction) * 5;
  if (movesOften === "often") alignmentRisk += 15;
  if (movesOften === "always") alignmentRisk += 25;
  if (pillowCount === "2" || pillowCount === "3") alignmentRisk += 15;
  const alignment_risk_score = Math.min(100, Math.max(0, alignmentRisk));

  // Neck Support Score (100 = perfect support)
  let neckSupport = 100;
  if (painAreas.includes("neck")) neckSupport -= 30;
  if (painAreas.includes("shoulders")) neckSupport -= 15;
  neckSupport -= (10 - pillowSatisfaction) * 6;
  if (pillowCount === "2" || pillowCount === "3") neckSupport -= 20;
  if (sleepPosition === "side" && mattressFirmness === "soft") neckSupport -= 15;
  const neck_support_score = Math.min(100, Math.max(0, neckSupport));

  // Sleep Stability Score
  let stability = 100;
  if (sleepLatency === "slow") stability -= 15;
  if (sleepLatency === "very_slow") stability -= 30;
  if (nightAwakenings === "twice") stability -= 20;
  if (nightAwakenings === "frequently") stability -= 35;
  if (movesOften === "often") stability -= 15;
  if (movesOften === "always") stability -= 25;
  const sleep_stability_score = Math.min(100, Math.max(0, stability));

  // Environment Score (general)
  let environment = 100;
  if (roomBrightness === "bright") environment -= 25;
  if (roomBrightness === "dim") environment -= 10;
  if (roomNoise === "noisy") environment -= 20;
  if (roomNoise === "some") environment -= 8;
  if (sleepTemperature === "hot") environment -= 20;
  if (sleepTemperature === "cold") environment -= 10;
  const environment_score = Math.min(100, Math.max(0, environment));

  // Light Sensitivity Score (higher = more sensitive/affected)
  let lightSensitivity = 0;
  if (roomBrightness === "bright") lightSensitivity = 80;
  else if (roomBrightness === "dim") lightSensitivity = 40;
  else lightSensitivity = 10;
  const light_sensitivity_score = lightSensitivity;

  // Temperature Disruption Score (higher = more disrupted)
  let tempDisruption = 0;
  if (sleepTemperature === "hot") tempDisruption = 75;
  else if (sleepTemperature === "cold") tempDisruption = 40;
  else tempDisruption = 10;
  const temperature_disruption_score = tempDisruption;

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
 */
export function generateSleepIdentity(quizAnswers: Record<string, any>, scores: AssessmentScores): SleepIdentity {
  const sleepPosition = quizAnswers.sleepPosition || "combination";
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const movesOften = quizAnswers.movesOften || "";
  
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
  
  // Build modifier based on issues
  let modifier = "";
  if (painAreas.includes("neck") && scores.neck_support_score < 70) {
    modifier = " with elevated neck tension";
  } else if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    modifier = " with lower body alignment needs";
  } else if (movesOften === "often" || movesOften === "always") {
    modifier = " with restless movement patterns";
  } else if (scores.alignment_risk_score > 50) {
    modifier = " with moderate alignment concerns";
  }
  
  const label = `${positionLabel}${modifier}`;
  
  // Generate calm, scientific description
  let description = "";
  if (position === "side") {
    description = "Your side sleeping position requires specific neck-to-shoulder support to maintain neutral spinal alignment. The gap between your shoulder and neck needs to be properly filled to prevent strain.";
  } else if (position === "back") {
    description = "Back sleeping allows for natural spinal alignment when properly supported. Your cervical curve needs consistent support throughout the night to prevent neck tension.";
  } else if (position === "stomach") {
    description = "Stomach sleeping places unique demands on your neck and lower back. A lower-profile pillow helps reduce cervical rotation and lumbar strain.";
  } else {
    description = "As a combination sleeper, you need versatile support that adapts to multiple positions. Consistent comfort across positions is key to uninterrupted sleep.";
  }
  
  return { position, label, description };
}

// ============ ENVIRONMENT FINDINGS ============

/**
 * Generate environment findings from quiz answers
 */
export function generateEnvironmentFindings(quizAnswers: Record<string, any>, scores: AssessmentScores): EnvironmentFindings {
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const roomNoise = quizAnswers.roomNoise || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";
  
  const keyIssues: string[] = [];
  
  if (roomBrightness === "bright") {
    keyIssues.push("Light exposure may be reducing deep sleep and suppressing melatonin production");
  } else if (roomBrightness === "dim") {
    keyIssues.push("Ambient light may be slightly affecting your sleep depth");
  }
  
  if (sleepTemperature === "hot") {
    keyIssues.push("Elevated sleep temperature is likely fragmenting your sleep cycles");
  }
  
  if (roomNoise === "noisy") {
    keyIssues.push("Environmental noise may be causing micro-awakenings throughout the night");
  }
  
  if (nightAwakenings === "frequently") {
    keyIssues.push("Frequent awakenings are preventing complete sleep cycles");
  }
  
  if (movesOften === "always") {
    keyIssues.push("Restless movement suggests your body is searching for a comfortable position");
  }
  
  // Limit to top 3 issues
  const topIssues = keyIssues.slice(0, 3);
  
  // Generate summary
  let summary = "";
  if (scores.environment_score >= 80) {
    summary = "Your sleep environment is well-optimized. Focus on maintaining these conditions consistently for best results.";
  } else if (scores.environment_score >= 60) {
    summary = "Your sleep environment has some areas for improvement. Addressing the factors above could meaningfully enhance your sleep quality.";
  } else {
    summary = "Several environmental factors are likely affecting your sleep quality. Prioritizing these improvements could lead to significant gains in restfulness.";
  }
  
  return { keyIssues: topIssues, summary };
}

// ============ PRODUCT RECOMMENDATIONS ============

/**
 * Generate structured product recommendations
 */
export function generateProductRecommendations(
  quizAnswers: Record<string, any>,
  scores: AssessmentScores,
  persona: SleepPersona
): ProductRecommendations {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepPosition = quizAnswers.sleepPosition || "";
  
  // Primary is always the ergonomic pillow
  const primary_product: PrimaryProduct = "ergonomic_pillow";
  
  // Determine secondary product
  let secondary_product: SecondaryProduct | undefined;
  
  if ((painAreas.includes("lower_back") || painAreas.includes("hips")) && sleepPosition === "side") {
    secondary_product = "knee_pillow";
  } else if (roomBrightness === "bright" || roomBrightness === "dim") {
    secondary_product = "silk_mask";
  } else if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    secondary_product = "knee_pillow";
  }
  
  // Determine bundle
  let recommended_bundle: RecommendedBundle | undefined;
  
  if (persona === "jason" && secondary_product === "knee_pillow") {
    recommended_bundle = "alignment_set";
  } else if (persona === "mila" && secondary_product === "silk_mask") {
    recommended_bundle = "deep_sleep_set";
  } else if (persona === "leo") {
    recommended_bundle = "performance_set";
  } else if (scores.alignment_risk_score > 50 && secondary_product === "knee_pillow") {
    recommended_bundle = "alignment_set";
  } else if (scores.light_sensitivity_score > 50) {
    recommended_bundle = "deep_sleep_set";
  }
  
  // Generate reasoning
  let reasoning = "";
  if (recommended_bundle === "alignment_set") {
    reasoning = "Based on your alignment concerns and sleep position, the Alignment Set addresses both neck support and hip alignment for comprehensive spinal care during sleep.";
  } else if (recommended_bundle === "deep_sleep_set") {
    reasoning = "Your environment analysis suggests light is affecting your sleep quality. The Deep Sleep Set combines proper neck support with complete light blocking for uninterrupted rest.";
  } else if (recommended_bundle === "performance_set") {
    reasoning = "For optimizing your sleep performance, this complete set addresses multiple factors including support, alignment, and environment for maximum recovery.";
  } else if (secondary_product === "knee_pillow") {
    reasoning = "The ergonomic pillow will support your cervical spine, while the knee pillow helps maintain proper hip and lower back alignment during side sleeping.";
  } else if (secondary_product === "silk_mask") {
    reasoning = "The ergonomic pillow provides proper neck support, while the silk mask helps block light that may be disrupting your melatonin production.";
  } else {
    reasoning = "The ergonomic pillow is designed to support your specific sleep position and address the alignment concerns identified in your assessment.";
  }
  
  return {
    primary_product,
    secondary_product,
    recommended_bundle,
    reasoning,
  };
}

// ============ COACH PREVIEW ============

/**
 * Generate sleep coach plan preview
 */
export function generateCoachPreview(
  quizAnswers: Record<string, any>,
  persona: SleepPersona,
  scores: AssessmentScores
): CoachPreview {
  const sleepGoals = quizAnswers.sleepGoals || [];
  
  // Day 1-3: Setup and baseline
  let day_1_3 = "";
  if (persona === "jason") {
    day_1_3 = "Focus on establishing correct pillow height and position for your sleep style. Begin gentle neck stretches before bed to release accumulated tension.";
  } else if (persona === "mila") {
    day_1_3 = "Create an optimal sleep environment by addressing light and temperature. Establish a consistent wind-down routine 30 minutes before bed.";
  } else {
    day_1_3 = "Set up your new sleep equipment and establish baseline habits. Track your initial sleep quality to measure improvement.";
  }
  
  // Day 4-7: Adjustment and optimization
  let day_4_7 = "";
  if (scores.neck_support_score < 60) {
    day_4_7 = "Fine-tune your pillow position based on initial comfort. Your body is adapting to proper alignment — some adjustment period is normal.";
  } else if (scores.sleep_stability_score < 60) {
    day_4_7 = "Work on sleep timing consistency and pre-bed routine. Begin identifying patterns in your sleep quality logs.";
  } else {
    day_4_7 = "Build on your initial progress by adding complementary habits. Review what's working and refine your approach.";
  }
  
  // Day 7-14: Consolidation
  let day_7_14 = "";
  if (sleepGoals.includes("reduce_pain")) {
    day_7_14 = "Evaluate pain reduction progress and make any final adjustments. By now, proper alignment should be noticeably reducing morning discomfort.";
  } else if (sleepGoals.includes("wake_refreshed")) {
    day_7_14 = "Consolidate your new sleep habits for sustained energy. Focus on protecting your improved sleep quality with consistent routines.";
  } else {
    day_7_14 = "Review your progress and celebrate improvements. Your AI coach will help maintain gains and suggest next-level optimizations.";
  }
  
  return { day_1_3, day_4_7, day_7_14 };
}

// ============ MAIN BUILDER ============

/**
 * Build complete SleepAssessment from quiz answers
 */
export function buildSleepAssessment(quizAnswers: Record<string, any>): SleepAssessment {
  const scores = calculateAssessmentScores(quizAnswers);
  const persona = detectPersona(quizAnswers);
  const sleepIdentity = generateSleepIdentity(quizAnswers, scores);
  const environmentFindings = generateEnvironmentFindings(quizAnswers, scores);
  const productRecommendations = generateProductRecommendations(quizAnswers, scores, persona.guess);
  const coachPreview = generateCoachPreview(quizAnswers, persona.guess, scores);
  
  return {
    sleepIdentity,
    scores,
    persona,
    environmentFindings,
    productRecommendations,
    coachPreview,
  };
}
