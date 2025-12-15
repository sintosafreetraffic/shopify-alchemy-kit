/**
 * Persona Detection Test Fixtures v9
 * 
 * These fixtures verify that the psychology-first persona detection
 * correctly identifies each archetype based on quiz answers.
 * 
 * BACKEND VALUE CONTRACTS (from sleep-assessment.ts):
 * 
 * sleepPosition:     "side" | "back" | "stomach" | "combination"
 * movesOften:        "never" | "sometimes" | "often" | "always"
 * pillowCount:       "0" | "1" | "2" | "3" | "3+"
 * painAreas:         "neck" | "upper_back" | "shoulders" | "lower_back" | "hips" | "headaches" | "none"
 * painSeverity:      0-10 (number)
 * nightAwakenings:   "never" | "rarely" | "once" | "twice" | "frequently"
 * sleepTemperature:  "hot" | "cold" | "neutral"
 * roomBrightness:    "dark" | "dim" | "bright"
 * roomNoise:         "quiet" | "some" | "noisy"
 * sleepLatency:      "quick" | "normal" | "slow" | "very_slow"
 * sleepHours:        "less_than_5" | "5_6" | "6_7" | "7_8" | "over_8"
 * eveningScreenUse:  "never" | "sometimes" | "often" | "always"
 * sleepGoals:        "reduce_pain" | "better_posture" | "better_quality" | "fall_asleep_faster" | 
 *                    "stay_asleep" | "wake_refreshed" | "more_energy" | "faster_recovery" | 
 *                    "better_recovery" | "muscle_repair"
 * sleepEquipment:    "oura" | "whoop" | "fitness_tracker" | "smart_watch" | ...
 * pillowSatisfaction: 0-10 (number)
 * mattressFirmness:  "soft" | "medium" | "firm" | "unsure"
 */

import type { QuizPayload } from '@/components/sleep-quiz/QuizTypes';

// ============ BASE FIXTURE ============

/**
 * Base answers with neutral defaults (should not strongly trigger any persona)
 */
const baseAnswers: QuizPayload = {
  sleepPosition: 'side',
  movesOften: 'sometimes',
  pillowCount: '1',
  mattressFirmness: 'medium',
  sleepEquipment: [],
  painAreas: [],
  painSeverity: 3,
  nightAwakenings: 'rarely',
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'normal',
  sleepHours: '7_8',
  eveningScreenUse: 'sometimes',
  sleepClothing: 'light',
  coSleeping: [],
  sleepGoals: [],
  snoring: 'never',
  triedMethods: [],
  pillowSatisfaction: 5,
};

// ============ CLEAR ARCHETYPE FIXTURES ============

/**
 * PAIN SLEEPER (Jason) - Clear archetype
 * 
 * Backend signals that should fire:
 * - hasNeckPain: true (painAreas includes "neck")
 * - hasShoulderPain: true (painAreas includes "shoulders")
 * - hasLowerBackPain: true (painAreas includes "lower_back")
 * - hasHighPainSeverity: true (painSeverity >= 6)
 * - hasLowPillowSatisfaction: true (pillowSatisfaction <= 4)
 * - hasPainReductionGoal: true (sleepGoals includes "reduce_pain")
 * - hasPostureGoal: true (sleepGoals includes "better_posture")
 * - hasMorningStiffnessPattern: true (movesOften === "often" && hasPain)
 */
export const painSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  movesOften: 'often',
  pillowCount: '1',
  mattressFirmness: 'medium',
  painAreas: ['neck', 'shoulders', 'lower_back'],
  painSeverity: 7,
  pillowSatisfaction: 2,
  sleepGoals: ['reduce_pain', 'better_posture', 'wake_refreshed'],
  nightAwakenings: 'once',
  sleepEquipment: ['regular_pillow'],
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'normal',
  sleepHours: '7_8',
  eveningScreenUse: 'sometimes',
};

/**
 * STRESS & ENVIRONMENT SLEEPER (Mila) - Clear archetype
 * 
 * Backend signals that should fire:
 * - hasBrightRoom: true (roomBrightness === "bright")
 * - hasSleepHot: true (sleepTemperature === "hot")
 * - hasFrequentAwakenings: true (nightAwakenings === "frequently")
 * - hasVerySlowSleepOnset: true (sleepLatency === "very_slow")
 * - hasHighScreenUse: true (eveningScreenUse === "always")
 * - hasNoisyEnvironment: true (roomNoise === "noisy")
 * - hasStayAsleepGoal: true (sleepGoals includes "stay_asleep")
 * - hasFallAsleepFasterGoal: true (sleepGoals includes "fall_asleep_faster")
 * - hasRacingMindPattern: true (latency + screen use combo)
 * - hasRestlessWithoutPain: true (movesOften && !hasPain)
 */
