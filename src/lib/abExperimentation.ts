/**
 * A/B Experimentation Platform - Core Logic
 * 
 * Includes:
 * - Bayesian significance calculation
 * - Business Impact Score (BIS) calculation
 * - Auto-stop rules engine
 * - Power zone validation
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type TestStatus = 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
export type ImpactZone = 'hero' | 'price_cta' | 'urgency_social' | 'other';
export type WinnerVariant = 'A' | 'B' | 'inconclusive';
export type AutoStopRule = 'performance_gap' | 'significance_reached' | 'plateau' | 'conflict';
export type ElementType = 'cta_button' | 'price_section' | 'gallery' | 'sticky_atc' | 'hero_props' | 'benefits' | 'urgency' | 'reviews';

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: TestStatus;
  impact_zone: ImpactZone;
  power_zone_weight: number;
  variant_a_config: Record<string, unknown>;
  variant_b_config: Record<string, unknown>;
  traffic_split: number;
  min_sample_size: number;
  significance_method: 'bayesian' | 'frequentist';
  significance_threshold: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_variant?: WinnerVariant;
  winner_declared_at?: string;
  winner_reason?: string;
  bis_raw_a: number;
  bis_raw_b: number;
  bis_final_a: number;
  bis_final_b: number;
  confidence_adjuster_a: number;
  confidence_adjuster_b: number;
  projected_annual_impact: number;
  auto_stopped: boolean;
  auto_stop_reason?: string;
  auto_stop_rule?: AutoStopRule;
  sessions_a: number;
  sessions_b: number;
  conversions_a: number;
  conversions_b: number;
  revenue_a: number;
  revenue_b: number;
  aov_a: number;
  aov_b: number;
  cvr_a: number;
  cvr_b: number;
}

export interface ABTestArchive {
  id: string;
  test_id: string;
  test_name: string;
  snapshot_json: Record<string, unknown>;
  metrics_summary: Record<string, unknown>;
  winner?: WinnerVariant;
  lift_percent?: number;
  total_sessions: number;
  total_revenue: number;
  learning_template: {
    what_changed: string;
    why_worked: string;
    future_use: string;
  };
  is_restorable: boolean;
  archived_at: string;
  archived_by?: string;
}

export interface IntentEvent {
  id: string;
  test_id?: string;
  session_id: string;
  ab_variant: 'A' | 'B';
  element_type: ElementType;
  event_type: 'click' | 'hover' | 'scroll_into_view';
  led_to_atc: boolean;
  led_to_checkout: boolean;
  timestamp: string;
  page_path?: string;
}

// ============================================================================
// POWER ZONE CONFIGURATION
// ============================================================================

export const POWER_ZONES: Record<ImpactZone, { weight: number; maxConcurrent: number; exclusive: boolean }> = {
  price_cta: { weight: 1.0, maxConcurrent: 1, exclusive: true },
  urgency_social: { weight: 0.9, maxConcurrent: 1, exclusive: true },
  hero: { weight: 0.7, maxConcurrent: 1, exclusive: false },
  other: { weight: 0.5, maxConcurrent: 2, exclusive: false },
};

// ============================================================================
// BAYESIAN SIGNIFICANCE CALCULATION
// ============================================================================

/**
 * Calculate Bayesian probability that B is better than A
 * Uses Beta distribution approximation
 */
export function calculateBayesianSignificance(
  conversionsA: number,
  sessionsA: number,
  conversionsB: number,
  sessionsB: number
): { probabilityBBetter: number; significanceReached: boolean } {
  // Minimum sample size check
  if (sessionsA < 300 || sessionsB < 300) {
    return { probabilityBBetter: 0.5, significanceReached: false };
  }

  // Beta distribution parameters (using Jeffrey's prior: alpha=0.5, beta=0.5)
  const alphaA = conversionsA + 0.5;
  const betaA = sessionsA - conversionsA + 0.5;
  const alphaB = conversionsB + 0.5;
  const betaB = sessionsB - conversionsB + 0.5;

  // Monte Carlo simulation for P(B > A)
  const simulations = 10000;
  let bWins = 0;

  for (let i = 0; i < simulations; i++) {
    const sampleA = betaSample(alphaA, betaA);
    const sampleB = betaSample(alphaB, betaB);
    if (sampleB > sampleA) bWins++;
  }

  const probabilityBBetter = bWins / simulations;
  const significanceReached = probabilityBBetter > 0.95 || probabilityBBetter < 0.05;

  return { probabilityBBetter, significanceReached };
}

/**
 * Sample from Beta distribution using transformation method
 */
