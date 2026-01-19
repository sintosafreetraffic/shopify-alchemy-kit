/**
 * usePreflightStatus Hook - v2.4.2
 * 
 * Fetches the latest preflight run status for a test.
 * Used to show pass/fail indicator and block traffic increases.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PreflightCheck {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  duration_ms?: number;
}

export interface PreflightRun {
  id: string;
  test_id: string;
  variant: string;
  status: 'passed' | 'degraded' | 'failed' | 'pending';
  trigger_type: 'variant_saved' | 'traffic_increase' | 'test_resumed' | 'manual';
  checks_json: PreflightCheck[];
  summary: string | null;
  run_at: string;
  completed_at: string | null;
  traffic_before: number | null;
  traffic_after: number | null;
}

interface UsePreflightStatusResult {
  latestRun: PreflightRun | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canIncreaseTraffic: boolean;
  warningMessage: string | null;
}

export function usePreflightStatus(testId: string): UsePreflightStatusResult {
  const [latestRun, setLatestRun] = useState<PreflightRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestRun = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('ab_preflight_runs')
        .select('*')
        .eq('test_id', testId)
        .order('run_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      // Transform data to typed format
      if (data) {
        // Parse checks_json - handle both array and object formats
        let checksArray: PreflightCheck[] = [];
        if (Array.isArray(data.checks_json)) {
          checksArray = data.checks_json as unknown as PreflightCheck[];
        } else if (data.checks_json && typeof data.checks_json === 'object') {
          checksArray = [];
        }
        
        const run: PreflightRun = {
          id: data.id,
          test_id: data.test_id,
          variant: data.variant,
          status: data.status as PreflightRun['status'],
          trigger_type: data.trigger_type as PreflightRun['trigger_type'],
          checks_json: checksArray,
          summary: data.summary,
          run_at: data.run_at,
          completed_at: data.completed_at,
          traffic_before: data.traffic_before,
          traffic_after: data.traffic_after,
        };
        setLatestRun(run);
      } else {
        setLatestRun(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch preflight status';
      setError(message);
      console.warn('[usePreflightStatus] Error:', message);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchLatestRun();
  }, [fetchLatestRun]);

  // Determine if traffic can be increased
  const canIncreaseTraffic = !latestRun || latestRun.status !== 'failed';
  
  // Warning message for degraded or failed preflight
  let warningMessage: string | null = null;
  if (latestRun?.status === 'failed') {
    warningMessage = 'Preflight failed. Fix issues before increasing traffic to B.';
  } else if (latestRun?.status === 'degraded') {
    warningMessage = 'Preflight degraded. Review warnings before scaling.';
  }

  return {
    latestRun,
    loading,
    error,
    refresh: fetchLatestRun,
    canIncreaseTraffic,
    warningMessage,
  };
}
