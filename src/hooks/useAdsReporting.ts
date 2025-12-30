import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Granularity = "DAY" | "WEEK" | "MONTH" | "TOTAL";
export type Level = "ACCOUNT" | "CAMPAIGN" | "AD_GROUP";

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
}

export interface TimeseriesEntry extends ProcessedMetrics {
  date: string;
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

export function useAdsReporting() {
  const [data, setData] = useState<AdsReportingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(DATE_PRESETS[1]); // 14 days default
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [level, setLevel] = useState<Level>("ACCOUNT");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedPreset.days);

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        granularity,
        level,
        click_window_days: "30",
        view_window_days: "1",
      });

      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("pinterest-ads-reporting", {
        headers: session?.session?.access_token 
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : undefined,
        body: null,
      });

      // The function uses query params, so we need to call it differently
      // Actually let's use fetch directly since we need query params
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/pinterest-ads-reporting?${params}`;
      
      const fetchResponse = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error || `HTTP ${fetchResponse.status}`);
      }

      const result = await fetchResponse.json();
      setData(result);

      if (result.stale) {
        console.warn("[useAdsReporting] Using stale cached data:", result.error);
      }
    } catch (err) {
      console.error("[useAdsReporting] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch ads data");
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, granularity, level]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
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
    cachedAt: data?.cached_at ? new Date(data.cached_at) : null,
  };
}