function betaSample(alpha: number, beta: number): number {
  const gammaA = gammaSample(alpha);
  const gammaB = gammaSample(beta);
  return gammaA / (gammaA + gammaB);
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Box-Muller transform for normal distribution sample
 */
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ============================================================================
// BUSINESS IMPACT SCORE (BIS)
// ============================================================================

const DEFAULT_MARGIN = 0.35; // 35% profit margin

/**
 * Calculate Business Impact Score
 * BIS = (CVR × AOV × Margin) × Traffic Weight
 */
export function calculateBIS(
  cvr: number,
  aov: number,
  margin: number = DEFAULT_MARGIN,
  trafficWeight: number = 0.5
): number {
  return cvr * aov * margin * trafficWeight;
}

/**
 * Calculate confidence adjuster based on sample stability
 * Returns value between 0.5 (low confidence) and 1.0 (high confidence)
 */
export function calculateConfidenceAdjuster(
  sessions: number,
  minSampleSize: number,
  varianceStability: number = 0.8,
  daysRunning: number = 0
): number {
  // Sample size factor (0-0.4)
  const sampleFactor = Math.min(sessions / (minSampleSize * 3), 1) * 0.4;
  
  // Stability factor (0-0.3)
  const stabilityFactor = varianceStability * 0.3;
  
  // Time factor (0-0.3)
  const timeFactor = Math.min(daysRunning / 14, 1) * 0.3;
  
  return 0.5 + sampleFactor + stabilityFactor + timeFactor;
}

/**
 * Calculate projected annual impact
 */
export function calculateProjectedAnnualImpact(
  bisA: number,
  bisB: number,
  dailyTraffic: number = 1000
): number {
  const dailyDifference = (bisB - bisA) * dailyTraffic;
  return dailyDifference * 365;
}

// ============================================================================
// AUTO-STOP RULES ENGINE
// ============================================================================

export interface AutoStopResult {
  shouldStop: boolean;
  rule?: AutoStopRule;
  reason?: string;
}

/**
 * Check all auto-stop rules
 */
export function checkAutoStopRules(test: ABTest): AutoStopResult {
  const totalSessions = test.sessions_a + test.sessions_b;
  
  // Rule A: Performance gap (B is >20% worse at 500+ sessions)
  if (totalSessions >= 500 && test.cvr_a > 0 && test.cvr_b > 0) {
    const gap = ((test.cvr_a - test.cvr_b) / test.cvr_a) * 100;
    if (gap > 20) {
      return {
        shouldStop: true,
        rule: 'performance_gap',
        reason: `Variant B is ${gap.toFixed(1)}% worse than A after ${totalSessions} sessions`,
      };
    }
  }

  // Rule B: Significance reached
  if (test.sessions_a >= test.min_sample_size && test.sessions_b >= test.min_sample_size) {
    const { significanceReached, probabilityBBetter } = calculateBayesianSignificance(
      test.conversions_a,
      test.sessions_a,
      test.conversions_b,
      test.sessions_b
    );
    
    if (significanceReached) {
      const winner = probabilityBBetter > 0.5 ? 'B' : 'A';
      return {
        shouldStop: true,
        rule: 'significance_reached',
        reason: `95% significance reached. Variant ${winner} is the winner.`,
      };
    }
  }

  // Rule C: Plateau detection (would need historical data - simplified)
  // TODO: Implement with time-series data

  return { shouldStop: false };
}

// ============================================================================
// ZONE CONFLICT VALIDATION
// ============================================================================

/**
 * Check if a new test conflicts with active tests
 */
export async function checkZoneConflicts(
  impactZone: ImpactZone,
  excludeTestId?: string
): Promise<{ hasConflict: boolean; conflictingTests: string[] }> {
  const { data: activeTests, error } = await supabase
    .from('ab_tests')
    .select('id, name, impact_zone')
    .eq('status', 'active');

  if (error || !activeTests) {
    console.error('Failed to check zone conflicts:', error);
    return { hasConflict: false, conflictingTests: [] };
  }

  const filteredTests = activeTests.filter(t => t.id !== excludeTestId);
  const zoneConfig = POWER_ZONES[impactZone];

  // Check for exclusive zones (price_cta, urgency_social)
  if (zoneConfig.exclusive) {
    const conflicting = filteredTests
      .filter(t => t.impact_zone === impactZone || 
                   (impactZone === 'price_cta' && t.impact_zone === 'urgency_social') ||
                   (impactZone === 'urgency_social' && t.impact_zone === 'price_cta'))
      .map(t => t.name);

    if (conflicting.length > 0) {
      return { hasConflict: true, conflictingTests: conflicting };
    }
  }

  // Check max concurrent in zone
  const sameZoneTests = filteredTests.filter(t => t.impact_zone === impactZone);
  if (sameZoneTests.length >= zoneConfig.maxConcurrent) {
    return { 
      hasConflict: true, 
      conflictingTests: sameZoneTests.map(t => t.name) 
    };
  }

  // Check total active tests (max 3)
  if (filteredTests.length >= 3) {
    return {
      hasConflict: true,
      conflictingTests: ['Maximum 3 active tests reached'],
    };
  }

  return { hasConflict: false, conflictingTests: [] };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Fetch all tests with optional status filter
 */
export async function fetchTests(status?: TestStatus): Promise<ABTest[]> {
  let query = supabase.from('ab_tests').select('*').order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch tests:', error);
    return [];
  }

  return (data || []) as ABTest[];
}

/**
 * Create a new test
 */
export async function createTest(test: {
  name: string;
  description?: string;
  impact_zone: ImpactZone;
  power_zone_weight?: number;
  variant_a_config?: Record<string, unknown>;
  variant_b_config?: Record<string, unknown>;
  traffic_split?: number;
  min_sample_size?: number;
}): Promise<ABTest | null> {
  const { data, error } = await supabase
    .from('ab_tests')
    .insert([{
      ...test,
      variant_a_config: test.variant_a_config || {},
      variant_b_config: test.variant_b_config || {},
    }])
    .select()
    .single();

  if (error) {
    console.error('Failed to create test:', error);
    return null;
  }

  return data as ABTest;
}

/**
 * Update a test
 */
export async function updateTest(id: string, updates: Partial<ABTest>): Promise<ABTest | null> {
  const { data, error } = await supabase
    .from('ab_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update test:', error);
    return null;
  }

  return data as ABTest;
}

