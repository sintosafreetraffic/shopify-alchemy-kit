/**
 * Sleep Quiz Helpers v9
 * 
 * Psychology-first helper functions for quiz display and derived insights.
 * Aligned with backend persona detection signals in sleep-assessment.ts.
 * 
 * Design principles:
 * - Calm, Scandinavian tone
 * - Non-medical, comfort-focused language
 * - Clear mapping to persona clusters
 */

import { QUIZ_QUESTIONS, SECTIONS, type QuizAnswers } from "./QuizConfig";
import type { IssuePresentation, SleepScores, PersonaCluster } from "./QuizTypes";

// ============ ISSUE MAPPINGS ============

/**
 * Issue mappings for display - psychology-first, non-medical language
 * Maps clinical observations to calm, actionable descriptions
 */
const ISSUE_PLAIN_MAPPINGS: Record<string, string> = {
  // Alignment/Pain issues (Pain Sleeper signals)
  "neck_tension_pattern": "Your neck may not be getting the support it needs during sleep.",
  "shoulder_pressure_pattern": "Your shoulders might benefit from better pressure distribution.",
  "lower_body_alignment_need": "Your lower back and hips could use improved alignment support.",
  "pillow_height_mismatch": "Using multiple pillows suggests your primary pillow height isn't optimal.",
  "pillow_support_inadequate": "Your current pillow may not be providing adequate support.",
  "morning_stiffness_pattern": "Morning stiffness suggests your body is working to find comfort.",
  
  // Environment/Stress issues (Stress & Environment Sleeper signals)
  "light_exposure_concern": "Light in your room may be affecting your natural sleep cycles.",
  "temperature_disruption": "Temperature regulation appears to be impacting your sleep continuity.",
  "sleep_onset_difficulty": "Your mind may need more support winding down before sleep.",
  "sleep_fragmentation": "Fragmented sleep is preventing full restorative cycles.",
  "environment_sensitivity": "Your sleep environment has optimization potential.",
  
  // Recovery/Performance issues
  "recovery_optimization_needed": "Your sleep could better support physical recovery and energy.",
  "deep_sleep_opportunity": "There's potential to enhance your deep sleep phases.",
  
  // Legacy mappings for backwards compatibility
  "Cervical strain risk from inadequate neck support": "Your current pillow may not be providing optimal neck support.",
  "Shoulder pressure points not properly addressed": "Your shoulders might benefit from better pressure relief.",
  "Spinal misalignment during sleep affecting lower body": "Your lower back and hip alignment could be improved during sleep.",
  "Multiple pillows indicating incorrect pillow height": "Using multiple pillows suggests your primary pillow height isn't right.",
  "Current pillow not meeting support requirements": "Your current pillow isn't providing the support you need.",
  "Soft mattress + side sleeping may create neck–shoulder gap issues": "Your mattress and sleep position combination may be affecting neck alignment.",
  "Frequent position changes suggesting comfort or support issues": "Frequent repositioning suggests your body is searching for comfort.",
  "Light exposure may be reducing deep sleep quality": "Light exposure may be affecting your deep sleep quality.",
  "Sleep temperature affecting sleep continuity": "Temperature may be disrupting your sleep continuity.",
  "Frequent night awakenings fragmenting sleep cycles": "Night awakenings are fragmenting your sleep cycles.",
};

export const convertToIssuePresentation = (issue: string): IssuePresentation => ({
  plain: ISSUE_PLAIN_MAPPINGS[issue] || "This pattern may be affecting your sleep quality.",
  clinical: issue,
});

// ============ SCORE DISPLAY HELPERS ============

export const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 65) return { label: "Good", color: "text-primary" };
  if (score >= 45) return { label: "Moderate", color: "text-amber-500" };
  return { label: "Needs attention", color: "text-rose-500" };
};

