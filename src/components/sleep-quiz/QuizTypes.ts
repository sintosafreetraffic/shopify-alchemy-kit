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

export interface AnalysisResult {
  assessment: string;
  recommendations: ProductRecommendation[];
  bundleRecommended: boolean;
  bundleReason?: string;
  profileCreated?: boolean;
  detectedIssues?: string[];
  alignmentInsights?: string[];
  scores?: SleepScores;
  expertSummary?: string;
}

export interface IssuePresentation {
  plain: string;
  clinical: string;
}
