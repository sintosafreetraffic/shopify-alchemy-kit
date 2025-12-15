/**
 * Persona Detection Test Fixtures
 * 
 * These fixtures verify that the psychology-first persona detection
 * correctly identifies each archetype based on quiz answers.
 * 
 * Backend values reference (from sleep-assessment.ts):
 * - sleepHours: "less_than_5" | "5_6" | "6_7" | "7_8" | "over_8"
 * - pillowCount: "0" | "1" | "2" | "3" | "3+" (0 treated as neutral, 2/3/3+ indicate alignment issues)
 * - nightAwakenings: "never" | "rarely" | "once" | "twice" | "frequently"
 * - sleepLatency: "quick" | "normal" | "slow" | "very_slow"
 * - roomBrightness: "dark" | "dim" | "bright"
 * - sleepTemperature: "hot" | "cold" | "neutral"
 * - movesOften: "never" | "sometimes" | "often" | "always"
 * - eveningScreenUse: "never" | "sometimes" | "often" | "always"
 */

import type { QuizPayload } from '@/components/sleep-quiz/QuizTypes';

// Base answers with neutral defaults (should not strongly trigger any persona)
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
  pillowSatisfaction: 5, // Neutral (0-10 scale)
};

/**
 * PAIN SLEEPER (Jason) - Clear archetype
 * 
 * High signals detected:
 * - hasNeckPain: true (neck in painAreas)
 * - hasShoulderPain: true (shoulders in painAreas)
 * - hasLowerBackPain: true (lower_back in painAreas)
 * - hasHighPainSeverity: true (painSeverity >= 6)
 * - hasLowPillowSatisfaction: true (pillowSatisfaction <= 4)
 * - hasPainReductionGoal: true (reduce_pain in sleepGoals)
 * - hasPostureGoal: true (better_posture in sleepGoals)
 * - hasMorningStiffnessPattern: true (movesOften === "often" && hasPain)
 * - hasMultiplePillows: false (pillowCount === "1")
 */
export const painSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  movesOften: 'often',
  pillowCount: '1',
  painAreas: ['neck', 'shoulders', 'lower_back'],
  painSeverity: 7,
  pillowSatisfaction: 2, // Very unsatisfied
  sleepGoals: ['reduce_pain', 'better_posture', 'wake_refreshed'],
  nightAwakenings: 'once',
  sleepEquipment: [],
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  sleepLatency: 'normal',
  sleepHours: '7_8',
  eveningScreenUse: 'sometimes',
};

/**
 * STRESS & ENVIRONMENT SLEEPER (Mila) - Clear archetype
 * 
 * High signals detected:
 * - hasBrightRoom: true (roomBrightness === "bright")
 * - hasSleepHot: true (sleepTemperature === "hot")
 * - hasFrequentAwakenings: true (nightAwakenings === "frequently")
 * - hasVerySlowSleepOnset: true (sleepLatency === "very_slow")
 * - hasHighScreenUse: true (eveningScreenUse === "always")
 * - hasNoisyEnvironment: true (roomNoise === "noisy")
 * - hasStayAsleepGoal: true (stay_asleep in sleepGoals)
 * - hasFallAsleepFasterGoal: true (fall_asleep_faster in sleepGoals)
 * - hasRacingMindPattern: true (slow latency + high screen use)
 * - hasRestlessWithoutPain: true (moves often but no pain)
 */
export const stressSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  movesOften: 'often',
  painAreas: [],
  painSeverity: 1,
  nightAwakenings: 'frequently',
  sleepTemperature: 'hot',
  roomBrightness: 'bright',
  roomNoise: 'noisy',
  sleepLatency: 'very_slow',
  sleepHours: '5_6',
  eveningScreenUse: 'always',
  sleepGoals: ['fall_asleep_faster', 'stay_asleep', 'better_quality'],
  pillowSatisfaction: 5, // Neutral - pillow isn't the issue
  sleepEquipment: [],
};

