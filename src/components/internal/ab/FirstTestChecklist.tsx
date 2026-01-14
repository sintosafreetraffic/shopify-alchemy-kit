/**
 * Experimentation System Health Widget
 * 
 * A read-only health indicator showing 5 database-driven auto-checks.
 * No manual interaction required - all checks are computed from the database.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

interface HealthCheck {
  id: string;
  label: string;
  description: string;
  failureHint: string;
  checkFn: () => Promise<{ passed: boolean; detail?: string }>;
}

interface CheckResult {
  passed: boolean;
  loading: boolean;
  error: boolean;
  detail?: string;
}

// ============================================================================
// Auto-Check Definitions (5 database-driven checks)
// ============================================================================

const HEALTH_CHECKS: HealthCheck[] = [
  {
    id: 'test_exists',
    label: 'A/B tests exist',
    description: 'At least one test created in the system',
    failureHint: 'Create your first A/B test to begin experimenting.',
    checkFn: async () => {
      const { count, error } = await supabase
        .from('ab_tests')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      const exists = (count || 0) > 0;
      return { 
        passed: exists, 
        detail: exists ? `${count} test(s) found` : 'No tests created yet' 
      };
    },
  },
  {
    id: 'events_flowing',
    label: 'Events flowing (24h)',
    description: 'Intent events recorded in the last 24 hours',
    failureHint: 'Ensure tracking is wired to PDP elements (ATC, price, etc.).',
    checkFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('ab_intent_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', twentyFourHoursAgo);
      
      if (error) throw error;
      const flowing = (count || 0) > 0;
      return { 
        passed: flowing, 
        detail: flowing ? `${count} event(s) in last 24h` : 'No recent events' 
      };
    },
  },
  {
    id: 'cvr_sane',
    label: 'CVR sane [0–1]',
    description: 'All conversion rates are within valid range',
    failureHint: 'Check for data corruption or calculation errors in CVR fields.',
    checkFn: async () => {
      // Check for any CVR values outside [0, 1] range (excluding nulls)
      const { data, error } = await supabase
        .from('ab_tests')
        .select('id, cvr_a, cvr_b')
        .or('cvr_a.lt.0,cvr_a.gt.1,cvr_b.lt.0,cvr_b.gt.1');
      
      if (error) throw error;
      
      // Filter out rows where both values are null (no issue)
      const invalidRows = (data || []).filter(row => {
        const aInvalid = row.cvr_a !== null && (row.cvr_a < 0 || row.cvr_a > 1);
        const bInvalid = row.cvr_b !== null && (row.cvr_b < 0 || row.cvr_b > 1);
        return aInvalid || bInvalid;
      });
      
      const sane = invalidRows.length === 0;
      return { 
        passed: sane, 
        detail: sane ? 'All CVR values valid' : `${invalidRows.length} test(s) with invalid CVR` 
      };
    },
  },
  {
    id: 'bis_sane',
    label: 'BIS sane (≥0)',
    description: 'All BIS values are non-negative and valid',
    failureHint: 'Review BIS calculation logic or check for corrupted metric data.',
    checkFn: async () => {
      // Check for any BIS values that are negative
      const { data, error } = await supabase
        .from('ab_tests')
        .select('id, bis_final_a, bis_final_b')
        .or('bis_final_a.lt.0,bis_final_b.lt.0');
      
      if (error) throw error;
      
      // Filter for actual negative values (not null)
      const invalidRows = (data || []).filter(row => {
        const aInvalid = row.bis_final_a !== null && row.bis_final_a < 0;
        const bInvalid = row.bis_final_b !== null && row.bis_final_b < 0;
        return aInvalid || bInvalid;
      });
      
      const sane = invalidRows.length === 0;
      return { 
        passed: sane, 
        detail: sane ? 'All BIS values valid' : `${invalidRows.length} test(s) with negative BIS` 
      };
    },
  },
  {
    id: 'element_coverage',
    label: 'Element coverage (≥3 types)',
    description: 'Tracking spans multiple element types in last 7 days',
    failureHint: 'Wire more PDP elements (price, reviews, gallery, etc.) to intent tracking.',
    checkFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get distinct element types from last 7 days
      const { data, error } = await supabase
        .from('ab_intent_events')
        .select('element_type')
        .gte('timestamp', sevenDaysAgo);
      
      if (error) throw error;
      
      const uniqueTypes = new Set((data || []).map(row => row.element_type));
      const typeCount = uniqueTypes.size;
      const sufficient = typeCount >= 3;
      
      return { 
        passed: sufficient, 
        detail: sufficient 
          ? `${typeCount} element types tracked` 
          : `Only ${typeCount} type(s) tracked – need ≥3` 
      };
    },
  },
];

// ============================================================================
// Operator Notes (passive, do not affect score)
// ============================================================================

const OPERATOR_NOTES = [
  'Confirm variant assignment is stable (users don\'t flip between A/B on refresh).',
  'Verify Microsoft Clarity is filtering by ab_variant.',
  'Manually test one auto-stop scenario before relying on recommendations.',
  'Check that archive/restore workflow works on a dummy test.',
];

// ============================================================================
// Component
// ============================================================================

export default function FirstTestChecklist() {
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [isRunning, setIsRunning] = useState(false);

  // Initialize and run checks on mount
  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    
    // Set all to loading
    const loadingState: Record<string, CheckResult> = {};
    HEALTH_CHECKS.forEach(check => {
      loadingState[check.id] = { passed: false, loading: true, error: false };
    });
    setResults(loadingState);

    // Run all checks in parallel
    const checkPromises = HEALTH_CHECKS.map(async (check) => {
      try {
        const result = await check.checkFn();
        return { id: check.id, passed: result.passed, detail: result.detail, error: false };
      } catch (e) {
        console.error(`Health check failed: ${check.id}`, e);
        return { id: check.id, passed: false, detail: 'Check failed', error: true };
      }
    });

    const outcomes = await Promise.all(checkPromises);
    
    const newResults: Record<string, CheckResult> = {};
    outcomes.forEach(outcome => {
      newResults[outcome.id] = {
        passed: outcome.passed,
        loading: false,
        error: outcome.error,
        detail: outcome.detail,
      };
    });
    
    setResults(newResults);
    setIsRunning(false);
  }, []);

  // Run checks on mount
  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  // Calculate summary
  const passedCount = Object.values(results).filter(r => r.passed && !r.error).length;
  const totalChecks = HEALTH_CHECKS.length;
  const allPassed = passedCount === totalChecks;
  const progress = (passedCount / totalChecks) * 100;

  // Get status icon for a check
  const getStatusIcon = (result: CheckResult | undefined) => {
    if (!result || result.loading) {
      return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (result.error) {
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
    if (result.passed) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-amber-500" />;
  };

  // Get row styling based on result
  const getRowStyle = (result: CheckResult | undefined) => {
    if (!result || result.loading || result.error) {
      return 'bg-muted/20 border-transparent';
    }
    return result.passed 
      ? 'bg-green-500/5 border-green-500/20' 
      : 'bg-amber-500/5 border-amber-500/20';
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Experimentation System Health
                <Badge 
                  variant={allPassed ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {passedCount}/{totalChecks}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Automatic checks on A/B experiments &amp; tracking
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAllChecks}
            disabled={isRunning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Re-run Checks
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">System Status</span>
            <span className="font-medium">{passedCount}/{totalChecks} passed</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${allPassed ? '[&>div]:bg-green-500' : ''}`} 
          />
        </div>

        {/* Health check items */}
        <div className="space-y-2">
          {HEALTH_CHECKS.map(check => {
            const result = results[check.id];
            
            return (
              <div
                key={check.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${getRowStyle(result)}`}
              >
                <div className="shrink-0 mt-0.5">
                  {getStatusIcon(result)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${result?.passed ? 'text-foreground' : ''}`}>
                    {check.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result?.error 
                      ? 'Could not verify, retry later.' 
                      : result?.detail || check.description
                    }
                  </p>
                  {result && !result.loading && !result.passed && !result.error && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {check.failureHint}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {!isRunning && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            allPassed 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-muted/30 border-transparent'
          }`}>
            {allPassed ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  System ready for serious experiments.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Review failed checks before trusting test decisions.
                </p>
              </>
            )}
          </div>
        )}

        {/* Operator Notes (passive, informational only) */}
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Operator Notes
          </p>
          <ul className="space-y-1.5">
            {OPERATOR_NOTES.map((note, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/50 shrink-0">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Clarity link */}
        <div className="pt-2 border-t">
          <a
            href="https://clarity.microsoft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open Microsoft Clarity
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
