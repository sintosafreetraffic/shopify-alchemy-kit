/**
 * A/B Experimentation Safety Utilities
 * 
 * Defensive helpers to prevent NaN, undefined, and display errors
 * Always use these when displaying metrics to users
 */

import type { ABTest } from './abExperimentation';

// ============================================================================
// SAFE NUMBER FORMATTING
// ============================================================================

/**
 * Safely format a number with fallback
 * Returns '—' for NaN, undefined, null, or Infinity
 */
export function safeNumber(value: number | null | undefined, fallback: string = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return value.toLocaleString();
}

/**
 * Safely format a percentage with fallback
 * Returns '—' for invalid values
 */
export function safePercent(value: number | null | undefined, decimals: number = 1, fallback: string = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Safely format currency with fallback
 */
export function safeCurrency(
  value: number | null | undefined, 
  currency: string = '€',
  decimals: number = 2,
  fallback: string = '—'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return `${currency}${value.toFixed(decimals)}`;
}

/**
 * Safely format a BIS value
 */
export function safeBIS(value: number | null | undefined, fallback: string = '—'): string {
  return safeCurrency(value, '€', 2, fallback);
}

/**
 * Safely calculate lift percentage between two values
 */
export function safeLift(baseline: number | null | undefined, comparison: number | null | undefined): number | null {
  if (!baseline || !comparison || !Number.isFinite(baseline) || !Number.isFinite(comparison)) {
    return null;
  }
  if (baseline === 0) {
    return null;
  }
  return ((comparison - baseline) / baseline) * 100;
}

/**
 * Format lift as signed percentage string
 */
export function formatLift(liftPercent: number | null | undefined, fallback: string = '—'): string {
  if (liftPercent === null || liftPercent === undefined || !Number.isFinite(liftPercent)) {
    return fallback;
  }
  const sign = liftPercent > 0 ? '+' : '';
  return `${sign}${liftPercent.toFixed(1)}%`;
}

// ============================================================================
// TEST VALIDATION
// ============================================================================

export interface TestValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate a test has the minimum data needed for analysis
 */
export function validateTestData(test: ABTest): TestValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check sessions
  if (!test.sessions_a && !test.sessions_b) {
    errors.push('No session data recorded yet');
  } else if (test.sessions_a < 10 || test.sessions_b < 10) {
    warnings.push('Very low session count - results may be unreliable');
  }

  // Check for zero divisions
  if (test.sessions_a === 0 && test.status === 'active') {
    warnings.push('Variant A has no sessions - check tracking');
  }
  if (test.sessions_b === 0 && test.status === 'active') {
    warnings.push('Variant B has no sessions - check tracking');
  }

  // Check CVR sanity (should be 0-1, not 0-100)
  if (test.cvr_a > 1 || test.cvr_b > 1) {
    errors.push('CVR values appear to be in wrong format (should be 0-1, not 0-100)');
  }

  // Check for extremely high or low CVR
  if (test.cvr_a > 0.5 || test.cvr_b > 0.5) {
    warnings.push('CVR above 50% is unusual - verify tracking');
  }

  // Check BIS sanity
  if ((test.bis_final_a < 0 || test.bis_final_b < 0) && test.status === 'active') {
    errors.push('Negative BIS values detected - check margin settings');
  }

  // Check for absurd BIS values
  const maxReasonableBIS = 1000; // €1000 per session would be extremely unusual
  if (test.bis_final_a > maxReasonableBIS || test.bis_final_b > maxReasonableBIS) {
    warnings.push('BIS values are unusually high - verify AOV and margin');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

export type TestReadiness = 'collecting' | 'exploratory' | 'decision-ready' | 'concluded';

/**
 * Determine test readiness level for UI display
 */
export function getTestReadiness(test: ABTest): TestReadiness {
  const totalSessions = (test.sessions_a || 0) + (test.sessions_b || 0);
  const minPerVariant = test.min_sample_size || 300;
  
  if (test.status === 'completed' || test.winner_variant) {
    return 'concluded';
  }
  
  if (totalSessions < 100) {
    return 'collecting';
  }
  
  if (test.sessions_a < minPerVariant || test.sessions_b < minPerVariant) {
    return 'exploratory';
  }
  
  return 'decision-ready';
}

/**
 * Get human-readable status label
 */
export function getReadinessLabel(readiness: TestReadiness): string {
  switch (readiness) {
    case 'collecting':
      return 'Collecting Data';
    case 'exploratory':
      return 'Exploratory';
    case 'decision-ready':
      return 'Decision-Ready';
    case 'concluded':
      return 'Concluded';
  }
}

/**
 * Get color scheme for readiness badge
 */
export function getReadinessColor(readiness: TestReadiness): 'secondary' | 'default' | 'destructive' | 'outline' {
  switch (readiness) {
    case 'collecting':
      return 'secondary';
    case 'exploratory':
      return 'outline';
    case 'decision-ready':
      return 'default';
    case 'concluded':
      return 'secondary';
  }
}

// ============================================================================
// AUTO-STOP CLARIFICATION
// ============================================================================

/**
 * Get clear copy for auto-stop recommendations
 * IMPORTANT: We only RECOMMEND stopping, never auto-stop silently
 */
export function getAutoStopCopy(rule: string, reason: string): {
  title: string;
  description: string;
  severity: 'warning' | 'info' | 'success';
} {
  switch (rule) {
    case 'performance_gap':
      return {
        title: 'Recommended: Stop Test',
        description: reason,
        severity: 'warning',
      };
    case 'significance_reached':
      return {
        title: 'Winner Detected',
        description: reason,
        severity: 'success',
      };
    case 'plateau':
      return {
        title: 'Consider Ending: Plateau',
        description: 'Metrics have stabilized with minimal difference. Consider ending as inconclusive.',
        severity: 'info',
      };
    default:
      return {
        title: 'Review Required',
        description: reason || 'Please review this test manually.',
        severity: 'info',
      };
  }
}

// ============================================================================
// PROJECTED IMPACT DISCLAIMER
// ============================================================================

export const PROJECTED_IMPACT_DISCLAIMER = 
  'Based on current traffic & margin assumptions. Actual results may vary.';

export const STATISTICAL_METHOD_NOTE = 
  'Bayesian analysis with 95% credible interval. Minimum 300 sessions per variant required.';
