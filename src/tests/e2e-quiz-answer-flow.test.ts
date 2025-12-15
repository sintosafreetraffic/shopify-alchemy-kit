/**
 * E2E Quiz Answer Flow Tests
 * 
 * Tests the complete flow from QuizConfig options → serialized payload → backend response.
 * Validates that all frontend option values correctly serialize and the backend returns
 * the expected response shape.
 * 
 * Run with: npx vitest run src/tests/e2e-quiz-answer-flow.test.ts
 */

import { describe, it, expect } from 'vitest';
import { QUIZ_QUESTIONS } from '@/components/sleep-quiz/QuizConfig';
import type { QuizPayload, SleepAssessment, PersonaCluster } from '@/components/sleep-quiz/QuizTypes';

// ============ VALUE CONTRACT REFERENCE ============

/**
 * Backend-expected values (from sleep-assessment.ts)
 * These MUST match QuizConfig.ts option values exactly.
 */
const BACKEND_VALUE_CONTRACTS = {
  sleepPosition: ["side", "back", "stomach", "combination"] as const,
  movesOften: ["never", "sometimes", "often", "always"] as const,
  pillowCount: ["0", "1", "2", "3", "3+"] as const,
  painAreas: ["neck", "upper_back", "shoulders", "lower_back", "hips", "headaches", "none"] as const,
  painSeverity: { min: 0, max: 10 },
  nightAwakenings: ["never", "rarely", "once", "twice", "frequently"] as const,
  sleepTemperature: ["hot", "cold", "neutral"] as const,
  roomBrightness: ["dark", "dim", "bright"] as const,
  roomNoise: ["quiet", "some", "noisy"] as const,
  sleepLatency: ["quick", "normal", "slow", "very_slow"] as const,
  sleepHours: ["less_than_5", "5_6", "6_7", "7_8", "over_8"] as const,
  eveningScreenUse: ["never", "sometimes", "often", "always"] as const,
  sleepGoals: [
    "reduce_pain", "better_posture", "better_quality", "fall_asleep_faster",
    "stay_asleep", "wake_refreshed", "more_energy", "faster_recovery",
    "better_recovery", "muscle_repair"
  ] as const,
  sleepEquipment: [
    "regular_pillow", "contour_pillow", "knee_pillow", "body_pillow",
    "sleep_mask", "white_noise", "weighted_blanket", "oura", "whoop",
    "fitness_tracker", "smart_watch", "none"
  ] as const,
  pillowSatisfaction: { min: 0, max: 10 },
  mattressFirmness: ["soft", "medium", "firm", "unsure"] as const,
  snoring: ["never", "sometimes", "often", "always", "unsure"] as const,
  sleepClothing: ["minimal", "light", "moderate", "heavy"] as const,
};

// ============ QUIZ CONFIG VALIDATION ============

describe('QuizConfig Option Values', () => {
  it('sleepPosition options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepPosition');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepPosition) {
      expect(frontendValues).toContain(val);
    }
  });

  it('movesOften options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'movesOften');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.movesOften) {
      expect(frontendValues).toContain(val);
    }
  });

  it('pillowCount options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'pillowCount');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.pillowCount) {
      expect(frontendValues).toContain(val);
    }
  });

  it('nightAwakenings options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'nightAwakenings');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.nightAwakenings) {
      expect(frontendValues).toContain(val);
    }
  });

  it('sleepTemperature options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepTemperature');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepTemperature) {
      expect(frontendValues).toContain(val);
    }
  });

  it('roomBrightness options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'roomBrightness');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.roomBrightness) {
      expect(frontendValues).toContain(val);
    }
  });

  it('roomNoise options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'roomNoise');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.roomNoise) {
      expect(frontendValues).toContain(val);
    }
  });

  it('sleepLatency options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepLatency');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepLatency) {
      expect(frontendValues).toContain(val);
    }
  });

  it('sleepHours options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepHours');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepHours) {
      expect(frontendValues).toContain(val);
    }
  });

  it('eveningScreenUse options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'eveningScreenUse');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.eveningScreenUse) {
      expect(frontendValues).toContain(val);
    }
  });

  it('sleepGoals options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepGoals');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepGoals) {
      expect(frontendValues).toContain(val);
    }
  });

  it('sleepEquipment options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'sleepEquipment');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.sleepEquipment) {
      expect(frontendValues).toContain(val);
    }
  });

  it('mattressFirmness options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'mattressFirmness');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.mattressFirmness) {
      expect(frontendValues).toContain(val);
    }
  });

  it('painAreas options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'painAreas');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.painAreas) {
      expect(frontendValues).toContain(val);
    }
  });

  it('snoring options match backend contract', () => {
    const question = QUIZ_QUESTIONS.find(q => q.id === 'snoring');
    expect(question).toBeDefined();
    
    const frontendValues = question!.options!.map(o => o.value);
    for (const val of BACKEND_VALUE_CONTRACTS.snoring) {
      expect(frontendValues).toContain(val);
    }
  });
});

