/**
 * useServerProbabilities Hook - v2.4.2
 * 
 * Fetches pre-computed Bayesian probabilities from the ab-probability-compute edge function.
 * Features:
 * - 5-minute client-side cache
 * - Automatic refresh on data staleness
 * - Manual refresh capability
 * - Fallback-ready (returns null if server unavailable)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServerProbabilities {
  p_atc_b_beats_a: number | null;
  p_purchase_b_beats_a: number | null;
  p_quality_b_worse_than_a: number | null;
  quality_lift_percent: number;
  rps_lift_percent: number | null;
  refund_rate_a: number;
  refund_rate_b: number;
  computed_at: string;
  method_version: string;
  inputs_hash: string;
  cache_ttl_seconds: number;
  metrics: {
    sessions_a: number;
    sessions_b: number;
    atc_a: number;
    atc_b: number;
    purchases_a: number;
    purchases_b: number;
    refunds_a: number;
    refunds_b: number;
    revenue_a: number;
    revenue_b: number;
  };
  thresholds: {
    min_samples: number;
    min_purchases: number;
    min_atc: number;
    min_quality_events: number;
  };
}

interface UseServerProbabilitiesResult {
  data: ServerProbabilities | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  isStale: boolean;
  refresh: () => Promise<void>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes before showing stale warning

// In-memory cache (persists across component remounts)
let cachedData: ServerProbabilities | null = null;
let cachedAt: Date | null = null;
let cachedHash: string | null = null;

export function useServerProbabilities(testName: string = 'urgency_scarcity_test'): UseServerProbabilitiesResult {
  const [data, setData] = useState<ServerProbabilities | null>(cachedData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(cachedAt);
  const fetchingRef = useRef(false);

  const isStale = lastFetched 
    ? Date.now() - lastFetched.getTime() > STALE_THRESHOLD_MS 
    : true;

  const isCacheValid = useCallback(() => {
    if (!cachedData || !cachedAt) return false;
    return Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
  }, []);

  const fetchProbabilities = useCallback(async (force: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Use cache if valid and not forced
    if (!force && isCacheValid()) {
      setData(cachedData);
      setLastFetched(cachedAt);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[useServerProbabilities] Fetching from ab-probability-compute...');
      
      const { data: result, error: fnError } = await supabase.functions.invoke('ab-probability-compute', {
        body: { testName }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Edge function error');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      // Update cache
      cachedData = result;
      cachedAt = new Date();
      cachedHash = result.inputs_hash;

      setData(result);
      setLastFetched(cachedAt);
      console.log('[useServerProbabilities] Fetched successfully:', result.method_version);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch probabilities';
      console.warn('[useServerProbabilities] Error:', message);
      setError(message);
      // Keep stale data if available
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [testName, isCacheValid]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProbabilities();
  }, [fetchProbabilities]);

  // Auto-refresh when cache expires
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isCacheValid() && !fetchingRef.current) {
        fetchProbabilities();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [fetchProbabilities, isCacheValid]);

  const refresh = useCallback(async () => {
    await fetchProbabilities(true);
  }, [fetchProbabilities]);

  return {
    data,
    loading,
    error,
    lastFetched,
    isStale,
    refresh,
  };
}
