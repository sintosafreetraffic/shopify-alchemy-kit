import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart, Mail, Sparkles, Info, Moon, ArrowLeft, ArrowRight, Lock, Check, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { trackQuizStarted } from "@/lib/klaviyo";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Section configuration for grouped perception
const SECTIONS = [
  { 
    id: "sleep_habits", 
    name: "How you sleep", 
    description: "Understanding your sleep patterns",
    questions: ["sleepPosition", "movesOften", "pillowCount", "mattressFirmness", "sleepEquipment"]
  },
  { 
    id: "pain_profile", 
    name: "Pain profile", 
    description: "Identifying discomfort patterns",
    questions: ["painAreas", "painSeverity", "nightAwakenings"]
  },
  { 
    id: "pillow_problems", 
    name: "Your pillow problems", 
    description: "What's not working for you",
    questions: ["triedMethods", "pillowSatisfaction", "snoring"]
  },
  { 
    id: "environment", 
    name: "Sleep environment & habits", 
    description: "Your bedroom and routines",
    questions: ["sleepTemperature", "roomBrightness", "roomNoise", "sleepLatency", "sleepHours", "eveningScreenUse", "sleepClothing"]
  },
  { 
    id: "personal", 
    name: "Personal details & plan delivery", 
    description: "Tailoring your recommendations",
    questions: ["ageGroup", "gender", "coSleeping", "sleepGoals", "email"]
  },
];

