/**
 * Sleep Quiz Configuration v9
 * 
 * Psychology-first question design optimized for persona detection.
 * All answer values MUST match backend expectations in sleep-assessment.ts.
 * 
 * Design principles:
 * - Calm, Scandinavian tone
 * - Science-backed but non-medical language
 * - Clear behavioral/psychological signals for persona detection
 */

// Section configuration for grouped perception
export const SECTIONS = [
  { 
    id: "sleep_habits", 
    name: "Your sleep style", 
    description: "Understanding how you naturally sleep",
    questions: ["sleepPosition", "movesOften", "pillowCount", "mattressFirmness", "sleepEquipment"]
  },
  { 
    id: "pain_profile", 
    name: "Physical comfort", 
    description: "Identifying tension and alignment patterns",
    questions: ["painAreas", "painSeverity", "nightAwakenings"]
  },
  { 
    id: "pillow_problems", 
    name: "Current setup", 
    description: "What's working and what isn't",
    questions: ["triedMethods", "pillowSatisfaction", "snoring"]
  },
  { 
    id: "environment", 
    name: "Sleep environment", 
    description: "Your bedroom conditions and evening patterns",
    questions: ["sleepTemperature", "roomBrightness", "roomNoise", "sleepLatency", "sleepHours", "eveningScreenUse", "sleepClothing"]
  },
  { 
    id: "personal", 
    name: "Goals & preferences", 
    description: "Tailoring your personalized recommendations",
    questions: ["ageGroup", "gender", "coSleeping", "sleepGoals", "email"]
  },
];

/**
 * Quiz Questions v9
 * 
 * Each question is designed to reveal psychological patterns for persona detection:
 * - Pain Sleeper: Physical discomfort, alignment issues, morning stiffness
 * - Stress & Environment Sleeper: Wind-down difficulty, environmental sensitivity, racing mind
 * - Recovery Sleeper: Performance focus, training recovery, wearable use
 * - Optimizer: Multiple goals, data-driven, improvement mindset
 */
