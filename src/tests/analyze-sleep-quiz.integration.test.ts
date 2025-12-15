/**
 * Sleep Quiz Backend Integration Tests
 * 
 * This suite is the contract guardrail between QuizConfig.ts and sleep-assessment.ts.
 * 
 * Tests the analyze-sleep-quiz edge function with real persona detection logic
 * to ensure frontend quiz answer values produce correct persona clusters
 * and response shapes.
 * 
 * NETWORK-DEPENDENT: These tests require a deployed analyze-sleep-quiz edge function.
 * They will gracefully skip if the edge function is unavailable.
 * 
 * Prerequisites:
 * - Edge function must be deployed to Supabase
 * - VITE_SUPABASE_URL environment variable (optional, defaults to production)
 * 
 * Environment Override:
 * - Set VITE_SUPABASE_URL to test against a different environment
 * - Example: VITE_SUPABASE_URL=https://yourproject.supabase.co npx vitest run ...
 * 
 * Run with:
 * - Unit tests only: npm run test:quiz:unit
 * - Integration tests: npm run test:quiz:int
 * - All quiz tests: npm run test:quiz:all
 * 
 * @module Backend Integration Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ============ CONFIGURATION ============

/**
 * Edge function URL
 * Uses environment variable or defaults to production
 */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ofryballwrjrgivokzln.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-sleep-quiz`;

// ============ TYPE DEFINITIONS ============

type PersonaCluster = 'pain_sleeper' | 'stress_insomnia' | 'optimizer' | 'recovery_sleeper';

interface QuizPayload {
  sleepPosition: string;
  movesOften?: string;
  pillowCount?: string;
  mattressFirmness?: string;
  sleepEquipment?: string[];
  painAreas?: string[];
  painSeverity?: number;
  nightAwakenings?: string;
  sleepTemperature?: string;
  roomBrightness?: string;
  roomNoise?: string;
  sleepLatency?: string;
  sleepHours?: string;
  eveningScreenUse?: string;
  sleepClothing?: string;
  coSleeping?: string[];
  sleepGoals?: string[];
  snoring?: string;
  triedMethods?: string[];
  pillowSatisfaction?: number;
}

interface SleepAssessmentResponse {
  assessment: {
    sleepIdentity: {
      position: string;
      label: string;
      description: string;
    };
    scores: {
      alignment_risk_score: number;
      neck_support_score: number;
      sleep_stability_score: number;
      environment_score: number;
      light_sensitivity_score: number;
      temperature_disruption_score: number;
    };
    persona: {
      cluster: PersonaCluster;
      confidence?: number;
      confidence_reasoning?: string;
      label: string;
      description: string;
      recommended_modules: number[];
      guess: string;
      rationale: string;
    };
    productRecommendations: {
      primary_product: string;
      secondary_product?: string;
      recommended_bundle?: string;
      reasoning: string;
      recommendation_confidence: number;
      fit_explanation: string;
      persona_reasoning: string;
    };
    alignment_priority: boolean;
    environment_priority: boolean;
    top_risk_drivers: string[];
    environmentFindings: {
      keyIssues: string[];
      summary: string;
    };
    coachPreview: {
      day_1_3: string;
      day_4_7: string;
      day_7_14: string;
    };
  };
  recommendations: Array<{
    product: string;
    reason: string;
    priority: string;
  }>;
  bundleRecommended: boolean;
  profileCreated?: boolean;
  profileUpdated?: boolean;
}

// ============ TEST FIXTURES ============

/**
 * Base payload with neutral defaults
 */
const basePayload: QuizPayload = {
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

/**
 * Pain Sleeper (Jason) - Clear alignment/pain archetype
 */
const painSleeperPayload: QuizPayload = {
  ...basePayload,
  sleepPosition: 'side',
  movesOften: 'often',
  pillowCount: '1',
  painAreas: ['neck', 'shoulders', 'lower_back'],
  painSeverity: 7,
  pillowSatisfaction: 2,
  sleepGoals: ['reduce_pain', 'better_posture', 'wake_refreshed'],
  nightAwakenings: 'once',
  sleepTemperature: 'neutral',
  roomBrightness: 'dark',
  roomNoise: 'quiet',
  sleepLatency: 'normal',
};

/**
 * Stress & Environment Sleeper (Mila) - Clear environment/wind-down archetype
 */
const stressSleeperPayload: QuizPayload = {
  ...basePayload,
  sleepPosition: 'back',
  movesOften: 'often',
  painAreas: [],
  painSeverity: 1,
  pillowSatisfaction: 5,
  sleepGoals: ['fall_asleep_faster', 'stay_asleep', 'better_quality'],
  nightAwakenings: 'frequently',
  sleepTemperature: 'hot',
  roomBrightness: 'bright',
  roomNoise: 'noisy',
  sleepLatency: 'very_slow',
  sleepHours: '5_6',
  eveningScreenUse: 'always',
};

/**
 * Recovery Sleeper (Riley) - Clear performance/recovery archetype
 */
const recoverySleeperPayload: QuizPayload = {
  ...basePayload,
  sleepPosition: 'back',
  movesOften: 'sometimes',
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
};

/**
 * Optimizer (Leo) - Clear optimization archetype
 */
const optimizerPayload: QuizPayload = {
  ...basePayload,
  sleepPosition: 'combination',
  movesOften: 'sometimes',
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
  eveningScreenUse: 'never',
};

/**
 * Mixed Signals - Ambiguous case with competing signals
 */
const mixedSignalsPayload: QuizPayload = {
  ...basePayload,
  sleepPosition: 'side',
  movesOften: 'sometimes',
  pillowCount: '2',
  mattressFirmness: 'soft',
  painAreas: ['neck'],
  painSeverity: 4,
  pillowSatisfaction: 4,
  sleepGoals: ['reduce_pain', 'stay_asleep'],
  nightAwakenings: 'twice',
  sleepTemperature: 'hot',
  roomBrightness: 'dim',
  roomNoise: 'some',
  sleepLatency: 'slow',
  sleepHours: '6_7',
  eveningScreenUse: 'often',
};

// ============ HELPER FUNCTIONS ============

/**
 * Call the analyze-sleep-quiz edge function
 */
async function callAnalyzeQuiz(
  answers: QuizPayload,
  options: { email?: string; createProfile?: boolean } = {}
): Promise<{ data: SleepAssessmentResponse | null; error: string | null; status: number }> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers,
        email: options.email,
        createProfile: options.createProfile ?? false,
      }),
    });

    const status = response.status;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: errorData.error || `HTTP ${status}`, status };
    }

    const data = await response.json();
    return { data, error: null, status };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error', status: 0 };
  }
}

// ============ TEST SUITES ============

let edgeFunctionAvailable = true;

describe('Backend Integration: analyze-sleep-quiz', () => {
  // Check connectivity before running tests
  beforeAll(async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-sleep-quiz`, {
        method: 'OPTIONS',
      });
      if (!response.ok && response.status !== 204 && response.status !== 0) {
        console.warn('⚠️ Edge function returned non-OK status, tests may fail');
      }
    } catch (e) {
      console.warn('⚠️ Cannot reach edge function - integration tests will be skipped');
      console.warn('   To run integration tests, ensure the edge function is deployed.');
      console.warn(`   Current URL: ${EDGE_FUNCTION_URL}`);
      edgeFunctionAvailable = false;
    }
  });

  describe('Clear Archetype Detection', () => {
    it('should detect Pain Sleeper with ≥70% confidence', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(painSleeperPayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;
      expect(assessment.persona.cluster).toBe('pain_sleeper');
      
      // Confidence check (if returned by backend)
      if (assessment.persona.confidence !== undefined) {
        expect(assessment.persona.confidence).toBeGreaterThanOrEqual(70);
      }
    });

    it('should detect Stress & Environment Sleeper with ≥70% confidence', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(stressSleeperPayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;
      expect(assessment.persona.cluster).toBe('stress_insomnia');
      
      if (assessment.persona.confidence !== undefined) {
        expect(assessment.persona.confidence).toBeGreaterThanOrEqual(70);
      }
    });

    it('should detect Recovery Sleeper with ≥70% confidence', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(recoverySleeperPayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;
      expect(assessment.persona.cluster).toBe('recovery_sleeper');
      
      if (assessment.persona.confidence !== undefined) {
        expect(assessment.persona.confidence).toBeGreaterThanOrEqual(70);
      }
    });

    it('should detect Optimizer with ≥70% confidence', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(optimizerPayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;
      expect(assessment.persona.cluster).toBe('optimizer');
      
      if (assessment.persona.confidence !== undefined) {
        expect(assessment.persona.confidence).toBeGreaterThanOrEqual(70);
      }
    });
  });

  describe('Mixed Signals Detection', () => {
    it('should detect mixed signals with <70% confidence and appropriate reasoning', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(mixedSignalsPayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;
      
      // Should be one of the plausible clusters
      expect(['pain_sleeper', 'stress_insomnia']).toContain(assessment.persona.cluster);
      
      // Confidence should be lower for mixed signals
      if (assessment.persona.confidence !== undefined) {
        expect(assessment.persona.confidence).toBeLessThan(70);
      }
      
      // Reasoning should mention mixed/balanced
      if (assessment.persona.confidence_reasoning) {
        const reasoning = assessment.persona.confidence_reasoning.toLowerCase();
        expect(
          reasoning.includes('mixed') ||
          reasoning.includes('balanced') ||
          reasoning.includes('multiple') ||
          reasoning.includes('competing') ||
          reasoning.includes('secondary')
        ).toBe(true);
      }
    });
  });

  describe('Response Shape Validation', () => {
    it('should return complete SleepAssessment structure', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error, status } = await callAnalyzeQuiz(basePayload);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).not.toBeNull();

      const { assessment } = data!;

      // Sleep Identity
      expect(assessment.sleepIdentity).toBeDefined();
      expect(assessment.sleepIdentity.position).toBeDefined();
      expect(assessment.sleepIdentity.label).toBeDefined();
      expect(assessment.sleepIdentity.description).toBeDefined();

      // Scores
      expect(assessment.scores).toBeDefined();
      expect(typeof assessment.scores.alignment_risk_score).toBe('number');
      expect(typeof assessment.scores.neck_support_score).toBe('number');
      expect(typeof assessment.scores.sleep_stability_score).toBe('number');
      expect(typeof assessment.scores.environment_score).toBe('number');
      expect(typeof assessment.scores.light_sensitivity_score).toBe('number');
      expect(typeof assessment.scores.temperature_disruption_score).toBe('number');

      // Persona
      expect(assessment.persona).toBeDefined();
      expect(assessment.persona.cluster).toBeDefined();
      expect(['pain_sleeper', 'stress_insomnia', 'optimizer', 'recovery_sleeper']).toContain(assessment.persona.cluster);
      expect(assessment.persona.label).toBeDefined();
      expect(assessment.persona.description).toBeDefined();
      expect(Array.isArray(assessment.persona.recommended_modules)).toBe(true);

      // Product Recommendations
      expect(assessment.productRecommendations).toBeDefined();
      expect(assessment.productRecommendations.primary_product).toBe('ergonomic_pillow');
      expect(assessment.productRecommendations.reasoning).toBeDefined();
      expect(typeof assessment.productRecommendations.recommendation_confidence).toBe('number');

      // Segmentation Fields
      expect(typeof assessment.alignment_priority).toBe('boolean');
      expect(typeof assessment.environment_priority).toBe('boolean');
      expect(Array.isArray(assessment.top_risk_drivers)).toBe(true);

      // Environment Findings
      expect(assessment.environmentFindings).toBeDefined();
      expect(Array.isArray(assessment.environmentFindings.keyIssues)).toBe(true);
      expect(typeof assessment.environmentFindings.summary).toBe('string');

      // Coach Preview
      expect(assessment.coachPreview).toBeDefined();
      expect(assessment.coachPreview.day_1_3).toBeDefined();
      expect(assessment.coachPreview.day_4_7).toBeDefined();
      expect(assessment.coachPreview.day_7_14).toBeDefined();
    });

    it('should return recommendations array and bundleRecommended flag', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const { data, error } = await callAnalyzeQuiz(painSleeperPayload);

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      expect(Array.isArray(data!.recommendations)).toBe(true);
      expect(typeof data!.bundleRecommended).toBe('boolean');
    });
  });

  describe('Contract Safety Checks', () => {
    it('should accept valid payload without errors', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      const validPayload: QuizPayload = {
        sleepPosition: 'side',
        movesOften: 'sometimes',
        pillowCount: '2',
        mattressFirmness: 'medium',
        sleepEquipment: ['regular_pillow', 'sleep_mask'],
        painAreas: ['neck', 'shoulders'],
        painSeverity: 5,
        nightAwakenings: 'once',
        sleepTemperature: 'neutral',
        roomBrightness: 'dim',
        roomNoise: 'some',
        sleepLatency: 'normal',
        sleepHours: '7_8',
        eveningScreenUse: 'sometimes',
        sleepClothing: 'light',
        coSleeping: ['partner'],
        sleepGoals: ['better_quality', 'reduce_pain'],
        snoring: 'sometimes',
        triedMethods: ['new_pillow'],
        pillowSatisfaction: 6,
      };

      const { data, error, status } = await callAnalyzeQuiz(validPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.assessment).toBeDefined();
    });

    it('should reject invalid sleepPosition value with 400 error', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const invalidPayload = {
        ...basePayload,
        sleepPosition: 'invalid_position', // Not in enum
      };

      const { status } = await callAnalyzeQuiz(invalidPayload as unknown as QuizPayload);

      // Backend should reject with validation error
      expect(status).toBe(400);
    });

    it('should handle unexpected sleepHours value gracefully', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const unexpectedPayload = {
        ...basePayload,
        sleepHours: 'under5', // Wrong format, should be "less_than_5"
      };

      const { data, error, status } = await callAnalyzeQuiz(unexpectedPayload);

      // Backend should either:
      // 1. Reject with 400 (strict validation), or
      // 2. Accept and use default (lenient handling)
      if (status === 400) {
        // Strict validation - expected behavior
        expect(error).not.toBeNull();
      } else {
        // Lenient handling - also acceptable
        expect(status).toBe(200);
        expect(data).not.toBeNull();
      }
    });

    it('should handle empty arrays for optional multi-select fields', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const emptyArraysPayload: QuizPayload = {
        ...basePayload,
        painAreas: [],
        sleepEquipment: [],
        sleepGoals: [],
        coSleeping: [],
        triedMethods: [],
      };

      const { data, error, status } = await callAnalyzeQuiz(emptyArraysPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it('should handle edge slider values (0 and 10)', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const edgeValuesPayload: QuizPayload = {
        ...basePayload,
        painSeverity: 0,
        pillowSatisfaction: 10,
      };

      const { data, error, status } = await callAnalyzeQuiz(edgeValuesPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it('should handle "0" pillow count (no pillow)', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const noPillowPayload: QuizPayload = {
        ...basePayload,
        pillowCount: '0',
      };

      const { data, error, status } = await callAnalyzeQuiz(noPillowPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it('should handle smart_watch in sleepEquipment', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const smartWatchPayload: QuizPayload = {
        ...basePayload,
        sleepEquipment: ['smart_watch', 'fitness_tracker'],
        sleepGoals: ['faster_recovery', 'more_energy'],
      };

      const { data, error, status } = await callAnalyzeQuiz(smartWatchPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it('should handle muscle_repair in sleepGoals', async () => {
      if (!edgeFunctionAvailable) {
        console.log('⏭️ Skipping: Edge function not available');
        return;
      }
      
      const muscleRepairPayload: QuizPayload = {
        ...basePayload,
        sleepGoals: ['muscle_repair', 'faster_recovery', 'better_recovery'],
      };

      const { data, error, status } = await callAnalyzeQuiz(muscleRepairPayload);

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).not.toBeNull();

      // Should detect recovery-focused persona
      const { assessment } = data!;
      expect(['recovery_sleeper', 'optimizer']).toContain(assessment.persona.cluster);
    });
  });
});
