export interface QuizPayload {
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

export interface ProductRecommendation {
  product: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface SleepScores {
  alignmentScore: number;
  environmentScore: number;
  consistencyScore: number;
}

// ============ NEW: Structured Assessment Types ============

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

// ============ Legacy Types ============

export interface AnalysisResult {
  assessment: string | SleepAssessment;
  recommendations: ProductRecommendation[];
  bundleRecommended: boolean;
  bundleReason?: string;
  profileCreated?: boolean;
  profileUpdated?: boolean;
  detectedIssues?: string[];
  alignmentInsights?: string[];
  scores?: SleepScores;
  expertSummary?: string;
}

export interface IssuePresentation {
  plain: string;
  clinical: string;
}
