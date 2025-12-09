import { QUIZ_QUESTIONS, SECTIONS, type QuizAnswers } from "./QuizConfig";
import type { IssuePresentation, SleepScores } from "./QuizTypes";

// Issue mappings for display
const ISSUE_PLAIN_MAPPINGS: Record<string, string> = {
  "Cervical strain risk from inadequate neck support": "Your current pillow is probably putting extra strain on your neck.",
  "Shoulder pressure points not properly addressed": "Your shoulders may not be getting the pressure relief they need.",
  "Spinal misalignment during sleep affecting lower body": "Your lower back and hips may be out of alignment during sleep.",
  "Multiple pillows indicating incorrect pillow height": "Using multiple pillows suggests your main pillow isn't the right height.",
  "Current pillow not meeting support requirements": "Your current pillow isn't providing the support you need.",
  "Soft mattress + side sleeping may create neck–shoulder gap issues": "Your soft mattress and side sleeping likely leave a gap between your neck and shoulder.",
  "Frequent position changes suggesting comfort or support issues": "Tossing and turning often means your body is searching for comfort.",
  "Light exposure may be reducing deep sleep quality": "Light in your room may be disrupting your deep sleep cycles.",
  "Sleep temperature affecting sleep continuity": "Sleeping too warm may be waking you up during the night.",
  "Frequent night awakenings fragmenting sleep cycles": "Waking up often is fragmenting your sleep and reducing recovery.",
};

export const convertToIssuePresentation = (issue: string): IssuePresentation => ({
  plain: ISSUE_PLAIN_MAPPINGS[issue] || "This may be contributing to discomfort during the night.",
  clinical: issue,
});

export const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 85) return { label: "Excellent", color: "text-success" };
  if (score >= 70) return { label: "Good", color: "text-primary" };
  if (score >= 50) return { label: "Needs improvement", color: "text-amber-500" };
  return { label: "Critical", color: "text-destructive" };
};

export const getScoreExplanation = (dimension: "alignment" | "environment" | "consistency", score: number): string => {
  if (dimension === "alignment") {
    return score < 70 ? "Your neck/hip support likely isn't optimal yet." : "Your body alignment looks reasonably good.";
  }
  if (dimension === "environment") {
    return score < 70 ? "Light, noise, or temperature may be disrupting deep sleep." : "Your sleep environment is well-optimized.";
  }
  return score < 70 ? "Irregular bedtimes or frequent wake-ups are fragmenting sleep." : "Your sleep consistency is solid.";
};

export const getProductReasons = (productName: string, answers: QuizAnswers): string[] => {
  const reasons: string[] = [];
  const name = productName.toLowerCase();
  const painAreas = answers.painAreas as string[] || [];
  const sleepPosition = answers.sleepPosition as string;
  const pillowSatisfaction = answers.pillowSatisfaction as number ?? 5;
  const mattressFirmness = answers.mattressFirmness as string;
  const roomBrightness = answers.roomBrightness as string;

  if (name.includes("ergonomic") && name.includes("pillow") && !name.includes("knee")) {
    if (painAreas.includes("neck")) reasons.push("Reported neck pain or stiffness");
    if (sleepPosition === "side") reasons.push("Sleep mainly on your side, needing extra neck-shoulder support");
    if (sleepPosition === "back") reasons.push("Sleep on your back, needing cervical curve support");
    if (pillowSatisfaction <= 4) reasons.push("Are not satisfied with your current pillow support");
    if (mattressFirmness === "soft") reasons.push("Have a softer mattress requiring adjusted pillow height");
  }

  if (name.includes("knee")) {
    if (painAreas.includes("lower_back")) reasons.push("Experience lower back discomfort at night");
    if (painAreas.includes("hips")) reasons.push("Reported hip pain or pressure");
    if (sleepPosition === "side") reasons.push("Sleep on your side, where leg alignment affects your spine");
  }

  if (name.includes("mask") || name.includes("sleep mask")) {
    if (roomBrightness === "bright") reasons.push("Described your bedroom as quite bright at night");
    if (roomBrightness === "dim") reasons.push("Have some ambient light in your room");
  }

  return reasons.slice(0, 2);
};

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

  if (painAreas.includes("neck")) {
    issues.push("Cervical strain risk from inadequate neck support");
  }
  if (painAreas.includes("shoulders")) {
    issues.push("Shoulder pressure points not properly addressed");
  }
  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    issues.push("Spinal misalignment during sleep affecting lower body");
  }
  if (pillowCount === "2" || pillowCount === "3") {
    issues.push("Multiple pillows indicating incorrect pillow height");
  }
  if (pillowSatisfaction <= 4) {
    issues.push("Current pillow not meeting support requirements");
  }
  if (sleepPosition === "side" && mattressFirmness === "soft") {
    issues.push("Soft mattress + side sleeping may create neck–shoulder gap issues");
  }
  if (movesOften === "often" || movesOften === "always") {
    issues.push("Frequent position changes suggesting comfort or support issues");
  }
  if (roomBrightness === "bright" || roomBrightness === "dim") {
    issues.push("Light exposure may be reducing deep sleep quality");
  }
  if (sleepTemperature === "hot") {
    issues.push("Sleep temperature affecting sleep continuity");
  }
  if (nightAwakenings === "twice" || nightAwakenings === "frequently") {
    issues.push("Frequent night awakenings fragmenting sleep cycles");
  }

  return issues.slice(0, 5);
};