/**
 * RECOVERY SLEEPER (Riley) - Clear archetype
 * 
 * High signals detected:
 * - hasRecoveryGoal: true (faster_recovery in sleepGoals)
 * - hasWakeRefreshedGoal: true (wake_refreshed in sleepGoals)
 * - hasMoreEnergyGoal: true (more_energy in sleepGoals)
 * - usesWearables: true (oura, whoop in sleepEquipment)
 * - hasMultiplePerformanceGoals: true (3+ performance goals)
 * - hasLowPainBaseline: true (painSeverity <= 3 && no pain)
 * - hasGoodSleepStability: true (nightAwakenings === "rarely")
 */
export const recoverySleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  movesOften: 'sometimes',
  painAreas: [],
  painSeverity: 1,
  sleepGoals: ['faster_recovery', 'muscle_repair', 'more_energy', 'wake_refreshed'],
  sleepEquipment: ['whoop', 'oura'],
  pillowSatisfaction: 6, // Moderate satisfaction
  nightAwakenings: 'rarely',
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
 * High signals detected:
 * - hasBetterQualityGoal: true (better_quality in sleepGoals)
 * - hasMultipleGoals: true (3+ goals)
 * - hasHighPillowSatisfaction: true (pillowSatisfaction >= 7)
 * - hasQuickSleepOnset: true (sleepLatency === "quick")
 * - hasMinimalIssues: true (low pain, dark room, neutral temp, stable sleep)
 */
export const optimizerFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'mixed',
  movesOften: 'sometimes',
  painAreas: [],
  painSeverity: 1,
  sleepGoals: ['better_quality', 'more_energy', 'wake_refreshed', 'better_posture'],
  sleepEquipment: ['fitness_tracker'],
  pillowSatisfaction: 8, // High satisfaction
  nightAwakenings: 'never',
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'quick',
  sleepHours: '7_8',
  eveningScreenUse: 'never',
};

/**
 * MIXED SIGNALS - Ambiguous case
 * 
 * Moderate pain AND moderate environment issues - should result in lower confidence.
 * This tests that the system correctly identifies ambiguity.
 */
export const mixedSignalsFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  movesOften: 'sometimes',
  painAreas: ['neck'],
  painSeverity: 4, // Moderate - triggers hasModeratePainSeverity
  nightAwakenings: 'twice', // Moderate awakenings
  sleepTemperature: 'hot', // Environment issue
  roomBrightness: 'dim', // Mild environment issue
  roomNoise: 'some',
  sleepLatency: 'slow', // Slow onset
  sleepHours: '6_7',
  sleepGoals: ['reduce_pain', 'stay_asleep'], // Mixed goals
  pillowSatisfaction: 4, // Low - could indicate pain sleeper
  sleepEquipment: [],
  eveningScreenUse: 'often',
};

/**
 * Expected outcomes for each fixture
 */
export const expectedOutcomes = {
  painSleeper: {
    cluster: 'pain_sleeper' as const,
    minConfidence: 70,
    coreNeed: 'alignment' as const,
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
    cluster: 'stress_insomnia' as const,
    minConfidence: 70,
    coreNeed: 'environment' as const,
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
    cluster: 'recovery_sleeper' as const,
    minConfidence: 70,
    coreNeed: 'recovery' as const,
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
    cluster: 'optimizer' as const,
    minConfidence: 70,
    coreNeed: 'optimization' as const,
    keySignals: [
      'hasBetterQualityGoal',
      'hasMultipleGoals',
      'hasHighPillowSatisfaction',
      'hasQuickSleepOnset',
      'hasMinimalIssues',
    ],
  },
  mixedSignals: {
    // Could be pain_sleeper or stress_insomnia depending on weights
    possibleClusters: ['pain_sleeper', 'stress_insomnia'] as const,
    maxConfidence: 65, // Should be lower due to mixed signals
    reason: 'Mixed pain and environment signals reduce persona certainty',
  },
};