export const stressSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  movesOften: 'often',
  pillowCount: '1',
  mattressFirmness: 'medium',
  painAreas: [],
  painSeverity: 1,
  pillowSatisfaction: 5,
  sleepGoals: ['fall_asleep_faster', 'stay_asleep', 'better_quality'],
  nightAwakenings: 'frequently',
  sleepEquipment: [],
  sleepTemperature: 'hot',
  roomBrightness: 'bright',
  roomNoise: 'noisy',
  sleepLatency: 'very_slow',
  sleepHours: '5_6',
  eveningScreenUse: 'always',
};

/**
 * RECOVERY SLEEPER (Riley) - Clear archetype
 * 
 * Backend signals that should fire:
 * - hasRecoveryGoal: true (sleepGoals includes recovery goals)
 * - hasWakeRefreshedGoal: true (sleepGoals includes "wake_refreshed")
 * - hasMoreEnergyGoal: true (sleepGoals includes "more_energy")
 * - usesWearables: true (sleepEquipment includes "oura"/"whoop")
 * - hasMultiplePerformanceGoals: true (3+ performance goals)
 * - hasLowPainBaseline: true (painSeverity <= 3 && !hasPain)
 * - hasGoodSleepStability: true (nightAwakenings === "rarely")
 */
export const recoverySleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  movesOften: 'sometimes',
  pillowCount: '1',
  mattressFirmness: 'firm',
  painAreas: [],
  painSeverity: 1,
  pillowSatisfaction: 6,
  sleepGoals: ['faster_recovery', 'muscle_repair', 'more_energy', 'wake_refreshed'],
  nightAwakenings: 'rarely',
  sleepEquipment: ['whoop', 'oura'],
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'quick',
  sleepHours: '7_8',
  eveningScreenUse: 'sometimes',
};

/**
 * OPTIMIZER (Leo) - Clear archetype
 * 
 * Backend signals that should fire:
 * - hasBetterQualityGoal: true (sleepGoals includes "better_quality")
 * - hasMultipleGoals: true (sleepGoals.length >= 3)
 * - hasHighPillowSatisfaction: true (pillowSatisfaction >= 7)
 * - hasQuickSleepOnset: true (sleepLatency === "quick")
 * - hasMinimalIssues: true (low pain, optimal env, stable sleep)
 */
export const optimizerFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'combination',
  movesOften: 'sometimes',
  pillowCount: '1',
  mattressFirmness: 'medium',
  painAreas: [],
  painSeverity: 1,
  pillowSatisfaction: 8,
  sleepGoals: ['better_quality', 'more_energy', 'wake_refreshed', 'better_posture'],
  nightAwakenings: 'never',
  sleepEquipment: ['fitness_tracker'],
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'quick',
  sleepHours: '7_8',
  eveningScreenUse: 'never',
};

// ============ MIXED SIGNALS FIXTURE ============

/**
 * MIXED SIGNALS - Ambiguous case
 * 
 * Has moderate pain AND moderate environment issues.
 * Should result in lower confidence (<70) and reasoning mentioning "mixed" or "balanced".
 */
export const mixedSignalsFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  movesOften: 'sometimes',
  pillowCount: '2',
  mattressFirmness: 'soft',
  painAreas: ['neck'],
  painSeverity: 4,
  pillowSatisfaction: 4,
  sleepGoals: ['reduce_pain', 'stay_asleep'],
  nightAwakenings: 'twice',
  sleepEquipment: [],
  sleepTemperature: 'hot',
  roomBrightness: 'dim',
  roomNoise: 'some',
  sleepLatency: 'slow',
  sleepHours: '6_7',
  eveningScreenUse: 'often',
};

// ============ EXPECTED OUTCOMES ============

export type PersonaCluster = 'pain_sleeper' | 'stress_insomnia' | 'optimizer' | 'recovery_sleeper';
export type CoreNeed = 'alignment' | 'environment' | 'optimization' | 'recovery';

interface ClearArchetypeExpectation {
  cluster: PersonaCluster;
  minConfidence: number;
  coreNeed: CoreNeed;
  keySignals: string[];
}

interface MixedSignalsExpectation {
  possibleClusters: readonly PersonaCluster[];
  maxConfidence: number;
  confidenceReasoningMustContain: readonly string[];
}