export const QUIZ_QUESTIONS = [
  // === SECTION 1: SLEEP HABITS ===
  {
    id: "sleepPosition",
    question: "What's your primary sleep position?",
    tooltip: "Your sleep position determines optimal pillow height and cervical support needs.",
    type: "radio" as const,
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
    question: "How often do you change positions during the night?",
    tooltip: "Frequent repositioning often indicates your body is searching for comfort or proper support.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "never", label: "Rarely — I stay in one position" },
      { value: "sometimes", label: "Sometimes — A few times per night" },
      { value: "often", label: "Often — I toss and turn frequently" },
      { value: "always", label: "Almost always — I can't seem to settle" },
    ],
  },
  {
    id: "pillowCount",
    question: "How many pillows do you currently sleep with?",
    tooltip: "Using multiple pillows often indicates your primary pillow isn't providing adequate support.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "0", label: "No pillow — I sleep flat" },
      { value: "1", label: "1 pillow" },
      { value: "2", label: "2 pillows" },
      { value: "3", label: "3 pillows" },
      { value: "3+", label: "More than 3" },
    ],
  },
  {
    id: "mattressFirmness",
    question: "How would you describe your mattress?",
    tooltip: "Mattress firmness affects shoulder compression and the ideal pillow height for spinal alignment.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "soft", label: "Soft — I sink in noticeably" },
      { value: "medium", label: "Medium — Balanced support and comfort" },
      { value: "firm", label: "Firm — Minimal sinking" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "sleepEquipment",
    question: "What sleep equipment do you currently use?",
    tooltip: "Understanding your current setup helps us identify what's working and what needs improvement.",
    type: "checkbox" as const,
    options: [
      { value: "regular_pillow", label: "Standard pillow" },
      { value: "contour_pillow", label: "Contour/ergonomic pillow" },
      { value: "knee_pillow", label: "Knee pillow" },
      { value: "body_pillow", label: "Body pillow" },
      { value: "sleep_mask", label: "Sleep mask" },
      { value: "white_noise", label: "White noise or sound machine" },
      { value: "weighted_blanket", label: "Weighted blanket" },
      { value: "oura", label: "Oura Ring" },
      { value: "whoop", label: "WHOOP band" },
      { value: "fitness_tracker", label: "Fitness tracker" },
      { value: "smart_watch", label: "Smart watch" },
      { value: "none", label: "None of these" },
    ],
  },

  // === SECTION 2: PAIN PROFILE ===
  {
    id: "painAreas",
    question: "Where do you experience tension or discomfort?",
    tooltip: "Different tension patterns reveal different alignment needs and help us personalize your support.",
    type: "checkbox" as const,
    options: [
      { value: "neck", label: "Neck" },
      { value: "upper_back", label: "Upper back" },
      { value: "shoulders", label: "Shoulders" },
      { value: "lower_back", label: "Lower back" },
      { value: "hips", label: "Hips" },
      { value: "headaches", label: "Morning headaches" },
      { value: "none", label: "No significant tension" },
    ],
  },
  {
    id: "painSeverity",
    question: "How would you rate your morning discomfort on average?",
    tooltip: "Understanding severity helps us assess the impact on your sleep quality and recovery.",
    type: "slider" as const,
    min: 0,
    max: 10,
    labels: { 0: "None", 5: "Moderate", 10: "Significant" },
    showIf: (answers: Record<string, unknown>) => {
      const painAreas = answers.painAreas as string[] || [];
      return painAreas.length > 0 && !painAreas.includes("none");
    },
  },
  {
    id: "nightAwakenings",
    question: "How often do you wake up during the night?",
    tooltip: "Night awakenings can indicate discomfort, temperature issues, or environmental disruptions.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "rarely", label: "Once per night on occasion" },
      { value: "once", label: "Once per night regularly" },
      { value: "twice", label: "2-3 times per night" },
      { value: "frequently", label: "4 or more times per night" },
    ],
  },

  // === SECTION 3: CURRENT SETUP ===
  {
    id: "triedMethods",
    question: "What have you tried to improve your sleep?",
    tooltip: "This helps us understand your sleep improvement journey and avoid repeating what hasn't worked.",
    type: "checkbox" as const,
    options: [
      { value: "new_mattress", label: "New mattress" },
      { value: "new_pillow", label: "New pillow(s)" },
      { value: "sleep_apps", label: "Sleep tracking apps" },
      { value: "supplements", label: "Sleep supplements" },
      { value: "meditation", label: "Meditation or breathing exercises" },
      { value: "routine_changes", label: "Changed my bedtime routine" },
      { value: "nothing", label: "Haven't tried much yet" },
    ],
  },
  {
    id: "pillowSatisfaction",
    question: "How satisfied are you with your current pillow?",
    tooltip: "This establishes a baseline for measuring improvement.",
    type: "slider" as const,
    min: 0,
    max: 10,
    labels: { 0: "Very unsatisfied", 5: "Neutral", 10: "Very satisfied" },
  },
  {
    id: "snoring",
    question: "Do you snore or have been told you snore?",
    tooltip: "Snoring can indicate airway positioning issues that proper pillow support may help address.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "never", label: "Never or rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often — Several nights a week" },
      { value: "always", label: "Most nights" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },

  // === SECTION 4: ENVIRONMENT ===
  {
    id: "sleepTemperature",
    question: "How does temperature affect your sleep?",
    tooltip: "Temperature regulation is one of the most significant factors in sleep quality and continuity.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "hot", label: "I often sleep too warm" },
      { value: "cold", label: "I often feel too cold" },
      { value: "neutral", label: "Temperature is usually comfortable" },
    ],
  },
  {
    id: "roomBrightness",
    question: "How dark is your sleep environment?",
    tooltip: "Light exposure affects melatonin production and can significantly impact sleep depth.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "dark", label: "Very dark — Complete darkness" },
      { value: "dim", label: "Somewhat dark — Some ambient light" },
      { value: "bright", label: "Light comes in — Street lights or early sun" },
    ],
  },
  {
    id: "roomNoise",
    question: "How quiet is your bedroom?",
    tooltip: "Background noise can cause micro-awakenings that reduce sleep quality without full waking.",
    type: "radio" as const,
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
    tooltip: "Sleep onset time reveals how well your mind and body transition into rest mode.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "quick", label: "Under 15 minutes" },
      { value: "normal", label: "15-30 minutes" },
      { value: "slow", label: "30-60 minutes" },
      { value: "very_slow", label: "Over an hour" },
    ],
  },
  {
    id: "sleepHours",
    question: "How many hours of sleep do you typically get?",
    tooltip: "Understanding your sleep duration helps calibrate recovery recommendations.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "less_than_5", label: "Under 5 hours" },
      { value: "5_6", label: "5-6 hours" },
      { value: "6_7", label: "6-7 hours" },
      { value: "7_8", label: "7-8 hours" },
      { value: "over_8", label: "Over 8 hours" },
    ],
  },
  {
    id: "eveningScreenUse",
    question: "Do you use screens within an hour of bedtime?",
    tooltip: "Screen use before bed affects your natural sleep-wake cycle and wind-down process.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "sometimes", label: "Sometimes — A few times a week" },
      { value: "often", label: "Often — Most nights" },
      { value: "always", label: "Always — Right up until I sleep" },
    ],
  },
  {
    id: "sleepClothing",
    question: "What do you typically wear to bed?",
    tooltip: "This helps us understand your temperature regulation patterns.",
    type: "radio" as const,
    autoAdvance: true,
    options: [
      { value: "minimal", label: "Minimal — Light or nothing" },
      { value: "light", label: "Light — T-shirt and shorts" },
      { value: "moderate", label: "Moderate — Pajamas" },
      { value: "heavy", label: "Warm layers" },
    ],
  },

  // === SECTION 5: GOALS & PREFERENCES ===
  {
    id: "ageGroup",
    question: "What is your age range?",
    tooltip: "Sleep needs and patterns naturally evolve with age. This is optional.",
    type: "radio" as const,
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
    tooltip: "Body structure affects pillow height recommendations. You may skip this.",
    type: "radio" as const,
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
    id: "coSleeping",
    question: "Who shares your sleep space?",
    tooltip: "Co-sleeping can affect movement patterns and environmental needs.",
    type: "checkbox" as const,
    options: [
      { value: "alone", label: "I sleep alone" },
      { value: "partner", label: "Partner" },
      { value: "child", label: "Child or children" },
      { value: "pet", label: "Pet(s)" },
    ],
  },
  {
    id: "sleepGoals",
    question: "What matters most to you about your sleep?",
    tooltip: "Your priorities shape your personalized plan and product recommendations.",
    type: "checkbox" as const,
    maxSelections: 3,
    subtitle: "Select up to 3",
    options: [
      // Pain & Alignment goals
      { value: "reduce_pain", label: "Reduce tension and discomfort" },
      { value: "better_posture", label: "Improve spinal alignment" },
      // Sleep quality goals
      { value: "better_quality", label: "Better overall sleep quality" },
      { value: "fall_asleep_faster", label: "Fall asleep more easily" },
      { value: "stay_asleep", label: "Stay asleep through the night" },
      // Energy & Recovery goals
      { value: "wake_refreshed", label: "Wake up feeling refreshed" },
      { value: "more_energy", label: "Have more daytime energy" },
      { value: "faster_recovery", label: "Faster physical recovery" },
      { value: "better_recovery", label: "Better muscle recovery" },
      { value: "muscle_repair", label: "Optimize muscle repair" },
    ],
  },
];

export type QuizQuestion = typeof QUIZ_QUESTIONS[number];
export type QuizAnswers = Record<string, string | string[] | number>;