/**
 * Archive a test
 */
export async function archiveTest(
  test: ABTest, 
  learningTemplate: { what_changed: string; why_worked: string; future_use: string }
): Promise<ABTestArchive | null> {
  const { data, error } = await supabase
    .from('ab_test_archive')
    .insert([{
      test_id: test.id,
      test_name: test.name,
      snapshot_json: JSON.parse(JSON.stringify(test)),
      metrics_summary: JSON.parse(JSON.stringify({
        sessions_a: test.sessions_a,
        sessions_b: test.sessions_b,
        cvr_a: test.cvr_a,
        cvr_b: test.cvr_b,
        revenue_a: test.revenue_a,
        revenue_b: test.revenue_b,
        bis_final_a: test.bis_final_a,
        bis_final_b: test.bis_final_b,
      })),
      winner: test.winner_variant,
      lift_percent: test.cvr_a > 0 ? ((test.cvr_b - test.cvr_a) / test.cvr_a) * 100 : null,
      total_sessions: test.sessions_a + test.sessions_b,
      total_revenue: test.revenue_a + test.revenue_b,
      learning_template: JSON.parse(JSON.stringify(learningTemplate)),
      is_restorable: true,
    }])
    .select()
    .single();

  if (error) {
    console.error('Failed to archive test:', error);
    return null;
  }

  // Update test status to completed
  await updateTest(test.id, { status: 'completed', ended_at: new Date().toISOString() });

  return data as ABTestArchive;
}

/**
 * Fetch archived tests
 */
export async function fetchArchivedTests(limit: number = 12): Promise<ABTestArchive[]> {
  const { data, error } = await supabase
    .from('ab_test_archive')
    .select('*')
    .order('archived_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch archived tests:', error);
    return [];
  }

  return (data || []) as ABTestArchive[];
}

/**
 * Restore a test from archive
 */
export async function restoreTest(archiveId: string): Promise<ABTest | null> {
  const { data: archive, error: fetchError } = await supabase
    .from('ab_test_archive')
    .select('*')
    .eq('id', archiveId)
    .single();

  if (fetchError || !archive) {
    console.error('Failed to fetch archive:', fetchError);
    return null;
  }

  const snapshot = archive.snapshot_json as Record<string, unknown>;
  
  // Create new test from snapshot (reset metrics)
  const newTest = {
    name: `${snapshot.name} (Restored)`,
    description: snapshot.description as string,
    status: 'draft' as TestStatus,
    impact_zone: snapshot.impact_zone as ImpactZone,
    power_zone_weight: snapshot.power_zone_weight as number,
    variant_a_config: snapshot.variant_a_config as Record<string, unknown>,
    variant_b_config: snapshot.variant_b_config as Record<string, unknown>,
    traffic_split: snapshot.traffic_split as number,
    min_sample_size: snapshot.min_sample_size as number,
    significance_method: snapshot.significance_method as 'bayesian' | 'frequentist',
    significance_threshold: snapshot.significance_threshold as number,
  };

  return createTest(newTest);
}

/**
 * Track intent event
 */
export async function trackIntentEvent(event: Omit<IntentEvent, 'id' | 'timestamp'>): Promise<void> {
  const { error } = await supabase
    .from('ab_intent_events')
    .insert([event]);

  if (error) {
    console.error('Failed to track intent event:', error);
  }
}