export const expectedOutcomes: {
  painSleeper: ClearArchetypeExpectation;
  stressSleeper: ClearArchetypeExpectation;
  recoverySleeper: ClearArchetypeExpectation;
  optimizer: ClearArchetypeExpectation;
  mixedSignals: MixedSignalsExpectation;
} = {
  painSleeper: {
    cluster: 'pain_sleeper',
    minConfidence: 70,
    coreNeed: 'alignment',
    keySignals: [
      'hasNeckPain',
      'hasShoulderPain',
      'hasLowerBackPain',
      'hasHighPainSeverity',
      'hasLowPillowSatisfaction',
      'hasPainReductionGoal',
      'hasPostureGoal',
      'hasMorningStiffnessPattern',
    ],
  },
  stressSleeper: {
    cluster: 'stress_insomnia',
    minConfidence: 70,
    coreNeed: 'environment',
    keySignals: [
      'hasBrightRoom',
      'hasSleepHot',
      'hasFrequentAwakenings',
      'hasVerySlowSleepOnset',
      'hasHighScreenUse',
      'hasNoisyEnvironment',
      'hasStayAsleepGoal',
      'hasFallAsleepFasterGoal',
      'hasRacingMindPattern',
    ],
  },
  recoverySleeper: {
    cluster: 'recovery_sleeper',
    minConfidence: 70,
    coreNeed: 'recovery',
    keySignals: [
      'hasRecoveryGoal',
      'hasWakeRefreshedGoal',
      'hasMoreEnergyGoal',
      'usesWearables',
      'hasMultiplePerformanceGoals',
      'hasLowPainBaseline',
      'hasGoodSleepStability',
    ],
  },
  optimizer: {
    cluster: 'optimizer',
    minConfidence: 70,
    coreNeed: 'optimization',
    keySignals: [
      'hasBetterQualityGoal',
      'hasMultipleGoals',
      'hasHighPillowSatisfaction',
      'hasQuickSleepOnset',
      'hasMinimalIssues',
    ],
  },
  mixedSignals: {
    possibleClusters: ['pain_sleeper', 'stress_insomnia'] as const,
    maxConfidence: 65,
    confidenceReasoningMustContain: ['mixed', 'balanced', 'multiple', 'competing'],
  },
};

// ============ TEST RUNNER ============

interface PersonaResult {
  cluster: string;
  confidence: number;
  core_need?: string;
  confidence_reasoning?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Assert clear archetype detection
 */
export function assertClearArchetype(
  result: PersonaResult,
  expected: ClearArchetypeExpectation,
  fixtureName: string
): TestResult {
  // Check cluster match
  if (result.cluster !== expected.cluster) {
    return {
      name: fixtureName,
      passed: false,
      message: `Cluster mismatch: expected "${expected.cluster}", got "${result.cluster}"`,
      details: { result, expected },
    };
  }

  // Check confidence >= minConfidence
  if (result.confidence < expected.minConfidence) {
    return {
      name: fixtureName,
      passed: false,
      message: `Confidence too low: expected >= ${expected.minConfidence}, got ${result.confidence}`,
      details: { result, expected },
    };
  }

  // Check core need (if present)
  if (result.core_need && result.core_need !== expected.coreNeed) {
    return {
      name: fixtureName,
      passed: false,
      message: `Core need mismatch: expected "${expected.coreNeed}", got "${result.core_need}"`,
      details: { result, expected },
    };
  }

  return {
    name: fixtureName,
    passed: true,
    message: `✓ Detected ${expected.cluster} with ${result.confidence}% confidence`,
  };
}

/**
 * Assert mixed signals case (lower confidence, proper reasoning)
 */
export function assertMixedSignals(
  result: PersonaResult,
  expected: MixedSignalsExpectation,
  fixtureName: string
): TestResult {
  // Check cluster is one of possible clusters
  if (!expected.possibleClusters.includes(result.cluster as PersonaCluster)) {
    return {
      name: fixtureName,
      passed: false,
      message: `Unexpected cluster: got "${result.cluster}", expected one of [${expected.possibleClusters.join(', ')}]`,
      details: { result, expected },
    };
  }

  // Check confidence <= maxConfidence
  if (result.confidence > expected.maxConfidence) {
    return {
      name: fixtureName,
      passed: false,
      message: `Confidence too high for mixed signals: expected <= ${expected.maxConfidence}, got ${result.confidence}`,
      details: { result, expected },
    };
  }

  // Check confidence reasoning contains expected keywords
  const reasoning = (result.confidence_reasoning || '').toLowerCase();
  const hasExpectedKeyword = expected.confidenceReasoningMustContain.some(
    keyword => reasoning.includes(keyword.toLowerCase())
  );

  if (!hasExpectedKeyword && result.confidence_reasoning) {
    return {
      name: fixtureName,
      passed: false,
      message: `Confidence reasoning should mention one of [${expected.confidenceReasoningMustContain.join(', ')}], got: "${result.confidence_reasoning}"`,
      details: { result, expected },
    };
  }

  return {
    name: fixtureName,
    passed: true,
    message: `✓ Mixed signals detected as ${result.cluster} with ${result.confidence}% confidence`,
  };
}

/**
 * Console test runner for development environment
 * 
 * Usage in browser console:
 * ```
 * import { runPersonaDetectionTests } from '@/tests/persona-detection.fixtures';
 * runPersonaDetectionTests();
 * ```
 */
export async function runPersonaDetectionTests(): Promise<void> {
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    console.warn('Persona detection tests are disabled in production');
    return;
  }