export const getScoreExplanation = (dimension: "alignment" | "environment" | "consistency", score: number): string => {
  if (dimension === "alignment") {
    if (score >= 80) return "Your spinal alignment during sleep appears well-supported.";
    if (score >= 60) return "Your alignment is reasonable with room for improvement.";
    return "Your alignment could benefit from better support.";
  }
  if (dimension === "environment") {
    if (score >= 80) return "Your sleep environment is well-optimized.";
    if (score >= 60) return "Your environment is decent with some refinement opportunities.";
    return "Environmental factors may be affecting your sleep quality.";
  }
  // consistency
  if (score >= 80) return "Your sleep patterns show good stability.";
  if (score >= 60) return "Your sleep consistency is moderate.";
  return "Fragmented sleep may be reducing your recovery.";
};

// ============ PRODUCT REASONING ============

export const getProductReasons = (productName: string, answers: QuizAnswers): string[] => {
  const reasons: string[] = [];
  const name = productName.toLowerCase();
  const painAreas = answers.painAreas as string[] || [];
  const sleepPosition = answers.sleepPosition as string;
  const pillowSatisfaction = answers.pillowSatisfaction as number ?? 5;
  const mattressFirmness = answers.mattressFirmness as string;
  const roomBrightness = answers.roomBrightness as string;

  if (name.includes("ergonomic") && name.includes("pillow") && !name.includes("knee")) {
    if (painAreas.includes("neck")) reasons.push("You mentioned neck tension");
    if (sleepPosition === "side") reasons.push("Side sleepers benefit from contoured support");
    if (sleepPosition === "back") reasons.push("Back sleepers need cervical curve support");
    if (pillowSatisfaction <= 4) reasons.push("Your current pillow isn't meeting your needs");
    if (mattressFirmness === "soft") reasons.push("Soft mattresses need adjusted pillow height");
  }

  if (name.includes("knee")) {
    if (painAreas.includes("lower_back")) reasons.push("You experience lower back discomfort");
    if (painAreas.includes("hips")) reasons.push("Hip alignment can be improved");
    if (sleepPosition === "side") reasons.push("Side sleepers benefit from leg alignment");
  }

  if (name.includes("mask") || name.includes("sleep mask")) {
    if (roomBrightness === "bright") reasons.push("Your room has significant light exposure");
    if (roomBrightness === "dim") reasons.push("Eliminating ambient light supports deeper sleep");
  }

  return reasons.slice(0, 2);
};

// ============ PSYCHOLOGY-FIRST ISSUE DETECTION ============

/**
 * Derive detected issues from quiz answers
 * 
 * Uses psychology-first categorization aligned with persona clusters:
 * - Alignment/Comfort issues → Pain Sleeper
 * - Environment/Wind-down issues → Stress & Environment Sleeper
 * - Recovery potential → Recovery/Optimizer Sleeper
 */
export const deriveDetectedIssues = (answers: QuizAnswers): string[] => {
  const issues: string[] = [];
  const painAreas = answers.painAreas as string[] || [];
  const pillowCount = answers.pillowCount as string;
  const mattressFirmness = answers.mattressFirmness as string;
  const sleepPosition = answers.sleepPosition as string;
  const movesOften = answers.movesOften as string;
  const roomBrightness = answers.roomBrightness as string;
  const sleepTemperature = answers.sleepTemperature as string;
  const nightAwakenings = answers.nightAwakenings as string;
  const pillowSatisfaction = answers.pillowSatisfaction as number;
  const sleepLatency = answers.sleepLatency as string;
  const painSeverity = answers.painSeverity as number ?? 5;

  // === ALIGNMENT/COMFORT ISSUES (Pain Sleeper signals) ===
  if (painAreas.includes("neck") || painAreas.includes("shoulders")) {
    issues.push("neck_tension_pattern");
  }
  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    issues.push("lower_body_alignment_need");
  }
  if (pillowCount === "2" || pillowCount === "3" || pillowCount === "3+") {
    issues.push("pillow_height_mismatch");
  }
  if (pillowSatisfaction <= 4) {
    issues.push("pillow_support_inadequate");
  }
  if ((movesOften === "often" || movesOften === "always") && painSeverity >= 4) {
    issues.push("morning_stiffness_pattern");
  }

  // === ENVIRONMENT/STRESS ISSUES (Stress & Environment Sleeper signals) ===
  if (roomBrightness === "bright" || roomBrightness === "dim") {
    issues.push("light_exposure_concern");
  }
  if (sleepTemperature === "hot") {
    issues.push("temperature_disruption");
  }
  if (sleepLatency === "slow" || sleepLatency === "very_slow") {
    issues.push("sleep_onset_difficulty");
  }
  if (nightAwakenings === "twice" || nightAwakenings === "frequently") {
    issues.push("sleep_fragmentation");
  }

  // === RECOVERY/OPTIMIZATION ISSUES ===
  // Only add if no major pain/env issues - these are "opportunity" issues
  if (issues.length < 3) {
    const sleepGoals = answers.sleepGoals as string[] || [];
    const hasRecoveryGoal = sleepGoals.some(g => 
      ['faster_recovery', 'better_recovery', 'more_energy', 'wake_refreshed'].includes(g)
    );
    if (hasRecoveryGoal) {
      issues.push("recovery_optimization_needed");
    }
  }

  return issues.slice(0, 5);
};