// Question configuration with tooltips
const QUIZ_QUESTIONS = [
  {
    id: "sleepPosition",
    question: "What's your primary sleep position?",
    tooltip: "Your pillow height and contour depth depend entirely on your sleep position. This is one of the biggest predictors of neck pain.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "back", label: "Back sleeper" },
      { value: "side", label: "Side sleeper" },
      { value: "stomach", label: "Stomach sleeper" },
      { value: "combination", label: "Combination (I move around)" },
    ],
  },
  {
    id: "movesOften",
    question: "Do you change positions often during the night?",
    tooltip: "Frequent turning usually means your pillow or mattress isn't supporting your spine properly.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "rarely", label: "Rarely — I stay in one position" },
      { value: "sometimes", label: "Sometimes — A few times per night" },
      { value: "often", label: "Often — I toss and turn frequently" },
      { value: "always", label: "Almost always — I can't seem to get comfortable" },
    ],
  },
  {
    id: "pillowCount",
    question: "How many pillows do you currently sleep with?",
    tooltip: "Stacking pillows is a major sign your current pillow height is incorrect.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "1", label: "1 pillow" },
      { value: "2", label: "2 pillows" },
      { value: "3", label: "3 or more pillows" },
      { value: "0", label: "No pillow" },
    ],
  },
  {
    id: "mattressFirmness",
    question: "How would you describe your mattress firmness?",
    tooltip: "Mattress firmness affects how deep your shoulder sinks, which changes the ideal pillow height.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "soft", label: "Soft — I sink in quite a bit" },
      { value: "medium", label: "Medium — Balanced support" },
      { value: "firm", label: "Firm — Minimal sinking" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "sleepEquipment",
    question: "What sleep equipment do you currently use?",
    tooltip: "This helps us understand what has or hasn't worked for you before, so we recommend the correct upgrades.",
    type: "checkbox",
    options: [
      { value: "regular_pillow", label: "Regular pillow" },
      { value: "contour_pillow", label: "Contour/ergonomic pillow" },
      { value: "knee_pillow", label: "Knee pillow" },
      { value: "body_pillow", label: "Body pillow" },
      { value: "sleep_mask", label: "Sleep mask" },
      { value: "white_noise", label: "White noise machine" },
      { value: "weighted_blanket", label: "Weighted blanket" },
      { value: "none", label: "None of the above" },
    ],
  },
  {
    id: "painAreas",
    question: "Where do you experience pain or discomfort?",
    tooltip: "Different pain patterns reveal different alignment issues. This helps us tailor your recommendations.",
    type: "checkbox",
    options: [
      { value: "neck", label: "Neck" },
      { value: "upper_back", label: "Upper back" },
      { value: "lower_back", label: "Lower back" },
      { value: "shoulders", label: "Shoulders" },
      { value: "hips", label: "Hips" },
      { value: "headaches", label: "Headaches/migraines" },
      { value: "none", label: "No pain" },
    ],
  },
  {
    id: "painSeverity",
    question: "How severe is your morning pain on average?",
    tooltip: "Tracking severity helps us evaluate whether your sleep environment is contributing to tension.",
    type: "slider",
    min: 0,
    max: 10,
    labels: { 0: "No pain", 5: "Moderate", 10: "Severe" },
    // Only show if user has pain
    showIf: (answers: Record<string, unknown>) => {
      const painAreas = answers.painAreas as string[] || [];
      return painAreas.length > 0 && !painAreas.includes("none");
    },
  },
  {
    id: "nightAwakenings",
    question: "How often do you wake up during the night?",
    tooltip: "Night awakenings indicate misalignment, overheating, or environmental disturbances.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "once", label: "Once per night" },
      { value: "twice", label: "2-3 times per night" },
      { value: "frequently", label: "4+ times per night" },
    ],
  },
  {
    id: "sleepTemperature",
    question: "Do you typically sleep hot, cold, or neutral?",
    tooltip: "Temperature is one of the biggest factors affecting deep sleep quality.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "hot", label: "Hot — I often wake up sweating" },
      { value: "cold", label: "Cold — I usually feel chilly" },
      { value: "neutral", label: "Neutral — Temperature is comfortable" },
    ],
  },
  {
    id: "roomBrightness",
    question: "How bright is your sleep environment?",
    tooltip: "Light exposure reduces melatonin and leads to shallow sleep. This helps us recommend masks if needed.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "dark", label: "Very dark — I can't see anything" },
      { value: "dim", label: "Dimly lit — Some ambient light" },
      { value: "bright", label: "Quite bright — Street lights or early sunrise" },
    ],
  },
  {
    id: "roomNoise",
    question: "What are the noise levels in your bedroom?",
    tooltip: "Noise disruption fragments your deep sleep and increases morning fatigue.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "quiet", label: "Very quiet" },
      { value: "some", label: "Some background noise" },
      { value: "noisy", label: "Often noisy (traffic, neighbors, etc.)" },
    ],
  },
  {
    id: "sleepLatency",
    question: "How long does it typically take you to fall asleep?",
    tooltip: "Sleep latency reveals stress levels, environment mismatch, or poor pillow alignment.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "quick", label: "Less than 15 minutes" },
      { value: "normal", label: "15-30 minutes" },
      { value: "slow", label: "30-60 minutes" },
      { value: "very_slow", label: "Over an hour" },
    ],
  },
  {
    id: "sleepHours",
    question: "How many hours of sleep do you average per night?",
    tooltip: "This allows your AI Sleep Coach to adjust recovery recommendations.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "under5", label: "Under 5 hours" },
      { value: "5to6", label: "5-6 hours" },
      { value: "6to7", label: "6-7 hours" },
      { value: "7to8", label: "7-8 hours" },
      { value: "over8", label: "Over 8 hours" },
    ],
  },
  {
    id: "eveningScreenUse",
    question: "Do you use screens (phone, TV, laptop) before bed?",
    tooltip: "Screens suppress melatonin and shift your circadian rhythm.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "sometimes", label: "Sometimes — A few times a week" },
      { value: "often", label: "Often — Most nights" },
      { value: "always", label: "Always — Right up until I sleep" },
    ],
  },
  {
    id: "ageGroup",
    question: "What is your age group?",
    tooltip: "Certain sleep issues increase with age. This improves personalization but is optional.",
    type: "radio",
    optional: true,
    autoAdvance: true,
    options: [
      { value: "18-24", label: "18-24" },
      { value: "25-34", label: "25-34" },
      { value: "35-44", label: "35-44" },
      { value: "45-54", label: "45-54" },
      { value: "55-64", label: "55-64" },
      { value: "65+", label: "65+" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "gender",
    question: "What is your gender?",
    tooltip: "Gender influences shoulder width and optimal pillow height. You may skip this.",
    type: "radio",
    optional: true,
    autoAdvance: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "sleepClothing",
    question: "What do you typically wear to bed?",
    tooltip: "This helps us understand temperature regulation and overheating patterns.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "minimal", label: "Minimal — Underwear or nothing" },
      { value: "light", label: "Light — T-shirt and shorts" },
      { value: "moderate", label: "Moderate — Pajamas" },
      { value: "heavy", label: "Heavy — Warm layers" },
    ],
  },
  {
    id: "coSleeping",
    question: "Do you share your bed with anyone?",
    tooltip: "Co-sleeping can increase disruptions. This helps improve your AI recommendations.",
    type: "checkbox",
    options: [
      { value: "alone", label: "I sleep alone" },
      { value: "partner", label: "Partner/spouse" },
      { value: "child", label: "Child/children" },
      { value: "pet", label: "Pet(s)" },
    ],
  },
  {
    id: "sleepGoals",
    question: "What are your top sleep improvement goals?",
    tooltip: "These goals shape your personalized AI sleep plan and product recommendations.",
    type: "checkbox",
    maxSelections: 3,
    subtitle: "Select up to 3",
    options: [
      { value: "reduce_pain", label: "Reduce pain and discomfort" },
      { value: "better_quality", label: "Improve overall sleep quality" },
      { value: "fall_asleep_faster", label: "Fall asleep faster" },
      { value: "stay_asleep", label: "Stay asleep through the night" },
      { value: "wake_refreshed", label: "Wake up feeling refreshed" },
      { value: "reduce_snoring", label: "Reduce snoring" },
      { value: "better_posture", label: "Improve spinal alignment" },
    ],
  },
  {
    id: "snoring",
    question: "How often do you snore?",
    tooltip: "Snoring often comes from airway angle, which can be improved with the right pillow height.",
    type: "radio",
    autoAdvance: true,
    options: [
      { value: "never", label: "Never or rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often — Several nights a week" },
      { value: "always", label: "Always — Every night" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "triedMethods",
    question: "Have you tried any sleep improvement methods?",
    tooltip: "This helps us tailor a plan that avoids repeating what hasn't worked.",
    type: "checkbox",
    options: [
      { value: "new_mattress", label: "New mattress" },
      { value: "new_pillow", label: "New pillow(s)" },
      { value: "sleep_apps", label: "Sleep tracking apps" },
      { value: "supplements", label: "Sleep supplements (melatonin, etc.)" },
      { value: "medication", label: "Sleep medication" },
      { value: "therapy", label: "Sleep therapy/counseling" },
      { value: "nothing", label: "None of the above" },
    ],
  },
  {
    id: "pillowSatisfaction",
    question: "How satisfied are you with your current pillow?",
    tooltip: "This gives a measurable baseline for improvement.",
    type: "slider",
    min: 0,
    max: 10,
    labels: { 0: "Very unsatisfied", 5: "Neutral", 10: "Very satisfied" },
  },
];

interface QuizPayload {
  sleepPosition: string;
  movesOften: string;
  pillowCount: string;
  mattressFirmness: string;
  sleepEquipment: string[];
  painAreas: string[];
  painSeverity: number;
  nightAwakenings: string;
  sleepTemperature: string;
  roomBrightness: string;
  roomNoise: string;
  sleepLatency: string;
  sleepHours: string;
  eveningScreenUse: string;
  ageGroup?: string;
  gender?: string;
  sleepClothing: string;
  coSleeping: string[];
  sleepGoals: string[];
  snoring: string;
  triedMethods: string[];
  pillowSatisfaction: number;
  email?: string;
}

interface ProductRecommendation {
  product: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface SleepScores {
  alignmentScore: number;
  environmentScore: number;
  consistencyScore: number;
}

interface AnalysisResult {
  assessment: string;
  recommendations: ProductRecommendation[];
  bundleRecommended: boolean;
  bundleReason?: string;
  profileCreated?: boolean;
  // Extended fields from backend (all optional for backward compatibility)
  detectedIssues?: string[];
  alignmentInsights?: string[];
  scores?: SleepScores;
  expertSummary?: string;
}

// Helper: Convert clinical issue to plain + clinical pair
interface IssuePresentation {
  plain: string;
  clinical: string;
}

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

const convertToIssuePresentation = (issue: string): IssuePresentation => ({
  plain: ISSUE_PLAIN_MAPPINGS[issue] || "This may be contributing to discomfort during the night.",
  clinical: issue,
});

// Helper: Get score label
const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 85) return { label: "Excellent", color: "text-success" };
  if (score >= 70) return { label: "Good", color: "text-primary" };
  if (score >= 50) return { label: "Needs improvement", color: "text-amber-500" };
  return { label: "Critical", color: "text-destructive" };
};

// Helper: Get score explanation
const getScoreExplanation = (dimension: "alignment" | "environment" | "consistency", score: number): string => {
  if (dimension === "alignment") {
    return score < 70 ? "Your neck/hip support likely isn't optimal yet." : "Your body alignment looks reasonably good.";
  }
  if (dimension === "environment") {
    return score < 70 ? "Light, noise, or temperature may be disrupting deep sleep." : "Your sleep environment is well-optimized.";
  }
  return score < 70 ? "Irregular bedtimes or frequent wake-ups are fragmenting sleep." : "Your sleep consistency is solid.";
};

// Helper: Get "Because you..." reasons for each product
const getProductReasons = (productName: string, answers: Record<string, string | string[] | number>): string[] => {
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

// Helper to derive detected issues from answers
const deriveDetectedIssues = (answers: Record<string, string | string[] | number>): string[] => {
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

  // Pain-related issues
  if (painAreas.includes("neck")) {
    issues.push("Cervical strain risk from inadequate neck support");
  }
  if (painAreas.includes("shoulders")) {
    issues.push("Shoulder pressure points not properly addressed");
  }
  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    issues.push("Spinal misalignment during sleep affecting lower body");
  }

  // Pillow-related issues
  if (pillowCount === "2" || pillowCount === "3") {
    issues.push("Multiple pillows indicating incorrect pillow height");
  }
  if (pillowSatisfaction <= 4) {
    issues.push("Current pillow not meeting support requirements");
  }

  // Position + mattress issues
  if (sleepPosition === "side" && mattressFirmness === "soft") {
    issues.push("Soft mattress + side sleeping may create neck–shoulder gap issues");
  }
  if (movesOften === "often" || movesOften === "always") {
    issues.push("Frequent position changes suggesting comfort or support issues");
  }

  // Environment issues
  if (roomBrightness === "bright" || roomBrightness === "dim") {
    issues.push("Light exposure may be reducing deep sleep quality");
  }
  if (sleepTemperature === "hot") {
    issues.push("Sleep temperature affecting sleep continuity");
  }
  if (nightAwakenings === "twice" || nightAwakenings === "frequently") {
    issues.push("Frequent night awakenings fragmenting sleep cycles");
  }

  return issues.slice(0, 5); // Limit to 5 most relevant
};

// Helper to generate clinical product descriptions
const getClinicalProductDescription = (productName: string, sleepPosition?: string): string => {
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

// Helper to calculate derived scores
const calculateDerivedScores = (answers: Record<string, string | string[] | number>) => {
  const painAreas = answers.painAreas as string[] || [];
  const pillowSatisfaction = answers.pillowSatisfaction as number ?? 5;
  const roomBrightness = answers.roomBrightness as string;
  const roomNoise = answers.roomNoise as string;
  const sleepTemperature = answers.sleepTemperature as string;
  const sleepLatency = answers.sleepLatency as string;
  const nightAwakenings = answers.nightAwakenings as string;
  const movesOften = answers.movesOften as string;

  // Alignment score (based on pain, pillow satisfaction, movement)
  let alignmentScore = 100;
  alignmentScore -= painAreas.filter(p => p !== "none").length * 12;
  alignmentScore -= (10 - pillowSatisfaction) * 5;
  if (movesOften === "often") alignmentScore -= 15;
  if (movesOften === "always") alignmentScore -= 25;

  // Environment score
  let environmentScore = 100;
  if (roomBrightness === "bright") environmentScore -= 25;
  if (roomBrightness === "dim") environmentScore -= 10;
  if (roomNoise === "noisy") environmentScore -= 20;
  if (roomNoise === "some") environmentScore -= 8;
  if (sleepTemperature === "hot") environmentScore -= 20;
  if (sleepTemperature === "cold") environmentScore -= 10;

  // Consistency score
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

// Get visible questions based on branching logic
const getVisibleQuestions = (answers: Record<string, string | string[] | number>) => {
  return QUIZ_QUESTIONS.filter(q => {
    if (q.showIf) {
      return q.showIf(answers);
    }
    return true;
  });
};

// Get current section info
const getCurrentSectionInfo = (currentQuestionId: string, answers: Record<string, string | string[] | number>) => {
  const visibleQuestions = getVisibleQuestions(answers);
  const questionIndex = visibleQuestions.findIndex(q => q.id === currentQuestionId);
  
  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];
    if (section.questions.includes(currentQuestionId)) {
      // Count visible questions in this section
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

// Get progress microcopy based on actual progress percentage
const getProgressMicrocopy = (progressPercent: number) => {
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

// Get contextual insight based on answers
const getContextualInsight = (questionId: string, answers: Record<string, string | string[] | number>) => {
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

const SleepQuiz = () => {
  const [step, setStep] = useState(0); // 0-indexed for questions
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({
    sleepEquipment: [],
    painAreas: [],
    coSleeping: [],
    sleepGoals: [],
    triedMethods: [],
    painSeverity: 5,
    pillowSatisfaction: 5,
  });
  const [email, setEmail] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const isRetake = searchParams.get('mode') === 'retake';
  const shouldNotifyQuizUpdated = searchParams.get('quizUpdated') === 'true';
  const { addItem } = useCartStore();

  // Account creation state for results page
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get visible questions based on current answers
  const visibleQuestions = getVisibleQuestions(answers);
  const TOTAL_STEPS = visibleQuestions.length + 1; // +1 for email step
  const currentQuestion = step < visibleQuestions.length ? visibleQuestions[step] : null;
  const isEmailStep = step === visibleQuestions.length;
  const isResultsStep = step > visibleQuestions.length;
  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  // Section info for current question
  const sectionInfo = currentQuestion ? getCurrentSectionInfo(currentQuestion.id, answers) : null;

  useEffect(() => {
    trackQuizStarted();
    const loadProducts = async () => {
      try {
        const fetchedProducts = await fetchProducts(50);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };
    loadProducts();
  }, []);

  // Track completed sections
  useEffect(() => {
    if (sectionInfo && sectionInfo.isLastInSection && !completedSections.includes(sectionInfo.sectionIndex)) {
      setCompletedSections(prev => [...prev, sectionInfo.sectionIndex]);
    }
  }, [sectionInfo, completedSections]);

  const handleRadioChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-advance for radio questions
    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (question?.autoAdvance) {
      setTimeout(() => {
        setStep(prev => prev + 1);
      }, 300); // Small delay for visual feedback
    }
  }, []);

  const handleCheckboxChange = useCallback((questionId: string, value: string, maxSelections?: number) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      
      // Handle "none" type options that should clear others
      if (value === "none" || value === "nothing" || value === "alone") {
        if (current.includes(value)) {
          return { ...prev, [questionId]: [] };
        }
        return { ...prev, [questionId]: [value] };
      }
      
      // Remove "none" type values when selecting other options
      const filteredCurrent = current.filter(v => v !== "none" && v !== "nothing" && v !== "alone");
      
      if (filteredCurrent.includes(value)) {
        return { ...prev, [questionId]: filteredCurrent.filter(item => item !== value) };
      }
      
      // Check max selections
      if (maxSelections && filteredCurrent.length >= maxSelections) {
        toast.error(`Maximum ${maxSelections} selections allowed`);
        return prev;
      }
      
      return { ...prev, [questionId]: [...filteredCurrent, value] };
    });
  }, []);

  const handleSliderChange = useCallback((questionId: string, value: number[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value[0] }));
  }, []);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle email input 
  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
  }, []);

  // Check if account exists when user clicks to unlock Sleep Coach
  const handleUnlockSleepCoach = async () => {
    setShowAccountForm(true);
    setIsCheckingAccount(true);
    
    try {
      const { data } = await supabase
        .from('sleep_profiles')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      setAccountExists(!!data);
    } catch (error) {
      console.error("Error checking account:", error);
      setAccountExists(false);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  // Handle login or signup
  const handleAccountSubmit = async () => {
    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (accountExists) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });
        
        if (error) {
          toast.error("Login failed", {
            description: error.message === "Invalid login credentials" 
              ? "Incorrect password. Please try again." 
              : error.message,
          });
          return;
        }
        
        toast.success("Logged in successfully!");
        // Navigate with quizUpdated param if this was a retake
        if (isRetake || shouldNotifyQuizUpdated) {
          navigate('/sleep-coach?quizUpdated=true');
        } else {
          navigate('/sleep-coach');
        }
      } else {
        // Signup
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/sleep-coach${isRetake ? '?quizUpdated=true' : ''}`,
          },
        });
        
        if (error) {
          toast.error("Signup failed", { description: error.message });
          return;
        }
        
        toast.success("Account created!", {
          description: "Redirecting to your Sleep Coach...",
        });
        // Navigate with quizUpdated param if this was a retake
        if (isRetake || shouldNotifyQuizUpdated) {
          navigate('/sleep-coach?quizUpdated=true');
        } else {
          navigate('/sleep-coach');
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        toast.error("Failed to send reset email", { description: error.message });
        return;
      }
      
      toast.success("Password reset email sent!", {
        description: "Check your inbox for a link to reset your password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to send reset email.");
    }
  };
  const canProceed = useCallback(() => {
    if (isEmailStep) {
      // Email step - only require valid email
      return isValidEmail(email);
    }
    
    if (!currentQuestion) return false;
    
    if (currentQuestion.optional) return true;
    
    const answer = answers[currentQuestion.id];
    
    if (currentQuestion.type === "checkbox") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (currentQuestion.type === "slider") {
      return typeof answer === "number";
    }
    return !!answer;
  }, [isEmailStep, currentQuestion, answers, email]);

  const handleNext = () => {
    if (step < visibleQuestions.length) {
      setStep(step + 1);
    } else {
      analyzeQuiz();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Handle continue for checkbox questions
  const handleCheckboxContinue = () => {
    if (canProceed()) {
      setStep(step + 1);
    }
  };

  const buildQuizPayload = (): QuizPayload => {
    return {
      sleepPosition: answers.sleepPosition as string || "",
      movesOften: answers.movesOften as string || "",
      pillowCount: answers.pillowCount as string || "",
      mattressFirmness: answers.mattressFirmness as string || "",
      sleepEquipment: answers.sleepEquipment as string[] || [],
      painAreas: answers.painAreas as string[] || [],
      painSeverity: answers.painSeverity as number || 0,
      nightAwakenings: answers.nightAwakenings as string || "",
      sleepTemperature: answers.sleepTemperature as string || "",
      roomBrightness: answers.roomBrightness as string || "",
      roomNoise: answers.roomNoise as string || "",
      sleepLatency: answers.sleepLatency as string || "",
      sleepHours: answers.sleepHours as string || "",
      eveningScreenUse: answers.eveningScreenUse as string || "",
      ageGroup: answers.ageGroup as string || undefined,
      gender: answers.gender as string || undefined,
      sleepClothing: answers.sleepClothing as string || "",
      coSleeping: answers.coSleeping as string[] || [],
      sleepGoals: answers.sleepGoals as string[] || [],
      snoring: answers.snoring as string || "",
      triedMethods: answers.triedMethods as string[] || [],
      pillowSatisfaction: answers.pillowSatisfaction as number || 0,
      email: email.trim() || undefined,
    };
  };

  const analyzeQuiz = async () => {
    setIsAnalyzing(true);
    const quizPayload = buildQuizPayload();
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-sleep-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ 
            answers: quizPayload,
            email: email.trim() || undefined,
            createProfile: false, // Profile creation happens on account signup
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setResults(data);
      setStep(visibleQuestions.length + 1);

      // Enrich Klaviyo profile if email provided
      if (isValidEmail(email)) {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klaviyo-profile`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ 
                email: email.trim(),
                properties: quizPayload,
              }),
            }
          );
        } catch (e) {
          console.warn("Klaviyo profile enrichment failed:", e);
        }
      }

      if (data.profileCreated) {
        toast.success("Sleep Coach profile created!", {
          description: "Access your personalized AI sleep plan anytime.",
        });
      }
    } catch (error) {
      console.error("Quiz analysis error:", error);
      toast.error("Failed to analyze quiz", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProductByName = (productName: string) => {
    return products.find(p => 
      p.node.title.toLowerCase().includes(productName.toLowerCase().replace('rise by night™ ', ''))
    );
  };

  const handleAddToCart = async (productName: string) => {
    try {
      const product = getProductByName(productName);

      if (!product) {
        toast.error("Product not found");
        return;
      }

      const variant = product.node.variants.edges[0]?.node;
      if (!variant) {
        toast.error("Product variant not available");
        return;
      }

      addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || [],
      });

      toast.success("Added to cart!", {
        description: `${product.node.title} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };


  const contextualInsight = currentQuestion ? getContextualInsight(currentQuestion.id, answers) : null;

  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    
    const { id, type, options, optional, subtitle, maxSelections, min, max, labels } = currentQuestion;
    
    if (type === "radio") {
      const currentValue = answers[id] as string || "";
      return (
        <div className="space-y-3">
          {options?.map((option) => {
            const isSelected = currentValue === option.value;
            
            return (
              <div 
                key={option.value} 
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
                onClick={() => handleRadioChange(id, option.value)}
              >
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className="flex-1 text-base text-foreground">
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (type === "checkbox") {
      const currentAnswers = (answers[id] as string[]) || [];
      const hasSelection = currentAnswers.length > 0;
      
      return (
        <div className="space-y-3">
          {options?.map((option) => {
            const isChecked = currentAnswers.includes(option.value);
            
            return (
              <div 
                key={option.value} 
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isChecked 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
                onClick={() => handleCheckboxChange(id, option.value, maxSelections)}
              >
                <div 
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isChecked 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`}
                >
                  {isChecked && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <span className="flex-1 text-base text-foreground">
                  {option.label}
                </span>
              </div>
            );
          })}
          
          {/* Inline continue button for checkbox */}
          {hasSelection && (
            <Button 
              onClick={handleCheckboxContinue}
              className="w-full mt-4 h-12 rounded-xl"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      );
    }
    
    if (type === "slider") {
      const value = (answers[id] as number) ?? 5;
      return (
        <div className="py-8 px-4">
          <div className="mb-8">
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-primary">{value}</span>
              <span className="text-2xl text-muted-foreground ml-1">/ {max}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={(val) => handleSliderChange(id, val)}
              min={min}
              max={max}
              step={1}
              className="w-full"
            />
          </div>
          {labels && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{labels[min!]}</span>
              <span>{labels[Math.floor((max! - min!) / 2)]}</span>
              <span>{labels[max!]}</span>
            </div>
          )}
          
          {/* Continue button for slider */}
          <Button 
            onClick={handleNext}
            className="w-full mt-6 h-12 rounded-xl"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Moon className="w-4 h-4" />
              Research-Based Assessment
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Sleep Assessment Quiz</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Answer these questions to receive personalized product recommendations and unlock your AI Sleep Coach.
            </p>
          </div>

          {/* Section-based Progress */}
          {!isResultsStep && (
            <div className="mb-8">
              {/* Section indicator */}
              {sectionInfo && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">
                      Step {sectionInfo.sectionIndex + 1} of 5
                    </span>
                    <span className="text-sm text-muted-foreground">—</span>
                    <span className="text-sm font-medium text-foreground">
                      {sectionInfo.sectionName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
                </div>
              )}
              
              {isEmailStep && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">Step 5 of 5</span>
                    <span className="text-sm text-muted-foreground">—</span>
                    <span className="text-sm font-medium text-foreground">Personal details & plan delivery</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
                </div>
              )}
              
              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              {/* Section completion indicators */}
              <div className="flex justify-between mt-3">
                {SECTIONS.slice(0, 5).map((section, idx) => (
                  <div key={section.id} className="flex items-center gap-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      completedSections.includes(idx) 
                        ? "bg-success text-success-foreground" 
                        : sectionInfo?.sectionIndex === idx 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground"
                    }`}>
                      {completedSections.includes(idx) ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Progress microcopy */}
              <p className="text-sm text-muted-foreground text-center mt-4">
                {getProgressMicrocopy(progressPercent)}
              </p>
            </div>
          )}

          {/* Main Card */}
          <Card className="p-6 md:p-8 shadow-lg border-border/50 backdrop-blur-sm">
            {/* Question Steps */}
            {currentQuestion && !isAnalyzing && (
              <div className="space-y-6">
                {/* Question Header with Tooltip */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                      {currentQuestion.question}
                      {currentQuestion.optional && (
                        <span className="text-muted-foreground text-sm font-normal ml-2">(optional)</span>
                      )}
                    </h2>
                    {currentQuestion.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{currentQuestion.subtitle}</p>
                    )}
                  </div>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                        <Info className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      className="max-w-xs p-4 text-sm bg-popover border border-border shadow-lg"
                      sideOffset={8}
                    >
                      <p className="font-medium text-popover-foreground mb-1">Why we ask this</p>
                      <p className="text-popover-foreground/80 leading-relaxed">
                        {currentQuestion.tooltip}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Question Content */}
                <div className="min-h-[200px]">
                  {renderQuestionContent()}
                </div>
                
                {/* Contextual insight */}
                {contextualInsight && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-sm text-primary">{contextualInsight}</p>
                  </div>
                )}
              </div>
            )}

            {/* Email Step - Simple Email Only */}
            {isEmailStep && !isAnalyzing && (
              <div className="space-y-6">
                {/* Plan building banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Your plan is being created</p>
                    <p className="text-xs text-muted-foreground">Just enter your email to see your personalized results.</p>
                  </div>
                </div>
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                      Where should we send your results?
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      We'll show you your personalized sleep assessment and product recommendations right away.
                    </p>
                  </div>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                        <Info className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      className="max-w-xs p-4 text-sm bg-popover border border-border shadow-lg"
                      sideOffset={8}
                    >
                      <p className="font-medium text-popover-foreground mb-1">Why we ask this</p>
                      <p className="text-popover-foreground/80 leading-relaxed">
                        Your email helps us save your assessment and send personalized sleep tips. We never spam.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="pl-12 h-14 text-base rounded-xl border-border focus:border-primary"
                    />
                  </div>
                  
                  {/* What they'll get */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-3">You'll instantly receive:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Your personalized sleep assessment</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Product recommendations for your profile</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Sleep quality scores & expert insights</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  By continuing, you agree to receive personalized sleep tips and product recommendations. Unsubscribe anytime.
                </p>
              </div>
            )}

            {/* Results Step - Expert-Level Assessment */}
            {isResultsStep && results && (
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Personalized Sleep Assessment</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Based on your answers, we analyzed your pain profile, sleep position, and environment.
                  </p>
                </div>

                {/* Section 1: What We Detected - Plain + Clinical */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold">What We Detected</h3>
                  </div>
                  <Card className="p-5 bg-amber-500/5 border-amber-500/20">
                    <ul className="space-y-4">
                      {(results.detectedIssues || deriveDetectedIssues(answers)).slice(0, 3).map((issue, idx) => {
                        const presentation = convertToIssuePresentation(issue);
                        return (
                          <li key={idx} className="space-y-1">
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                              <span className="text-foreground text-sm font-medium">{presentation.plain}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-4">{presentation.clinical}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </div>

                {/* Section 2: Expert Interpretation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Expert Interpretation</h3>
                  </div>
                  <Card className="p-5 bg-primary/5 border-primary/20">
                    <p className="text-foreground leading-relaxed">
                      {results.expertSummary || results.assessment}
                    </p>
                    {results.alignmentInsights && results.alignmentInsights.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-primary/10">
                        <p className="text-sm font-medium text-primary mb-2">Alignment Insights:</p>
                        <ul className="space-y-1">
                          {results.alignmentInsights.map((insight, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Check className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Section 3: Sleep Quality Scores with Labels */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <Moon className="w-4 h-4 text-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">Sleep Quality Analysis</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(() => {
                      const scores = results.scores || calculateDerivedScores(answers);
                      const alignmentLabel = getScoreLabel(scores.alignmentScore ?? 0);
                      const environmentLabel = getScoreLabel(scores.environmentScore ?? 0);
                      const consistencyLabel = getScoreLabel(scores.consistencyScore ?? 0);
                      
                      return (
                        <>
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Alignment</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary ${alignmentLabel.color}`}>
                                {alignmentLabel.label}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-primary mb-1">
                              {scores.alignmentScore ?? 0}
                              <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                              <div 
                                className="bg-primary h-full rounded-full transition-all" 
                                style={{ width: `${scores.alignmentScore ?? 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getScoreExplanation("alignment", scores.alignmentScore ?? 0)}
                            </p>
                          </Card>
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Environment</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary ${environmentLabel.color}`}>
                                {environmentLabel.label}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-primary mb-1">
                              {scores.environmentScore ?? 0}
                              <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                              <div 
                                className="bg-primary h-full rounded-full transition-all" 
                                style={{ width: `${scores.environmentScore ?? 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getScoreExplanation("environment", scores.environmentScore ?? 0)}
                            </p>
                          </Card>
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Consistency</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary ${consistencyLabel.color}`}>
                                {consistencyLabel.label}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-primary mb-1">
                              {scores.consistencyScore ?? 0}
                              <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                              <div 
                                className="bg-primary h-full rounded-full transition-all" 
                                style={{ width: `${scores.consistencyScore ?? 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getScoreExplanation("consistency", scores.consistencyScore ?? 0)}
                            </p>
                          </Card>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Section 4: Recommended Products */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold">Recommended Solutions</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on your assessment, these products address your specific sleep quality factors.
                  </p>
                  <div className="space-y-4">
                    {results.recommendations.map((rec, index) => {
                      const product = getProductByName(rec.product);
                      const productImage = product?.node.images?.edges?.[0]?.node.url;
                      const clinicalDescription = getClinicalProductDescription(rec.product, answers.sleepPosition as string);
                      const productReasons = getProductReasons(rec.product, answers);
                      
                      return (
                        <Card key={index} className="p-5 hover:shadow-md transition-shadow overflow-hidden">
                          <div className="flex items-start gap-4">
                            {productImage && (
                              <div className="w-24 h-24 flex-shrink-0 bg-secondary/30 rounded-lg overflow-hidden">
                                <img
                                  src={productImage}
                                  alt={rec.product}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-base leading-tight">{rec.product}</h4>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full flex-shrink-0 ${
                                  rec.priority === 'high' 
                                    ? 'bg-success/10 text-success' 
                                    : rec.priority === 'medium' 
                                      ? 'bg-primary/10 text-primary' 
                                      : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {rec.priority} priority
                                </span>
                              </div>
                              
                              {/* Because you... section */}
                              {productReasons.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Because you:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    {productReasons.map((reason, rIdx) => (
                                      <li key={rIdx}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                                {clinicalDescription}
                              </p>
                              <Button
                                onClick={() => handleAddToCart(rec.product)}
                                size="sm"
                                className="rounded-lg"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Add to Cart
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Section 5: Bundle Recommendation */}
                {results.bundleRecommended && (
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Complete Sleep Setup for You</h4>
                        <p className="text-muted-foreground text-sm mb-4">
                          {results.bundleReason || "This comprehensive setup addresses multiple factors identified in your assessment."}
                        </p>
                        <div className="mb-4 p-3 bg-background/50 rounded-lg">
                          <p className="text-xs font-medium text-foreground mb-2">This setup addresses:</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Cervical Support</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Spinal Alignment</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Light Control</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddToCart("Complete Sleep Bundle")}
                          className="w-full rounded-lg"
                          size="lg"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add Complete Sleep Bundle
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Section 6: Sleep Coach CTA - Always show with inline account creation */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/30">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Moon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">
                        {results.profileCreated ? "Your AI Sleep Coach Is Ready" : "Unlock Your AI Sleep Coach"}
                      </h4>
                      <p className="text-muted-foreground text-sm mb-4">
                        {results.profileCreated 
                          ? `We've used your ${visibleQuestions.length}-point assessment and your profile as a ${(answers.sleepPosition as string) || 'combination'} sleeper${(answers.painAreas as string[])?.filter(p => p !== 'none').length > 0 ? ` with ${(answers.painAreas as string[])[0]?.replace('_', ' ')} concerns` : ''} to prepare a personalized 7-day sleep improvement plan.`
                          : `Based on your ${visibleQuestions.length}-point assessment as a ${(answers.sleepPosition as string) || 'combination'} sleeper, we've prepared a personalized 7-day sleep improvement plan. Create a free account to access it.`
                        }
                      </p>
                      
                      {results.profileCreated ? (
                        <Button
                          onClick={() => navigate(isRetake || shouldNotifyQuizUpdated ? '/sleep-coach?quizUpdated=true' : '/sleep-coach')}
                          className="w-full rounded-lg"
                          size="lg"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Continue to My Sleep Coach
                        </Button>
                      ) : !showAccountForm ? (
                        <Button 
                          onClick={handleUnlockSleepCoach}
                          className="w-full rounded-lg"
                          size="lg"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock Sleep Coach
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          {isCheckingAccount ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="ml-2 text-sm text-muted-foreground">Checking account...</span>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                <p className="text-sm font-medium text-foreground mb-1">
                                  {accountExists ? "Welcome back!" : "Create your account"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {accountExists 
                                    ? `Enter your password to access your Sleep Coach (${email})`
                                    : `Enter a password to create your account (${email})`
                                  }
                                </p>
                              </div>
                              
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={accountExists ? "Enter your password" : "Create a password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAccountSubmit()}
                                  className="pl-12 pr-12 h-12 text-base rounded-lg border-border"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                              
                              {!accountExists && password && (
                                <PasswordStrengthIndicator password={password} />
                              )}
                              
                              <Button 
                                onClick={handleAccountSubmit}
                                disabled={isSubmitting || !password.trim()}
                                className="w-full rounded-lg"
                                size="lg"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {accountExists ? "Logging in..." : "Creating account..."}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {accountExists ? "Login & Access Sleep Coach" : "Create Account & Continue"}
                                  </>
                                )}
                              </Button>
                              
                              {accountExists && (
                                <button
                                  type="button"
                                  onClick={handleForgotPassword}
                                  className="w-full text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                                >
                                  Forgot password?
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAccountForm(false);
                                  setPassword("");
                                  setAccountExists(null);
                                }}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1 rounded-lg">
                    Back to Home
                  </Button>
                  {!results.profileCreated && (
                    <Button onClick={() => navigate("/product/ergonomic-pillow")} className="flex-1 rounded-lg">
                      View Products
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <Moon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-lg font-semibold mt-6">Analyzing your sleep profile...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Creating personalized recommendations based on your answers
                </p>
              </div>
            )}

            {/* Navigation Buttons - Only for non-auto-advance questions */}
            {!isResultsStep && !isAnalyzing && (
              <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  disabled={step === 0}
                  className="flex-1 h-12 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {/* Only show Next button for email step or if question doesn't auto-advance */}
                {(isEmailStep || (currentQuestion && (currentQuestion.type === "checkbox" || currentQuestion.type === "slider"))) ? null : (
                  currentQuestion?.optional && (
                    <Button
                      onClick={handleNext}
                      variant="ghost"
                      className="flex-1 h-12 rounded-xl"
                    >
                      Skip
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )
                )}
                {isEmailStep && (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="flex-1 h-12 rounded-xl"
                  >
                    See My Results
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Trust Indicators */}
          {!isResultsStep && (
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Science-backed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Private & secure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>2-minute completion</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SleepQuiz;
