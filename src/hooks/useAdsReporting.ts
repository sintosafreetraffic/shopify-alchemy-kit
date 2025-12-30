import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Granularity = "DAY" | "WEEK" | "MONTH";
export type Level = "ACCOUNT" | "CAMPAIGN" | "AD_GROUP" | "PIN_PROMOTION";

export interface ProcessedMetrics {
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  checkouts: number;
  cpa: number;
  add_to_carts: number;
  conversions: number;
  conversion_rate: number;
  add_to_cart_rate: number;
}

export interface TimeseriesEntry extends ProcessedMetrics {
  date: string;
  has_attribution_lag: boolean;
}

export interface AdsReportingData {
  range: {
    start: string;
    end: string;
    granularity: string;
  };
  level: string;
  attribution: {
    click_window: number;
    view_window: number;
  };
  totals: ProcessedMetrics;
  timeseries: TimeseriesEntry[];
  cached_at: string | null;
  is_cached: boolean;
  rate_limited?: boolean;
  stale?: boolean;
  error?: string;
  // New fields
  fetched_at?: string;
  api_latency_ms?: number | null;
  cache_hit?: boolean;
  attribution_lag_warning?: boolean;
  currency?: string;
}

export interface DatePreset {
  label: string;
  days: number;
}

export const DATE_PRESETS: DatePreset[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

interface UseAdsReportingOptions {
  autoFetch?: boolean;
}

export function useAdsReporting(options: UseAdsReportingOptions = { autoFetch: true }) {
  const [data, setData] = useState<AdsReportingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(DATE_PRESETS[1]); // 14 days default
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [level, setLevel] = useState<Level>("ACCOUNT");

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range in UTC
      const endDate = new Date();
      const startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - selectedPreset.days);

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        granularity,
        level,
        click_window_days: "30",
        view_window_days: "1",
        ...(forceRefresh && { force_refresh: "true" }),
      });

      // Use environment variables for the edge function URL
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/pinterest-ads-reporting?${params}`;
      
      const fetchResponse = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!fetchResponse.ok) {
        let errorMessage = `HTTP ${fetchResponse.status}`;
        try {
          const errorData = await fetchResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Keep default error message
        }
        throw new Error(errorMessage);
      }

      const result: AdsReportingData = await fetchResponse.json();
      setData(result);
      setLastFetchTime(new Date());

      if (result.stale) {
        console.warn("[useAdsReporting] Using stale cached data:", result.error);
      }

      if (result.attribution_lag_warning) {
        console.info("[useAdsReporting] Data includes dates within attribution lag window (last 2 days)");
      }

    } catch (err) {
      console.error("[useAdsReporting] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch ads data");
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, granularity, level]);

  // Auto-fetch on mount and when params change
  useEffect(() => {
    if (options.autoFetch) {
      fetchData();
    }
  }, [fetchData, options.autoFetch]);

  // Computed values
  const hasAttributionLagEntries = useMemo(() => {
    if (!data?.timeseries) return false;
    return data.timeseries.some(entry => entry.has_attribution_lag);
  }, [data?.timeseries]);

  const recentEntriesWithLag = useMemo(() => {
    if (!data?.timeseries) return [];
    return data.timeseries.filter(entry => entry.has_attribution_lag);
  }, [data?.timeseries]);

  // Data quality indicator (percentage of entries without lag)
  const dataQualityPercent = useMemo(() => {
    if (!data?.timeseries || data.timeseries.length === 0) return 100;
    const entriesWithoutLag = data.timeseries.filter(e => !e.has_attribution_lag).length;
    return Math.round((entriesWithoutLag / data.timeseries.length) * 100);
  }, [data?.timeseries]);

  return {
    data,
    loading,
    error,
    refetch: (forceRefresh?: boolean) => fetchData(forceRefresh ?? false),
    forceRefresh: () => fetchData(true),
    lastFetchTime,
    
    // Controls
    selectedPreset,
    setSelectedPreset,
    granularity,
    setGranularity,
    level,
    setLevel,
    
    // Helpers
    datePresets: DATE_PRESETS,
    isStale: data?.stale ?? false,
    isCached: data?.is_cached ?? false,
    cacheHit: data?.cache_hit ?? false,
    cachedAt: data?.cached_at ? new Date(data.cached_at) : null,
    
    // New: Attribution lag indicators
    hasAttributionLagEntries,
    recentEntriesWithLag,
    dataQualityPercent,
    attributionLagWarning: data?.attribution_lag_warning ?? false,
    
    // New: Performance metrics
    apiLatencyMs: data?.api_latency_ms ?? null,
    currency: data?.currency ?? "EUR",
  };
}