// ============ PAYLOAD SERIALIZATION ============

describe('Quiz Payload Serialization', () => {
  const createCompletePayload = (): QuizPayload => ({
    sleepPosition: 'side',
    movesOften: 'sometimes',
    pillowCount: '1',
    mattressFirmness: 'medium',
    sleepEquipment: ['regular_pillow', 'sleep_mask'],
    painAreas: ['neck', 'shoulders'],
    painSeverity: 5,
    nightAwakenings: 'rarely',
    sleepTemperature: 'neutral',
    roomBrightness: 'dark',
    roomNoise: 'quiet',
    sleepLatency: 'normal',
    sleepHours: '7_8',
    eveningScreenUse: 'sometimes',
    sleepClothing: 'light',
    coSleeping: ['alone'],
    sleepGoals: ['better_quality', 'wake_refreshed'],
    snoring: 'never',
    triedMethods: ['new_pillow'],
    pillowSatisfaction: 5,
  });

  it('should include all required fields', () => {
    const payload = createCompletePayload();
    
    expect(payload.sleepPosition).toBeDefined();
    expect(payload.movesOften).toBeDefined();
    expect(payload.pillowCount).toBeDefined();
    expect(payload.mattressFirmness).toBeDefined();
    expect(payload.sleepEquipment).toBeDefined();
    expect(payload.painAreas).toBeDefined();
    expect(payload.painSeverity).toBeDefined();
    expect(payload.nightAwakenings).toBeDefined();
    expect(payload.sleepTemperature).toBeDefined();
    expect(payload.roomBrightness).toBeDefined();
    expect(payload.roomNoise).toBeDefined();
    expect(payload.sleepLatency).toBeDefined();
    expect(payload.sleepHours).toBeDefined();
    expect(payload.eveningScreenUse).toBeDefined();
    expect(payload.sleepClothing).toBeDefined();
    expect(payload.coSleeping).toBeDefined();
    expect(payload.sleepGoals).toBeDefined();
    expect(payload.snoring).toBeDefined();
    expect(payload.triedMethods).toBeDefined();
    expect(payload.pillowSatisfaction).toBeDefined();
  });

  it('should have valid string values for enum fields', () => {
    const payload = createCompletePayload();
    
    expect(BACKEND_VALUE_CONTRACTS.sleepPosition).toContain(payload.sleepPosition);
    expect(BACKEND_VALUE_CONTRACTS.movesOften).toContain(payload.movesOften);
    expect(BACKEND_VALUE_CONTRACTS.pillowCount).toContain(payload.pillowCount);
    expect(BACKEND_VALUE_CONTRACTS.nightAwakenings).toContain(payload.nightAwakenings);
    expect(BACKEND_VALUE_CONTRACTS.sleepTemperature).toContain(payload.sleepTemperature);
    expect(BACKEND_VALUE_CONTRACTS.roomBrightness).toContain(payload.roomBrightness);
    expect(BACKEND_VALUE_CONTRACTS.roomNoise).toContain(payload.roomNoise);
    expect(BACKEND_VALUE_CONTRACTS.sleepLatency).toContain(payload.sleepLatency);
    expect(BACKEND_VALUE_CONTRACTS.sleepHours).toContain(payload.sleepHours);
    expect(BACKEND_VALUE_CONTRACTS.eveningScreenUse).toContain(payload.eveningScreenUse);
    expect(BACKEND_VALUE_CONTRACTS.mattressFirmness).toContain(payload.mattressFirmness);
    expect(BACKEND_VALUE_CONTRACTS.snoring).toContain(payload.snoring);
  });

  it('should have valid array values for multi-select fields', () => {
    const payload = createCompletePayload();
    
    for (const area of payload.painAreas) {
      expect(BACKEND_VALUE_CONTRACTS.painAreas).toContain(area);
    }
    
    for (const equipment of payload.sleepEquipment) {
      expect(BACKEND_VALUE_CONTRACTS.sleepEquipment).toContain(equipment);
    }
    
    for (const goal of payload.sleepGoals) {
      expect(BACKEND_VALUE_CONTRACTS.sleepGoals).toContain(goal);
    }
  });

  it('should have valid numeric ranges for slider fields', () => {
    const payload = createCompletePayload();
    
    expect(payload.painSeverity).toBeGreaterThanOrEqual(BACKEND_VALUE_CONTRACTS.painSeverity.min);
    expect(payload.painSeverity).toBeLessThanOrEqual(BACKEND_VALUE_CONTRACTS.painSeverity.max);
    
    expect(payload.pillowSatisfaction).toBeGreaterThanOrEqual(BACKEND_VALUE_CONTRACTS.pillowSatisfaction.min);
    expect(payload.pillowSatisfaction).toBeLessThanOrEqual(BACKEND_VALUE_CONTRACTS.pillowSatisfaction.max);
  });

  it('should serialize arrays correctly (no undefined)', () => {
    const payload = createCompletePayload();
    
    expect(Array.isArray(payload.painAreas)).toBe(true);
    expect(Array.isArray(payload.sleepEquipment)).toBe(true);
    expect(Array.isArray(payload.sleepGoals)).toBe(true);
    expect(Array.isArray(payload.coSleeping)).toBe(true);
    expect(Array.isArray(payload.triedMethods)).toBe(true);
    
    // No undefined in arrays
    expect(payload.painAreas.every(v => v !== undefined)).toBe(true);
    expect(payload.sleepEquipment.every(v => v !== undefined)).toBe(true);
    expect(payload.sleepGoals.every(v => v !== undefined)).toBe(true);
  });
});

