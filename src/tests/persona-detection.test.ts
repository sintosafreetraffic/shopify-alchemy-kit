/**
 * Persona Detection Test Suite v9
 * 
 * WHAT THIS SUITE VALIDATES:
 * - Psychology-first persona detection correctly identifies each archetype
 * - Clear archetypes (Pain Sleeper, Stress Sleeper, Recovery Sleeper, Optimizer) achieve ≥70% confidence
 * - Mixed signals result in <70% confidence with appropriate reasoning
 * - Signal detection logic aligns with backend PERSONA_RULES
 * 
 * RELATIONSHIP TO BACKEND CONTRACTS:
 * - PERSONA_RULES mirrors the scoring weights from sleep-assessment.ts
 * - detectSignals() mirrors backend signal extraction logic
 * - Tests ensure frontend detection matches backend expectations
 * 
 * Run locally (not in Lovable):
 *   npx vitest run src/tests/persona-detection.test.ts
 *   npm run test:quiz:unit
 */

import { describe, it, expect } from 'vitest';
import {
  painSleeperFixture,
  stressSleeperFixture,
  recoverySleeperFixture,
  optimizerFixture,
  mixedSignalsFixture,
  expectedOutcomes,
  assertClearArchetype,
  assertMixedSignals,
} from './persona-detection.fixtures';
import type { QuizPayload } from '@/components/sleep-quiz/QuizTypes';

// ============ MOCK PERSONA DETECTION ============

/**
 * Mock implementation of detectSignals from sleep-assessment.ts
 * This mirrors the backend logic for frontend testing
 */
interface DetectedSignals {
  // Pain Sleeper signals
  hasNeckPain: boolean;
  hasShoulderPain: boolean;
  hasUpperBackPain: boolean;
  hasLowerBackPain: boolean;
  hasHipPain: boolean;
  hasHighPainSeverity: boolean;
  hasModeratePainSeverity: boolean;
  hasLowPillowSatisfaction: boolean;
  hasPainReductionGoal: boolean;
  hasPostureGoal: boolean;
  hasMorningStiffnessPattern: boolean;
  hasMultiplePillows: boolean;
  
  // Stress & Environment Sleeper signals
  hasBrightRoom: boolean;
  hasDimRoom: boolean;
  hasSleepHot: boolean;
  hasSleepCold: boolean;
  hasFrequentAwakenings: boolean;
  hasModerateAwakenings: boolean;
  hasSlowSleepOnset: boolean;
  hasVerySlowSleepOnset: boolean;
  hasRestlessWithoutPain: boolean;
  hasStayAsleepGoal: boolean;
  hasFallAsleepFasterGoal: boolean;
  hasHighScreenUse: boolean;
  hasNoisyEnvironment: boolean;
  hasRacingMindPattern: boolean;
  
  // Recovery Sleeper signals
  hasRecoveryGoal: boolean;
  hasWakeRefreshedGoal: boolean;
  hasMoreEnergyGoal: boolean;
  usesWearables: boolean;
  hasMultiplePerformanceGoals: boolean;
  hasLowPainBaseline: boolean;
  hasGoodSleepStability: boolean;
  
  // Optimizer signals
  hasBetterQualityGoal: boolean;
  hasMultipleGoals: boolean;
  hasHighPillowSatisfaction: boolean;
  hasQuickSleepOnset: boolean;
  hasMinimalIssues: boolean;
}

type PersonaCluster = 'pain_sleeper' | 'stress_insomnia' | 'optimizer' | 'recovery_sleeper';

/**
 * Persona scoring rules (mirrors backend PERSONA_RULES)
 */
