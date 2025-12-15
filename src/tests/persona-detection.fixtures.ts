/**
 * Persona Detection Test Fixtures
 * 
 * These fixtures verify that the psychology-first persona detection
 * correctly identifies each archetype based on quiz answers.
 */

import type { QuizPayload } from '@/components/sleep-quiz/QuizTypes';

// Base answers with neutral defaults
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
  sleepHours: '7-8',
  eveningScreenUse: 'moderate',
  sleepClothing: 'light',
  coSleeping: [],
  sleepGoals: [],
  snoring: 'no',
  triedMethods: [],
  pillowSatisfaction: 3, // Neutral (1-5 scale)
};

/**
 * PAIN SLEEPER (Jason) - Clear archetype
 * High signals: neck/back pain, high severity, morning stiffness, low pillow satisfaction
 */
export const painSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  movesOften: 'often',
  painAreas: ['neck', 'shoulders', 'lower_back'],
  painSeverity: 7,
  pillowSatisfaction: 1, // Very unsatisfied
  sleepGoals: ['reduce_pain', 'better_posture', 'wake_refreshed'],
  nightAwakenings: 'once',
  sleepEquipment: [],
};

/**
 * STRESS & ENVIRONMENT SLEEPER (Mila) - Clear archetype
 * High signals: racing mind, frequent awakenings, hot/bright room, slow latency
 */
export const stressSleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  painAreas: [],
  painSeverity: 2,
  nightAwakenings: 'frequently',
  sleepTemperature: 'hot',
  roomBrightness: 'bright',
  roomNoise: 'noisy',
  sleepLatency: 'very_slow',
  eveningScreenUse: 'heavy',
  sleepGoals: ['fall_asleep_faster', 'stay_asleep', 'better_quality'],
  pillowSatisfaction: 3, // Neutral
};

/**
 * RECOVERY SLEEPER (Riley) - Clear archetype
 * High signals: recovery-focused goals, uses wearables, active lifestyle, low pain
 */
export const recoverySleeperFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'back',
  painAreas: [],
  painSeverity: 1,
  sleepGoals: ['faster_recovery', 'muscle_repair', 'more_energy', 'wake_refreshed'],
  sleepEquipment: ['whoop', 'oura'],
  pillowSatisfaction: 4, // Satisfied
  nightAwakenings: 'rarely',
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  sleepLatency: 'quick',
};

/**
 * OPTIMIZER (Leo) - Clear archetype
 * High signals: multiple performance goals, tracking interest, high satisfaction, minimal issues
 */
export const optimizerFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'mixed',
  painAreas: [],
  painSeverity: 1,
  sleepGoals: ['better_quality', 'more_energy', 'wake_refreshed', 'better_posture'],
  sleepEquipment: ['sleep_tracker'],
  pillowSatisfaction: 5, // Very satisfied
  nightAwakenings: 'never',
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'quick',
  sleepHours: '7-8',
  eveningScreenUse: 'minimal',
};

/**
 * MIXED SIGNALS - Ambiguous case
 * Moderate pain AND moderate environment issues - should result in lower confidence
 */
export const mixedSignalsFixture: QuizPayload = {
  ...baseAnswers,
  sleepPosition: 'side',
  painAreas: ['neck'],
  painSeverity: 4,
  nightAwakenings: 'twice',
  sleepTemperature: 'hot',
  roomBrightness: 'dim',
  sleepLatency: 'slow',
  sleepGoals: ['reduce_pain', 'stay_asleep'],
  pillowSatisfaction: 3, // Neutral
};

/**
 * Expected outcomes for each fixture
 */
export const expectedOutcomes = {
  painSleeper: {
    cluster: 'pain_sleeper' as const,
    minConfidence: 70,
    coreNeed: 'alignment' as const,
  },
  stressSleeper: {
    cluster: 'stress_insomnia' as const,
    minConfidence: 70,
    coreNeed: 'environment' as const,
  },
  recoverySleeper: {
    cluster: 'recovery_sleeper' as const,
    minConfidence: 70,
    coreNeed: 'recovery' as const,
  },
  optimizer: {
    cluster: 'optimizer' as const,
    minConfidence: 70,
    coreNeed: 'optimization' as const,
  },
  mixedSignals: {
    // Could be pain_sleeper or stress_insomnia depending on weights
    possibleClusters: ['pain_sleeper', 'stress_insomnia'] as const,
    maxConfidence: 65, // Should be lower due to mixed signals
  },
};

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
    console.log('Answers:', answers);
    console.log('Expected cluster:', expected.cluster);
    console.log('Expected min confidence:', expected.minConfidence);
    console.log('Expected core need:', expected.coreNeed);
    console.groupEnd();
  }

  console.group('📋 Mixed Signals Case');
  console.log('Answers:', mixedSignalsFixture);
  console.log('Possible clusters:', expectedOutcomes.mixedSignals.possibleClusters);
  console.log('Expected max confidence:', expectedOutcomes.mixedSignals.maxConfidence);
  console.groupEnd();

  console.log('\n✅ To run actual detection, call the analyze-sleep-quiz edge function with these fixtures.');
  console.groupEnd();
}
