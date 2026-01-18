/**
 * Experimentation System Health Widget
 * 
 * A read-only health indicator showing 5 database-driven auto-checks + 1 informational row.
 * No manual interaction required - all checks are computed from the database.
 * 
 * v2.3 Refinements:
 * - lastSuccessfulAt ONLY set when ALL checks complete with ZERO errors
 * - Auto-refresh uses setTimeout with re-rolled jitter each run (not setInterval)
 * - Default: auto-refresh OFF, 30-min cadence ±20% jitter when enabled
 * - Calm "Database unreachable" error UX
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Activity,
  HelpCircle,
  Info,
  Clock,
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

interface TestStatusCounts {
  running: number;
  concluded: number;
  total: number;
}

// ============================================================================
// Auto-Check Definitions (5 database-driven checks)
// ============================================================================

const HEALTH_CHECKS: HealthCheck[] = [
  {
    id: 'test_exists',
    label: 'Experiments Registered',
    description: 'At least one experiment tracked in the system',
    failureHint: 'Register your first code-implemented experiment to begin tracking.',
    checkFn: async () => {
      const { count, error } = await supabase
        .from('ab_tests')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      const exists = (count || 0) > 0;
      return { 
        passed: exists, 
        detail: exists ? `${count} experiment(s) registered` : 'No experiments tracked yet' 
      };
    },
  },
  {
    id: 'events_flowing',
    label: 'Intent Events Flowing',
    description: 'Intent events recorded in the last 7 days',
    failureHint: 'Ensure tracking is wired to PDP elements (ATC, price, etc.).',
    checkFn: async () => {
      // Use 7-day window to avoid false alarms on weekends/low traffic
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('ab_intent_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', sevenDaysAgo);
      
      if (error) throw error;
      const flowing = (count || 0) > 0;
      return { 
        passed: flowing, 
        detail: flowing ? `${count} event(s) in last 7 days` : 'No events in last 7 days' 
      };
    },
  },
  {
    id: 'cvr_sane',
    label: 'CVR Sanity',
    description: 'All conversion rates are within valid range [0–1]',
    failureHint: 'Check for data corruption or calculation errors in CVR fields.',
    checkFn: async () => {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('id, cvr_a, cvr_b')
        .or('cvr_a.lt.0,cvr_a.gt.1,cvr_b.lt.0,cvr_b.gt.1');
      
      if (error) throw error;
      
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
    label: 'BIS Sanity',
    description: 'All BIS values are non-negative and valid (≥0)',
    failureHint: 'Review BIS calculation logic or check for corrupted metric data.',
    checkFn: async () => {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('id, bis_final_a, bis_final_b')
        .or('bis_final_a.lt.0,bis_final_b.lt.0');
      
      if (error) throw error;
      
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
    label: 'Element Coverage',
    description: 'At least 1 element type tracked in last 7 days',
    failureHint: 'Wire PDP elements (price, ATC, reviews, etc.) to intent tracking.',
    checkFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('ab_intent_events')
        .select('element_type')
        .gte('timestamp', sevenDaysAgo);
      
      if (error) throw error;
      
      const uniqueTypes = new Set((data || []).map(row => row.element_type));
      const typeCount = uniqueTypes.size;
      const hasAny = typeCount >= 1;
      
      return { 
        passed: hasAny, 
        detail: typeCount >= 3 
          ? `${typeCount} element types tracked ✓` 
          : typeCount >= 1
          ? `${typeCount} type(s) tracked (consider adding more for broader insights)`
          : 'No element types tracked'
      };
    },
  },
];

// ============================================================================
// Operator Notes (passive, do not affect score)
// ============================================================================

const OPERATOR_NOTES = [
  'Clarity tagging should be verified in Clarity UI.',
  'Variant stability is enforced via localStorage cookie.',
  'Auto-stop never acts without human confirmation.',
  'Max 3 active tests; only 1 may affect pricing/CTA/urgency.',
  'Winner declaration requires manual confirm + min sample met.',
];

// ============================================================================
// Component
// ============================================================================

export default function FirstTestChecklist() {
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [testStatusCounts, setTestStatusCounts] = useState<TestStatusCounts>({ running: 0, concluded: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  // Timestamp tracking
  const [lastAttemptedAt, setLastAttemptedAt] = useState<Date | null>(null);
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<Date | null>(null);
  
  // Auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Previous successful results (shown when connection fails)
  const [lastSuccessfulResults, setLastSuccessfulResults] = useState<Record<string, CheckResult>>({});

  // Fetch test status counts for the 6th informational row
  const fetchTestStatusCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('status');
      
      if (error) throw error;
      
      const running = (data || []).filter(t => t.status === 'active').length;
      const concluded = (data || []).filter(t => t.status === 'completed' || t.status === 'stopped').length;
      const total = (data || []).length;
      
      setTestStatusCounts({ running, concluded, total });
    } catch (e) {
      console.error('Failed to fetch test status counts:', e);
    }
  }, []);

  // Initialize and run checks on mount
  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    setConnectionError(false);
    setLastAttemptedAt(new Date());
    
    // Set all to loading
    const loadingState: Record<string, CheckResult> = {};
    HEALTH_CHECKS.forEach(check => {
      loadingState[check.id] = { passed: false, loading: true, error: false };
    });
    setResults(loadingState);

    // Run all checks in parallel + fetch test status counts
    const checkPromises = HEALTH_CHECKS.map(async (check) => {
      try {
        const result = await check.checkFn();
        return { id: check.id, passed: result.passed, detail: result.detail, error: false };
      } catch (e) {
        console.error(`Health check failed: ${check.id}`, e);
        return { id: check.id, passed: false, detail: 'Could not verify', error: true };
      }
    });

    const [outcomes] = await Promise.all([
      Promise.all(checkPromises),
      fetchTestStatusCounts(),
    ]);
    
    // Check if ANY check errored (not just all failed)
    const hasAnyError = outcomes.some(o => o.error);
    const allFailed = outcomes.every(o => o.error);
    
    if (allFailed) {
      setConnectionError(true);
    }
    
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
    
    // ONLY update lastSuccessfulAt when ALL checks complete with ZERO errors
    if (!hasAnyError) {
      setLastSuccessfulAt(new Date());
      setLastSuccessfulResults(newResults);
    } else if (!allFailed) {
      // Partial success - still store results but don't update lastSuccessfulAt
      // (keep showing previous successful timestamp)
    }
    
    setIsRunning(false);
  }, [fetchTestStatusCounts]);

  // Run checks on mount
  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);
  
  // Auto-refresh logic with setTimeout + re-rolled jitter each run
  useEffect(() => {
    const scheduleNextRun = () => {
      if (!autoRefreshEnabled) return;
      
      // 30 minutes = 1800000ms, add ±20% jitter (re-rolled each time)
      const baseInterval = 30 * 60 * 1000;
      const jitter = (Math.random() - 0.5) * 0.4 * baseInterval; // ±20%
      const interval = baseInterval + jitter;
      
      autoRefreshIntervalRef.current = setTimeout(async () => {
        await runAllChecks();
        // Schedule next run with fresh jitter
        scheduleNextRun();
      }, interval);
    };
    
    if (autoRefreshEnabled) {
      scheduleNextRun();
    }
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearTimeout(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, runAllChecks]);

  // Calculate summary - use lastSuccessfulResults if connection error
  const displayResults = connectionError && Object.keys(lastSuccessfulResults).length > 0 
    ? lastSuccessfulResults 
    : results;
  const passedCount = Object.values(displayResults).filter(r => r.passed && !r.error).length;
  const errorCount = Object.values(results).filter(r => r.error).length;
  const totalChecks = HEALTH_CHECKS.length;
  const allPassed = passedCount === totalChecks && errorCount === 0;
  const progress = (passedCount / totalChecks) * 100;

  // Format timestamp
  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

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
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
                className="scale-75"
              />
              <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runAllChecks}
              disabled={isRunning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              Re-run
            </Button>
          </div>
        </div>
        
        {/* Timestamps */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Last checked: {formatTimestamp(lastAttemptedAt)}</span>
          </div>
          {lastSuccessfulAt && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Last successful: {formatTimestamp(lastSuccessfulAt)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection error state - calm, not alarming */}
        {connectionError && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 border-muted-foreground/20">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Database unreachable</p>
              <p className="text-xs text-muted-foreground">
                Health could not be verified. Try again in a moment.
                {Object.keys(lastSuccessfulResults).length > 0 && ' Showing last successful results.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={runAllChecks} disabled={isRunning}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
              Re-run Checks
            </Button>
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">System Status</span>
            <span className="font-medium">{passedCount}/{totalChecks} passed</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${allPassed ? '[&>div]:bg-green-500' : connectionError ? '[&>div]:bg-muted-foreground' : ''}`} 
          />
        </div>

        {/* Health check items */}
        <div className="space-y-2">
          {HEALTH_CHECKS.map(check => {
            const result = displayResults[check.id];
            
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

          {/* 6th row: Active Test States (informational, non-blocking) */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 border-transparent">
            <div className="shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Active Test States
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {testStatusCounts.running} running, {testStatusCounts.concluded} concluded ({testStatusCounts.total} total)
              </p>
            </div>
          </div>
        </div>

        {/* Status message */}
        {!isRunning && !connectionError && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            allPassed 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {allPassed ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✅ {passedCount}/{totalChecks} Healthy — System ready for experiments.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Degraded — {passedCount}/{totalChecks} checks passed. See details above.
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