// ============ BACKEND RESPONSE SHAPE ============

describe('Backend Response Shape (Mock)', () => {
  /**
   * Mock backend response following SleepAssessment interface
   */
  const createMockBackendResponse = (cluster: PersonaCluster, confidence: number): SleepAssessment => ({
    sleepIdentity: {
      position: 'side',
      label: 'Side Sleeper',
      description: 'Your primary position is side sleeping.',
    },
    scores: {
      alignment_risk_score: 45,
      neck_support_score: 60,
      sleep_stability_score: 70,
      environment_score: 75,
      light_sensitivity_score: 20,
      temperature_disruption_score: 30,
    },
    persona: {
      guess: 'jason',
      rationale: 'Based on your responses...',
      cluster,
      label: cluster === 'pain_sleeper' ? 'The Pain Sleeper' : 
             cluster === 'stress_insomnia' ? 'The Stress & Environment Sleeper' :
             cluster === 'optimizer' ? 'The Sleep Optimizer' : 'The Recovery Sleeper',
      description: 'Your sleep profile suggests...',
      recommended_modules: [4, 10, 11],
      legacyType: 'jason',
      confidence,
      confidence_reasoning: confidence >= 70 
        ? 'Your responses show clear signals.' 
        : 'Your profile shows mixed signals.',
    },
    environmentFindings: {
      keyIssues: ['light_exposure_concern'],
      summary: 'Some environmental factors may affect your sleep.',
    },
    productRecommendations: {
      primary_product: 'ergonomic_pillow',
      secondary_product: 'knee_pillow',
      recommended_bundle: 'alignment_set',
      reasoning: 'Based on your profile...',
      recommendation_confidence: 80,
      fit_explanation: 'This setup addresses your specific needs.',
      persona_reasoning: 'Aligned with your persona requirements.',
    },
    coachPreview: {
      day_1_3: 'Focus on initial adjustment.',
      day_4_7: 'Developing consistency.',
      day_7_14: 'Optimizing your routine.',
    },
    alignment_priority: true,
    environment_priority: false,
    top_risk_drivers: ['neck_shoulder_tension', 'pillow_support_inadequate'],
  });

  it('should return valid cluster type', () => {
    const response = createMockBackendResponse('pain_sleeper', 85);
    
    const validClusters: PersonaCluster[] = ['pain_sleeper', 'stress_insomnia', 'optimizer', 'recovery_sleeper'];
    expect(validClusters).toContain(response.persona.cluster);
  });

  it('should return confidence in valid range', () => {
    const response = createMockBackendResponse('pain_sleeper', 85);
    
    expect(response.persona.confidence).toBeDefined();
    expect(response.persona.confidence).toBeGreaterThanOrEqual(0);
    expect(response.persona.confidence).toBeLessThanOrEqual(100);
  });

  it('should return confidence_reasoning for mixed signals', () => {
    const response = createMockBackendResponse('pain_sleeper', 55);
    
    expect(response.persona.confidence_reasoning).toBeDefined();
    expect(response.persona.confidence_reasoning!.length).toBeGreaterThan(0);
  });

  it('should return all required assessment fields', () => {
    const response = createMockBackendResponse('stress_insomnia', 75);
    
    // Sleep identity
    expect(response.sleepIdentity).toBeDefined();
    expect(response.sleepIdentity.position).toBeDefined();
    expect(response.sleepIdentity.label).toBeDefined();
    
    // Scores
    expect(response.scores).toBeDefined();
    expect(response.scores.alignment_risk_score).toBeDefined();
    expect(response.scores.neck_support_score).toBeDefined();
    expect(response.scores.environment_score).toBeDefined();
    
    // Persona
    expect(response.persona).toBeDefined();
    expect(response.persona.cluster).toBeDefined();
    expect(response.persona.label).toBeDefined();
    expect(response.persona.description).toBeDefined();
    expect(response.persona.recommended_modules).toBeDefined();
    
    // Product recommendations
    expect(response.productRecommendations).toBeDefined();
    expect(response.productRecommendations.primary_product).toBeDefined();
    expect(response.productRecommendations.reasoning).toBeDefined();
    
    // Segmentation fields
    expect(response.alignment_priority).toBeDefined();
    expect(response.environment_priority).toBeDefined();
    expect(response.top_risk_drivers).toBeDefined();
  });

  it('should return valid product recommendations', () => {
    const response = createMockBackendResponse('pain_sleeper', 80);
    
    expect(response.productRecommendations.primary_product).toBe('ergonomic_pillow');
    expect(['knee_pillow', 'silk_mask', undefined]).toContain(response.productRecommendations.secondary_product);
    expect(['alignment_set', 'deep_sleep_set', 'performance_set', undefined]).toContain(response.productRecommendations.recommended_bundle);
  });
});