export const getClinicalProductDescription = (productName: string, sleepPosition?: string): string => {
  const name = productName.toLowerCase();
  
  if (name.includes("ergonomic") && name.includes("pillow") && !name.includes("knee")) {
    if (sleepPosition === "side") {
      return "Engineered with a cervical contour to maintain neutral spine alignment. The elevated side zones fill the neck–shoulder gap critical for side sleepers.";
    } else if (sleepPosition === "back") {
      return "Features graduated loft zones that cradle the cervical spine while supporting natural neck curvature for back sleepers.";
    }
    return "Supports the cervical curve and maintains neutral spinal alignment. Memory foam core adapts to your unique head and neck profile.";
  }
  
  if (name.includes("knee")) {
    return "Positions the legs to reduce hip rotation and maintain lumbar alignment. Particularly effective for side sleepers on softer mattresses.";
  }
  
  if (name.includes("mask") || name.includes("sleep mask")) {
    return "Blocks early-morning light exposure that disrupts REM cycles and melatonin production. Contoured design prevents pressure on eyelids.";
  }
  
  if (name.includes("bundle")) {
    return "Complete sleep optimization system addressing cervical support, spinal alignment, and light control for comprehensive sleep quality improvement.";
  }
  
  return "Designed to address specific sleep quality factors identified in your assessment.";
};

export const calculateDerivedScores = (answers: QuizAnswers): SleepScores => {
  const painAreas = answers.painAreas as string[] || [];
  const pillowSatisfaction = answers.pillowSatisfaction as number ?? 5;
  const roomBrightness = answers.roomBrightness as string;
  const roomNoise = answers.roomNoise as string;
  const sleepTemperature = answers.sleepTemperature as string;
  const sleepLatency = answers.sleepLatency as string;
  const nightAwakenings = answers.nightAwakenings as string;
  const movesOften = answers.movesOften as string;

  let alignmentScore = 100;
  alignmentScore -= painAreas.filter(p => p !== "none").length * 12;
  alignmentScore -= (10 - pillowSatisfaction) * 5;
  if (movesOften === "often") alignmentScore -= 15;
  if (movesOften === "always") alignmentScore -= 25;

  let environmentScore = 100;
  if (roomBrightness === "bright") environmentScore -= 25;
  if (roomBrightness === "dim") environmentScore -= 10;
  if (roomNoise === "noisy") environmentScore -= 20;
  if (roomNoise === "some") environmentScore -= 8;
  if (sleepTemperature === "hot") environmentScore -= 20;
  if (sleepTemperature === "cold") environmentScore -= 10;

  let consistencyScore = 100;
  if (sleepLatency === "slow") consistencyScore -= 20;
  if (sleepLatency === "very_slow") consistencyScore -= 35;
  if (nightAwakenings === "twice") consistencyScore -= 20;
  if (nightAwakenings === "frequently") consistencyScore -= 35;

  return {
    alignmentScore: Math.max(0, Math.min(100, alignmentScore)),
    environmentScore: Math.max(0, Math.min(100, environmentScore)),
    consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
  };
};

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

export const getProgressMicrocopy = (progressPercent: number) => {
  if (progressPercent < 25) {
    return "Great start! Let's understand how you sleep.";
  } else if (progressPercent < 50) {
    return "Nice progress! We're building your profile.";
  } else if (progressPercent < 70) {
    return "Halfway there! 👌 Your plan is taking shape.";
  } else if (progressPercent < 90) {
    return "Almost done! Just a few more questions.";
  } else {
    return "Final step! We're ready to create your plan.";
  }
};

export const getContextualInsight = (questionId: string, answers: QuizAnswers) => {
  const painAreas = answers.painAreas as string[] || [];
  const sleepPosition = answers.sleepPosition as string;
  const roomBrightness = answers.roomBrightness as string;
  
  if (questionId === "nightAwakenings" && painAreas.length > 0 && !painAreas.includes("none")) {
    return "We're already spotting patterns in your pain profile…";
  }
  if (questionId === "sleepHours" && roomBrightness && roomBrightness !== "dark") {
    return "Your sleep environment might be affecting your deep sleep — we'll address this in your plan.";
  }
  if (questionId === "sleepGoals") {
    return "We've matched your answers to a specific pillow setup and coaching plan.";
  }
  if (questionId === "pillowSatisfaction" && sleepPosition === "side") {
    return "Side sleepers often need specialized support — we're noting this.";
  }
  return null;
};

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