  console.group('🧪 Persona Detection Test Fixtures');

  const fixtures = [
    { name: 'Pain Sleeper (Jason)', fixture: painSleeperFixture, expected: expectedOutcomes.painSleeper },
    { name: 'Stress Sleeper (Mila)', fixture: stressSleeperFixture, expected: expectedOutcomes.stressSleeper },
    { name: 'Recovery Sleeper (Riley)', fixture: recoverySleeperFixture, expected: expectedOutcomes.recoverySleeper },
    { name: 'Optimizer (Leo)', fixture: optimizerFixture, expected: expectedOutcomes.optimizer },
  ];

  console.log('📋 CLEAR ARCHETYPE TEST CASES\n');

  for (const { name, fixture, expected } of fixtures) {
    console.group(`🎯 ${name}`);
    console.log('Expected cluster:', expected.cluster);
    console.log('Min confidence:', expected.minConfidence);
    console.log('Core need:', expected.coreNeed);
    console.log('Key signals to detect:', expected.keySignals);
    console.log('Fixture:', fixture);
    console.groupEnd();
  }

  console.group('⚖️ MIXED SIGNALS CASE');
  console.log('Fixture:', mixedSignalsFixture);
  console.log('Possible clusters:', expectedOutcomes.mixedSignals.possibleClusters);
  console.log('Max confidence:', expectedOutcomes.mixedSignals.maxConfidence);
  console.log('Reasoning keywords:', expectedOutcomes.mixedSignals.confidenceReasoningMustContain);
  console.groupEnd();

  console.log('\n📡 TO RUN ACTUAL DETECTION:');
  console.log('POST /functions/v1/analyze-sleep-quiz');
  console.log('Body: { answers: <fixture>, email: "test@example.com" }');
  console.log('\nUse assertClearArchetype() or assertMixedSignals() to validate results.');

  console.groupEnd();
}

// ============ VALUE CONTRACT REFERENCE ============

/**
 * FINAL OPTION VALUE CONTRACTS
 * 
 * These values are confirmed to match between QuizConfig.ts and sleep-assessment.ts.
 * 
 * sleepPosition:     "side" | "back" | "stomach" | "combination"
 * movesOften:        "never" | "sometimes" | "often" | "always"
 * pillowCount:       "0" | "1" | "2" | "3" | "3+"
 * painAreas:         "neck" | "upper_back" | "shoulders" | "lower_back" | "hips" | "headaches" | "none"
 * painSeverity:      0-10 (number)
 * nightAwakenings:   "never" | "rarely" | "once" | "twice" | "frequently"
 * sleepTemperature:  "hot" | "cold" | "neutral"
 * roomBrightness:    "dark" | "dim" | "bright"
 * roomNoise:         "quiet" | "some" | "noisy"
 * sleepLatency:      "quick" | "normal" | "slow" | "very_slow"
 * sleepHours:        "less_than_5" | "5_6" | "6_7" | "7_8" | "over_8"
 * eveningScreenUse:  "never" | "sometimes" | "often" | "always"
 * sleepGoals:        "reduce_pain" | "better_posture" | "better_quality" | "fall_asleep_faster" |
 *                    "stay_asleep" | "wake_refreshed" | "more_energy" | "faster_recovery" |
 *                    "better_recovery" | "muscle_repair"
 * sleepEquipment:    "regular_pillow" | "contour_pillow" | "knee_pillow" | "body_pillow" |
 *                    "sleep_mask" | "white_noise" | "weighted_blanket" | "oura" | "whoop" |
 *                    "fitness_tracker" | "none"
 * pillowSatisfaction: 0-10 (number)
 * mattressFirmness:  "soft" | "medium" | "firm" | "unsure"
 */