// ============ CLINICAL PRODUCT DESCRIPTIONS ============

export const getClinicalProductDescription = (productName: string, sleepPosition?: string): string => {
  const name = productName.toLowerCase();
  
  if (name.includes("ergonomic") && name.includes("pillow") && !name.includes("knee")) {
    if (sleepPosition === "side") {
      return "Contoured design fills the neck-shoulder gap critical for side sleepers, maintaining neutral spine alignment throughout the night.";
    } else if (sleepPosition === "back") {
      return "Graduated loft zones cradle the cervical spine while supporting the natural neck curvature for back sleepers.";
    }
    return "Adaptive memory foam core conforms to your unique head and neck profile, supporting neutral spinal alignment.";
  }
  
  if (name.includes("knee")) {
    return "Positions the legs to reduce hip rotation and maintain lumbar alignment, particularly effective for side sleepers.";
  }
  
  if (name.includes("mask") || name.includes("sleep mask")) {
    return "Complete light blocking supports natural melatonin production and protects REM cycles from early morning light.";
  }
  
  if (name.includes("bundle")) {
    return "Comprehensive sleep optimization addressing cervical support, spinal alignment, and environmental factors.";
  }
  
  return "Designed to address specific factors identified in your assessment.";
};

// ============ DERIVED SCORES ============

/**
 * Calculate derived scores from quiz answers
 * 
 * These scores mirror the backend's AssessmentScores conceptually,
 * providing immediate feedback before backend analysis.
 */
export const calculateDerivedScores = (answers: QuizAnswers): SleepScores => {
  const painAreas = answers.painAreas as string[] || [];
  const pillowSatisfaction = answers.pillowSatisfaction as number ?? 5;
  const painSeverity = answers.painSeverity as number ?? 5;
  const roomBrightness = answers.roomBrightness as string;
  const roomNoise = answers.roomNoise as string;
  const sleepTemperature = answers.sleepTemperature as string;
  const sleepLatency = answers.sleepLatency as string;
  const nightAwakenings = answers.nightAwakenings as string;
  const movesOften = answers.movesOften as string;

  // Alignment Score (mirrors alignment_risk inversed + neck_support)
  let alignmentScore = 100;
  const painCount = painAreas.filter(p => p !== "none").length;
  alignmentScore -= painCount * 10;
  alignmentScore -= Math.max(0, painSeverity - 3) * 6;
  alignmentScore -= Math.max(0, 10 - pillowSatisfaction) * 4;
  if (movesOften === "often") alignmentScore -= 12;
  if (movesOften === "always") alignmentScore -= 18;

  // Environment Score (mirrors environment_score + light/temp sensitivity)
  let environmentScore = 100;
  if (roomBrightness === "bright") environmentScore -= 22;
  if (roomBrightness === "dim") environmentScore -= 10;
  if (roomNoise === "noisy") environmentScore -= 18;
  if (roomNoise === "some") environmentScore -= 6;
  if (sleepTemperature === "hot") environmentScore -= 18;
  if (sleepTemperature === "cold") environmentScore -= 8;

  // Consistency Score (mirrors sleep_stability)
  let consistencyScore = 100;
  if (sleepLatency === "slow") consistencyScore -= 18;
  if (sleepLatency === "very_slow") consistencyScore -= 30;
  if (nightAwakenings === "once") consistencyScore -= 8;
  if (nightAwakenings === "twice") consistencyScore -= 18;
  if (nightAwakenings === "frequently") consistencyScore -= 30;

  return {
    alignmentScore: Math.max(0, Math.min(100, alignmentScore)),
    environmentScore: Math.max(0, Math.min(100, environmentScore)),
    consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
  };
};

