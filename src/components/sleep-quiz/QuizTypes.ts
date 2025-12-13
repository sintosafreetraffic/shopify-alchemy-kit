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

// Legacy persona types (backwards compatibility)
export type LegacyPersona = "jason" | "mila" | "leo";

// New persona system with clearer naming (v7: added recovery_sleeper)
export type PersonaCluster = "pain_sleeper" | "stress_insomnia" | "optimizer" | "recovery_sleeper";

// Keep SleepPersona for backward compatibility
export type SleepPersona = LegacyPersona;

// Core need for Klaviyo segmentation (v7: added recovery)
export type CoreNeed = "alignment" | "environment" | "optimization" | "recovery";

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
 * Persona definitions for frontend display
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

// Core need mapping helper (v7: added recovery_sleeper)
export const CORE_NEED_MAP: Record<PersonaCluster, CoreNeed> = {
  pain_sleeper: "alignment",
  stress_insomnia: "environment",
  optimizer: "optimization",
  recovery_sleeper: "recovery",
};

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
  guess: SleepPersona;         // jason | mila | leo (legacy)
  rationale: string;
  // Enhanced persona fields
  cluster: PersonaCluster;
  name?: string;            // INTERNAL ONLY - Human name for Klaviyo (optional)
  label: string;            // Customer-facing label (e.g., "Pain Sleeper")
  description: string;
  recommended_modules: number[];
  legacyType: LegacyPersona;
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
  persona_reasoning: string; // Why this recommendation matches the persona
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
  top_risk_drivers: string[];
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