/**
 * Final option value reference for quiz → backend alignment:
 * 
 * sleepHours:
 *   "less_than_5" → stability -= 15
 *   "5_6"         → stability -= 15
 *   "6_7"         → (neutral)
 *   "7_8"         → (neutral)
 *   "over_8"      → (neutral)
 * 
 * pillowCount:
 *   "0"   → (neutral, treated same as "1")
 *   "1"   → (neutral)
 *   "2"   → alignmentRisk += 10, neckSupport -= 15, hasMultiplePillows signal
 *   "3"   → alignmentRisk += 18, neckSupport -= 15, hasMultiplePillows signal
 *   "3+"  → alignmentRisk += 18, neckSupport -= 15, hasMultiplePillows signal
 * 
 * nightAwakenings:
 *   "never"      → hasGoodSleepStability
 *   "rarely"     → hasGoodSleepStability
 *   "once"       → stability -= 8
 *   "twice"      → stability -= 18, hasModerateAwakenings
 *   "frequently" → stability -= 32, hasFrequentAwakenings
 * 
 * sleepLatency:
 *   "quick"     → hasQuickSleepOnset
 *   "normal"    → hasQuickSleepOnset
 *   "slow"      → stability -= 12, hasSlowSleepOnset
 *   "very_slow" → stability -= 25, hasVerySlowSleepOnset
 * 
 * roomBrightness:
 *   "dark"   → lightSensitivity = 15 (optimal)
 *   "dim"    → environment -= 10, lightSensitivity = 45, hasDimRoom
 *   "bright" → environment -= 22, lightSensitivity = 85, hasBrightRoom
 * 
 * sleepTemperature:
 *   "neutral" → tempDisruption = 15 (optimal)
 *   "cold"    → environment -= 10, tempDisruption = 42, hasSleepCold
 *   "hot"     → environment -= 18, tempDisruption = 78, hasSleepHot
 */

/**
 * Console test runner for dev environment
 * Usage: import and call runPersonaDetectionTests() in browser console
 */
export async function runPersonaDetectionTests(): Promise<void> {
  if (import.meta.env.PROD) {
    console.warn('Persona detection tests are disabled in production');
    return;
  }

  console.group('🧪 Persona Detection Tests');
  
  const fixtures = [
    { name: 'Pain Sleeper (Jason)', answers: painSleeperFixture, expected: expectedOutcomes.painSleeper },
    { name: 'Stress Sleeper (Mila)', answers: stressSleeperFixture, expected: expectedOutcomes.stressSleeper },
    { name: 'Recovery Sleeper (Riley)', answers: recoverySleeperFixture, expected: expectedOutcomes.recoverySleeper },
    { name: 'Optimizer (Leo)', answers: optimizerFixture, expected: expectedOutcomes.optimizer },
  ];

  console.log('Testing clear archetype cases...\n');

  for (const { name, answers, expected } of fixtures) {
    console.group(`📋 ${name}`);
    console.log('Expected cluster:', expected.cluster);
    console.log('Expected min confidence:', expected.minConfidence);
    console.log('Expected core need:', expected.coreNeed);
    console.log('Key signals that should be detected:', expected.keySignals);
    console.log('Fixture answers:', answers);
    console.groupEnd();
  }

  console.group('📋 Mixed Signals Case');
  console.log('Fixture answers:', mixedSignalsFixture);
  console.log('Possible clusters:', expectedOutcomes.mixedSignals.possibleClusters);
  console.log('Expected max confidence:', expectedOutcomes.mixedSignals.maxConfidence);
  console.log('Reason:', expectedOutcomes.mixedSignals.reason);
  console.groupEnd();

  console.log('\n✅ To run actual detection, call the analyze-sleep-quiz edge function with these fixtures.');
  console.log('Example: POST /functions/v1/analyze-sleep-quiz with body: { answers: painSleeperFixture, email: "test@example.com" }');
  console.groupEnd();
}

/**
 * Type-safe test assertion helper
 */
export function assertPersonaMatch(
  result: { cluster: string; confidence: number; core_need: string },
  expected: { cluster: string; minConfidence: number; coreNeed: string }
): { passed: boolean; message: string } {
  if (result.cluster !== expected.cluster) {
    return { 
      passed: false, 
      message: `Cluster mismatch: expected ${expected.cluster}, got ${result.cluster}` 
    };
  }
  if (result.confidence < expected.minConfidence) {
    return { 
      passed: false, 
      message: `Confidence too low: expected >= ${expected.minConfidence}, got ${result.confidence}` 
    };
  }
  if (result.core_need !== expected.coreNeed) {
    return { 
      passed: false, 
      message: `Core need mismatch: expected ${expected.coreNeed}, got ${result.core_need}` 
    };
  }
  return { passed: true, message: 'All assertions passed' };
}