// ============ NAVIGATION HELPERS ============

export const getVisibleQuestions = (answers: QuizAnswers) => {
  return QUIZ_QUESTIONS.filter(q => {
    if (q.showIf) {
      return q.showIf(answers);
    }
    return true;
  });
};

export const getCurrentSectionInfo = (currentQuestionId: string, answers: QuizAnswers) => {
  const visibleQuestions = getVisibleQuestions(answers);
  
  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];
    if (section.questions.includes(currentQuestionId)) {
      const visibleInSection = section.questions.filter(qId => 
        visibleQuestions.some(vq => vq.id === qId)
      );
      const posInSection = visibleInSection.indexOf(currentQuestionId) + 1;
      
      return {
        sectionIndex: i,
        sectionName: section.name,
        sectionDescription: section.description,
        positionInSection: posInSection,
        totalInSection: visibleInSection.length,
        isFirstInSection: posInSection === 1,
        isLastInSection: posInSection === visibleInSection.length,
      };
    }
  }
  return null;
};

// ============ PROGRESS MICROCOPY ============

/**
 * Get progress microcopy with calm, reassuring tone
 */
export const getProgressMicrocopy = (progressPercent: number): string => {
  if (progressPercent < 20) {
    return "We're learning how you sleep.";
  } else if (progressPercent < 40) {
    return "Building your sleep profile.";
  } else if (progressPercent < 60) {
    return "Understanding your patterns.";
  } else if (progressPercent < 80) {
    return "Your personalized plan is taking shape.";
  } else if (progressPercent < 95) {
    return "Almost there — final details.";
  } else {
    return "Ready to see your results.";
  }
};

// ============ CONTEXTUAL INSIGHTS ============

export const getContextualInsight = (questionId: string, answers: QuizAnswers): string | null => {
  const painAreas = answers.painAreas as string[] || [];
  const sleepPosition = answers.sleepPosition as string;
  const roomBrightness = answers.roomBrightness as string;
  const movesOften = answers.movesOften as string;
  
  if (questionId === "nightAwakenings" && painAreas.length > 0 && !painAreas.includes("none")) {
    return "We're noting how your comfort patterns connect to sleep continuity.";
  }
  if (questionId === "sleepTemperature" && (movesOften === "often" || movesOften === "always")) {
    return "Restlessness can sometimes relate to temperature regulation.";
  }
  if (questionId === "sleepGoals") {
    return "Your goals will shape your personalized recommendations.";
  }
  if (questionId === "pillowSatisfaction" && sleepPosition === "side") {
    return "Side sleepers have specific support needs we'll address.";
  }
  if (questionId === "roomBrightness" && roomBrightness === "bright") {
    return "Light exposure can significantly affect sleep depth.";
  }
  return null;
};

// ============ VALIDATION ============

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============ PERSONA DISPLAY HELPERS ============

/**
 * Get persona-friendly display text for risk drivers
 */
export const getRiskDriverDisplayText = (riskDriver: string): string => {
  const displayMap: Record<string, string> = {
    neck_shoulder_tension: "Neck & shoulder tension",
    lower_body_alignment: "Lower body alignment",
    pillow_support_inadequate: "Pillow support needs",
    light_exposure: "Light exposure",
    temperature_too_warm: "Sleep temperature",
    sleep_fragmentation: "Sleep continuity",
    difficulty_falling_asleep: "Wind-down difficulty",
    restless_movement: "Restless movement",
  };
  return displayMap[riskDriver] || riskDriver.replace(/_/g, " ");
};

/**
 * Get coach readiness explanation text
 */
export const getCoachReadinessExplanation = (label: string): string => {
  switch (label) {
    case "Ready":
      return "Your profile is well-suited for personalized coaching.";
    case "Developing":
      return "A few more data points will optimize your coaching experience.";
    case "Early Stage":
      return "We're gathering the foundation for your personalized plan.";
    default:
      return "";
  }
};