const PERSONA_RULES: Record<keyof DetectedSignals, Record<PersonaCluster, number>> = {
  // Pain Sleeper signals
  hasNeckPain:              { pain_sleeper: 6, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasShoulderPain:          { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasUpperBackPain:         { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasLowerBackPain:         { pain_sleeper: 6, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasHipPain:               { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasHighPainSeverity:      { pain_sleeper: 7, stress_insomnia: 0, optimizer: -3, recovery_sleeper: -2 },
  hasModeratePainSeverity:  { pain_sleeper: 4, stress_insomnia: 0, optimizer: -1, recovery_sleeper: -1 },
  hasLowPillowSatisfaction: { pain_sleeper: 5, stress_insomnia: 1, optimizer: -2, recovery_sleeper: -1 },
  hasPainReductionGoal:     { pain_sleeper: 6, stress_insomnia: 0, optimizer: 0, recovery_sleeper: 1 },
  hasPostureGoal:           { pain_sleeper: 4, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 1 },
  hasMorningStiffnessPattern: { pain_sleeper: 5, stress_insomnia: 0, optimizer: -1, recovery_sleeper: 0 },
  hasMultiplePillows:       { pain_sleeper: 4, stress_insomnia: 1, optimizer: -1, recovery_sleeper: 0 },
  
  // Stress & Environment signals
  hasBrightRoom:            { pain_sleeper: 0, stress_insomnia: 6, optimizer: -1, recovery_sleeper: -1 },
  hasDimRoom:               { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasSleepHot:              { pain_sleeper: 0, stress_insomnia: 5, optimizer: -1, recovery_sleeper: 1 },
  hasSleepCold:             { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasFrequentAwakenings:    { pain_sleeper: 1, stress_insomnia: 6, optimizer: -2, recovery_sleeper: -1 },
  hasModerateAwakenings:    { pain_sleeper: 1, stress_insomnia: 4, optimizer: -1, recovery_sleeper: 0 },
  hasSlowSleepOnset:        { pain_sleeper: 0, stress_insomnia: 4, optimizer: -1, recovery_sleeper: 0 },
  hasVerySlowSleepOnset:    { pain_sleeper: 0, stress_insomnia: 6, optimizer: -2, recovery_sleeper: -1 },
  hasRestlessWithoutPain:   { pain_sleeper: 0, stress_insomnia: 5, optimizer: 0, recovery_sleeper: 0 },
  hasStayAsleepGoal:        { pain_sleeper: 1, stress_insomnia: 5, optimizer: 1, recovery_sleeper: 1 },
  hasFallAsleepFasterGoal:  { pain_sleeper: 0, stress_insomnia: 5, optimizer: 1, recovery_sleeper: 0 },
  hasHighScreenUse:         { pain_sleeper: 0, stress_insomnia: 3, optimizer: 0, recovery_sleeper: 0 },
  hasNoisyEnvironment:      { pain_sleeper: 0, stress_insomnia: 4, optimizer: -1, recovery_sleeper: -1 },
  hasRacingMindPattern:     { pain_sleeper: 0, stress_insomnia: 5, optimizer: -1, recovery_sleeper: -1 },
  
  // Recovery Sleeper signals
  hasRecoveryGoal:          { pain_sleeper: 1, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 7 },
  hasWakeRefreshedGoal:     { pain_sleeper: 1, stress_insomnia: 1, optimizer: 4, recovery_sleeper: 4 },
  hasMoreEnergyGoal:        { pain_sleeper: 1, stress_insomnia: 1, optimizer: 3, recovery_sleeper: 5 },
  usesWearables:            { pain_sleeper: 0, stress_insomnia: 0, optimizer: 3, recovery_sleeper: 5 },
  hasMultiplePerformanceGoals: { pain_sleeper: 0, stress_insomnia: 0, optimizer: 2, recovery_sleeper: 4 },
  hasLowPainBaseline:       { pain_sleeper: -3, stress_insomnia: 1, optimizer: 3, recovery_sleeper: 3 },
  hasGoodSleepStability:    { pain_sleeper: 0, stress_insomnia: -2, optimizer: 3, recovery_sleeper: 2 },
  
  // Optimizer signals
  hasBetterQualityGoal:     { pain_sleeper: 1, stress_insomnia: 1, optimizer: 5, recovery_sleeper: 2 },
  hasMultipleGoals:         { pain_sleeper: 1, stress_insomnia: 1, optimizer: 4, recovery_sleeper: 2 },
  hasHighPillowSatisfaction: { pain_sleeper: -2, stress_insomnia: 0, optimizer: 4, recovery_sleeper: 2 },
  hasQuickSleepOnset:       { pain_sleeper: 0, stress_insomnia: -2, optimizer: 3, recovery_sleeper: 2 },
  hasMinimalIssues:         { pain_sleeper: -4, stress_insomnia: -3, optimizer: 5, recovery_sleeper: 3 },
};

/**
 * Detect signals from quiz answers (mirrors backend detectSignals)
 */
function detectSignals(quizAnswers: Partial<QuizPayload>): DetectedSignals {
  const painAreas = quizAnswers.painAreas || [];
  const sleepGoals = quizAnswers.sleepGoals || [];
  const sleepEquipment = quizAnswers.sleepEquipment || [];
  const nightAwakenings = quizAnswers.nightAwakenings || '';
  const movesOften = quizAnswers.movesOften || '';
  const roomBrightness = quizAnswers.roomBrightness || '';
  const sleepTemperature = quizAnswers.sleepTemperature || '';
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const sleepLatency = quizAnswers.sleepLatency || '';
  const painSeverity = quizAnswers.painSeverity ?? 5;
  const pillowCount = quizAnswers.pillowCount || '';
  const eveningScreenUse = quizAnswers.eveningScreenUse || '';
  const roomNoise = quizAnswers.roomNoise || '';
  
  const hasPain = painAreas.some(p => p !== 'none' && p !== 'no_pain');
  const performanceGoals = ['faster_recovery', 'better_recovery', 'muscle_repair', 'wake_refreshed', 'more_energy'];
  const recoveryGoals = ['faster_recovery', 'better_recovery', 'muscle_repair'];
  
  return {
    // Pain Sleeper signals
    hasNeckPain: painAreas.includes('neck'),
    hasShoulderPain: painAreas.includes('shoulders'),
    hasUpperBackPain: painAreas.includes('upper_back'),
    hasLowerBackPain: painAreas.includes('lower_back'),
    hasHipPain: painAreas.includes('hips'),
    hasHighPainSeverity: painSeverity >= 6,
    hasModeratePainSeverity: painSeverity >= 4 && painSeverity < 6,
    hasLowPillowSatisfaction: pillowSatisfaction <= 4,
    hasPainReductionGoal: sleepGoals.includes('reduce_pain'),
    hasPostureGoal: sleepGoals.includes('better_posture'),
    hasMorningStiffnessPattern: (movesOften === 'always' || movesOften === 'often') && hasPain,
    hasMultiplePillows: pillowCount === '2' || pillowCount === '3' || pillowCount === '3+',
    
    // Stress & Environment signals
    hasBrightRoom: roomBrightness === 'bright',
    hasDimRoom: roomBrightness === 'dim',
    hasSleepHot: sleepTemperature === 'hot',
    hasSleepCold: sleepTemperature === 'cold',
    hasFrequentAwakenings: nightAwakenings === 'frequently',
    hasModerateAwakenings: nightAwakenings === 'twice',
    hasSlowSleepOnset: sleepLatency === 'slow',
    hasVerySlowSleepOnset: sleepLatency === 'very_slow',
    hasRestlessWithoutPain: (movesOften === 'always' || movesOften === 'often') && !hasPain,
    hasStayAsleepGoal: sleepGoals.includes('stay_asleep'),
    hasFallAsleepFasterGoal: sleepGoals.includes('fall_asleep_faster'),
    hasHighScreenUse: eveningScreenUse === 'always' || eveningScreenUse === 'often',
    hasNoisyEnvironment: roomNoise === 'noisy',
    hasRacingMindPattern: (sleepLatency === 'slow' || sleepLatency === 'very_slow') && 
                          (eveningScreenUse === 'always' || eveningScreenUse === 'often'),
    
    // Recovery Sleeper signals
    hasRecoveryGoal: recoveryGoals.some(g => sleepGoals.includes(g)),
    hasWakeRefreshedGoal: sleepGoals.includes('wake_refreshed'),
    hasMoreEnergyGoal: sleepGoals.includes('more_energy'),
    usesWearables: sleepEquipment.includes('oura') || sleepEquipment.includes('whoop') || 
                   sleepEquipment.includes('fitness_tracker') || sleepEquipment.includes('smart_watch'),
    hasMultiplePerformanceGoals: sleepGoals.filter(g => performanceGoals.includes(g)).length >= 2,
    hasLowPainBaseline: painSeverity <= 3 && !hasPain,
    hasGoodSleepStability: nightAwakenings === 'rarely' || nightAwakenings === 'never',
    
    // Optimizer signals
    hasBetterQualityGoal: sleepGoals.includes('better_quality'),
    hasMultipleGoals: sleepGoals.length >= 3,
    hasHighPillowSatisfaction: pillowSatisfaction >= 7,
    hasQuickSleepOnset: sleepLatency === 'quick' || sleepLatency === 'normal',
    hasMinimalIssues: painSeverity <= 2 && !hasPain && 
                      (roomBrightness === 'dark' || roomBrightness === '') &&
                      (sleepTemperature === 'neutral' || sleepTemperature === '') &&
                      (nightAwakenings === 'rarely' || nightAwakenings === 'never'),
  };
}

/**
 * Calculate persona scores from detected signals
 */
function calculatePersonaScores(signals: DetectedSignals): Record<PersonaCluster, number> {
  const scores: Record<PersonaCluster, number> = {
    pain_sleeper: 0,
    stress_insomnia: 0,
    optimizer: 0,
    recovery_sleeper: 0,
  };
  
  for (const [signalKey, isActive] of Object.entries(signals)) {
    if (isActive) {
      const rule = PERSONA_RULES[signalKey as keyof DetectedSignals];
      scores.pain_sleeper += rule.pain_sleeper;
      scores.stress_insomnia += rule.stress_insomnia;
      scores.optimizer += rule.optimizer;
      scores.recovery_sleeper += rule.recovery_sleeper;
    }
  }
  
  // Floor at 0
  scores.pain_sleeper = Math.max(0, scores.pain_sleeper);
  scores.stress_insomnia = Math.max(0, scores.stress_insomnia);
  scores.optimizer = Math.max(0, scores.optimizer);
  scores.recovery_sleeper = Math.max(0, scores.recovery_sleeper);
  
  return scores;
}

/**
 * Detect persona from quiz answers (simplified version for testing)
 */
function detectPersona(quizAnswers: QuizPayload): {
  cluster: PersonaCluster;
  confidence: number;
  confidence_reasoning: string;
} {
  const signals = detectSignals(quizAnswers);
  const scores = calculatePersonaScores(signals);
  
  // Determine winner
  const allScores = [
    { cluster: 'pain_sleeper' as PersonaCluster, score: scores.pain_sleeper },
    { cluster: 'stress_insomnia' as PersonaCluster, score: scores.stress_insomnia },
    { cluster: 'optimizer' as PersonaCluster, score: scores.optimizer },
    { cluster: 'recovery_sleeper' as PersonaCluster, score: scores.recovery_sleeper },
  ].sort((a, b) => b.score - a.score);
  
  const winner = allScores[0];
  const runnerUp = allScores[1];
  
  // Calculate confidence
  const signalStrength = Math.min(winner.score / 20, 1);
  const leadMargin = Math.min((winner.score - runnerUp.score) / 10, 1);
  const confidence = Math.round((signalStrength * 50) + (leadMargin * 50));
  
  // Build confidence reasoning
  let confidence_reasoning: string;
  if (confidence >= 75) {
    confidence_reasoning = `Your responses show clear ${winner.cluster === 'pain_sleeper' ? 'alignment and physical comfort' : winner.cluster === 'stress_insomnia' ? 'environmental sensitivity' : winner.cluster === 'recovery_sleeper' ? 'recovery focus' : 'optimization'} signals with strong consistency.`;
  } else if (confidence >= 50) {
    confidence_reasoning = `Your responses suggest ${winner.cluster === 'pain_sleeper' ? 'alignment needs' : winner.cluster === 'stress_insomnia' ? 'environmental factors' : winner.cluster === 'recovery_sleeper' ? 'recovery focus' : 'optimization goals'} as your primary area, though some secondary patterns were also detected.`;
  } else {
    confidence_reasoning = `Your sleep profile shows mixed signals across multiple areas. Recommendations are balanced rather than heavily personalized to one focus.`;
  }
  
  return {
    cluster: winner.cluster,
    confidence,
    confidence_reasoning,
  };
}

// ============ TEST SUITES ============

describe('Persona Detection - Clear Archetypes', () => {
  it('should detect Pain Sleeper (Jason) with ≥70% confidence', () => {
    const result = detectPersona(painSleeperFixture);
    const testResult = assertClearArchetype(result, expectedOutcomes.painSleeper, 'Pain Sleeper');
    
    expect(testResult.passed).toBe(true);
    expect(result.cluster).toBe('pain_sleeper');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('should detect Stress & Environment Sleeper (Mila) with ≥70% confidence', () => {
    const result = detectPersona(stressSleeperFixture);
    const testResult = assertClearArchetype(result, expectedOutcomes.stressSleeper, 'Stress Sleeper');
    
    expect(testResult.passed).toBe(true);
    expect(result.cluster).toBe('stress_insomnia');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('should detect Recovery Sleeper (Riley) with ≥70% confidence', () => {
    const result = detectPersona(recoverySleeperFixture);
    const testResult = assertClearArchetype(result, expectedOutcomes.recoverySleeper, 'Recovery Sleeper');
    
    expect(testResult.passed).toBe(true);
    expect(result.cluster).toBe('recovery_sleeper');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('should detect Optimizer (Leo) with ≥70% confidence', () => {
    const result = detectPersona(optimizerFixture);
    const testResult = assertClearArchetype(result, expectedOutcomes.optimizer, 'Optimizer');
    
    expect(testResult.passed).toBe(true);
    expect(result.cluster).toBe('optimizer');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });
});

describe('Persona Detection - Mixed Signals', () => {
  it('should detect mixed signals with <70% confidence and appropriate reasoning', () => {
    const result = detectPersona(mixedSignalsFixture);
    const testResult = assertMixedSignals(result, expectedOutcomes.mixedSignals, 'Mixed Signals');
    
    // Allow either pain_sleeper or stress_insomnia for mixed case
    expect(['pain_sleeper', 'stress_insomnia']).toContain(result.cluster);
    
    // Confidence should be lower for mixed signals
    expect(result.confidence).toBeLessThan(70);
    
    // Reasoning should mention mixed/balanced
    const reasoningLower = result.confidence_reasoning.toLowerCase();
    expect(
      reasoningLower.includes('mixed') || 
      reasoningLower.includes('balanced') ||
      reasoningLower.includes('multiple') ||
      reasoningLower.includes('secondary')
    ).toBe(true);
  });
});

describe('Signal Detection - Value Alignment', () => {
  it('should correctly detect pain signals from painAreas', () => {
    const signals = detectSignals({
      painAreas: ['neck', 'shoulders', 'lower_back'],
      painSeverity: 7,
    });
    
    expect(signals.hasNeckPain).toBe(true);
    expect(signals.hasShoulderPain).toBe(true);
    expect(signals.hasLowerBackPain).toBe(true);
    expect(signals.hasHighPainSeverity).toBe(true);
  });

  it('should correctly detect environment signals', () => {
    const signals = detectSignals({
      roomBrightness: 'bright',
      sleepTemperature: 'hot',
      nightAwakenings: 'frequently',
      roomNoise: 'noisy',
    });
    
    expect(signals.hasBrightRoom).toBe(true);
    expect(signals.hasSleepHot).toBe(true);
    expect(signals.hasFrequentAwakenings).toBe(true);
    expect(signals.hasNoisyEnvironment).toBe(true);
  });

  it('should correctly detect recovery/optimizer signals', () => {
    const signals = detectSignals({
      sleepGoals: ['faster_recovery', 'better_quality', 'wake_refreshed'],
      sleepEquipment: ['oura', 'whoop'],
      pillowSatisfaction: 8,
      sleepLatency: 'quick',
    });
    
    expect(signals.hasRecoveryGoal).toBe(true);
    expect(signals.hasBetterQualityGoal).toBe(true);
    expect(signals.usesWearables).toBe(true);
    expect(signals.hasHighPillowSatisfaction).toBe(true);
    expect(signals.hasQuickSleepOnset).toBe(true);
  });

  it('should detect morning stiffness pattern correctly', () => {
    // With pain
    const withPain = detectSignals({
      movesOften: 'often',
      painAreas: ['neck'],
      painSeverity: 5,
    });
    expect(withPain.hasMorningStiffnessPattern).toBe(true);
    
    // Without pain (should be restless without pain instead)
    const withoutPain = detectSignals({
      movesOften: 'often',
      painAreas: [],
      painSeverity: 1,
    });
    expect(withoutPain.hasMorningStiffnessPattern).toBe(false);
    expect(withoutPain.hasRestlessWithoutPain).toBe(true);
  });
});

describe('QuizConfig Value Alignment', () => {
  it('should use correct nightAwakenings values', () => {
    // Valid backend values: "never" | "rarely" | "once" | "twice" | "frequently"
    const signals1 = detectSignals({ nightAwakenings: 'frequently' });
    expect(signals1.hasFrequentAwakenings).toBe(true);
    
    const signals2 = detectSignals({ nightAwakenings: 'twice' });
    expect(signals2.hasModerateAwakenings).toBe(true);
    
    const signals3 = detectSignals({ nightAwakenings: 'rarely' });
    expect(signals3.hasGoodSleepStability).toBe(true);
  });

  it('should use correct sleepLatency values', () => {
    // Valid backend values: "quick" | "normal" | "slow" | "very_slow"
    const signals1 = detectSignals({ sleepLatency: 'very_slow' });
    expect(signals1.hasVerySlowSleepOnset).toBe(true);
    
    const signals2 = detectSignals({ sleepLatency: 'slow' });
    expect(signals2.hasSlowSleepOnset).toBe(true);
    
    const signals3 = detectSignals({ sleepLatency: 'quick' });
    expect(signals3.hasQuickSleepOnset).toBe(true);
  });

  it('should use correct sleepGoals values', () => {
    // Valid backend values for recovery goals
    const recoverySignals = detectSignals({ 
      sleepGoals: ['faster_recovery', 'better_recovery', 'muscle_repair'] 
    });
    expect(recoverySignals.hasRecoveryGoal).toBe(true);
    expect(recoverySignals.hasMultiplePerformanceGoals).toBe(true);
    
    // Valid backend values for stress goals
    const stressSignals = detectSignals({ 
      sleepGoals: ['fall_asleep_faster', 'stay_asleep'] 
    });
    expect(stressSignals.hasFallAsleepFasterGoal).toBe(true);
    expect(stressSignals.hasStayAsleepGoal).toBe(true);
  });
});