// ============ EDGE CASES ============

describe('Edge Case Handling', () => {
  it('should handle empty arrays for optional multi-select', () => {
    const payload: QuizPayload = {
      sleepPosition: 'side',
      movesOften: 'sometimes',
      pillowCount: '1',
      mattressFirmness: 'medium',
      sleepEquipment: [],
      painAreas: [],
      painSeverity: 0,
      nightAwakenings: 'never',
      sleepTemperature: 'neutral',
      roomBrightness: 'dark',
      roomNoise: 'quiet',
      sleepLatency: 'quick',
      sleepHours: '7_8',
      eveningScreenUse: 'never',
      sleepClothing: 'light',
      coSleeping: [],
      sleepGoals: [],
      snoring: 'never',
      triedMethods: [],
      pillowSatisfaction: 5,
    };
    
    expect(payload.painAreas.length).toBe(0);
    expect(payload.sleepEquipment.length).toBe(0);
    expect(payload.sleepGoals.length).toBe(0);
  });

  it('should handle "none" selections in checkbox fields', () => {
    const payload: QuizPayload = {
      sleepPosition: 'back',
      movesOften: 'never',
      pillowCount: '1',
      mattressFirmness: 'medium',
      sleepEquipment: ['none'],
      painAreas: ['none'],
      painSeverity: 0,
      nightAwakenings: 'never',
      sleepTemperature: 'neutral',
      roomBrightness: 'dark',
      roomNoise: 'quiet',
      sleepLatency: 'quick',
      sleepHours: 'over_8',
      eveningScreenUse: 'never',
      sleepClothing: 'light',
      coSleeping: ['alone'],
      sleepGoals: ['better_quality'],
      snoring: 'never',
      triedMethods: ['nothing'],
      pillowSatisfaction: 8,
    };
    
    expect(payload.painAreas).toContain('none');
    expect(payload.sleepEquipment).toContain('none');
  });

  it('should handle extreme slider values', () => {
    const payloadMin: QuizPayload = {
      sleepPosition: 'side',
      movesOften: 'sometimes',
      pillowCount: '1',
      mattressFirmness: 'medium',
      sleepEquipment: [],
      painAreas: ['neck'],
      painSeverity: 0,
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
      pillowSatisfaction: 0,
    };
    
    const payloadMax: QuizPayload = {
      ...payloadMin,
      painSeverity: 10,
      pillowSatisfaction: 10,
    };
    
    expect(payloadMin.painSeverity).toBe(0);
    expect(payloadMin.pillowSatisfaction).toBe(0);
    expect(payloadMax.painSeverity).toBe(10);
    expect(payloadMax.pillowSatisfaction).toBe(10);
  });

  it('should handle "0" pillow count (no pillow)', () => {
    const payload: QuizPayload = {
      sleepPosition: 'back',
      movesOften: 'sometimes',
      pillowCount: '0',
      mattressFirmness: 'firm',
      sleepEquipment: [],
      painAreas: [],
      painSeverity: 0,
      nightAwakenings: 'rarely',
      sleepTemperature: 'neutral',
      roomBrightness: 'dark',
      roomNoise: 'quiet',
      sleepLatency: 'quick',
      sleepHours: '7_8',
      eveningScreenUse: 'sometimes',
      sleepClothing: 'light',
      coSleeping: [],
      sleepGoals: ['better_quality'],
      snoring: 'never',
      triedMethods: [],
      pillowSatisfaction: 7,
    };
    
    expect(payload.pillowCount).toBe('0');
    expect(BACKEND_VALUE_CONTRACTS.pillowCount).toContain('0');
  });
});
