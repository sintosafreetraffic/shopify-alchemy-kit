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

// Entity breakdown for individual campaigns/ad groups/ads
export interface EntityMetrics extends ProcessedMetrics {
  id: string;
  name: string;
  entity_type: "campaign" | "ad_group" | "ad";
  status?: string;
  // Parsed from naming conventions
  creative_category?: string; // UGC, Lifestyle, Testimonial, Before/After
  creative_format?: string;   // Static, Video
  product_focus?: string;
  persona?: string;           // e.g., Jason, Mia
  // Parent references (for ads)
  campaign_id?: string;
  campaign_name?: string;
  ad_group_id?: string;
  ad_group_name?: string;
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
  entities?: EntityMetrics[]; // Individual entity breakdown
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

  const [activeOnlyCampaigns, setActiveOnlyCampaigns] = useState(false);
  const [activeOnlyAds, setActiveOnlyAds] = useState(false);

  // Entity filters for campaign/ad selection
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  // Campaigns list for filtering (fetched separately at CAMPAIGN level)
  const [campaignsList, setCampaignsList] = useState<EntityMetrics[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Ads list for the selected campaign (fetched when campaign is selected)
  const [adsList, setAdsList] = useState<EntityMetrics[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  // Fetch campaigns list for the filter dropdown (fetches at CAMPAIGN level)
  const fetchCampaignsList = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - Math.max(selectedPreset.days - 1, 0));

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        granularity: "DAY",
        level: "CAMPAIGN",
        click_window_days: "30",
        view_window_days: "1",
        active_only_campaigns: activeOnlyCampaigns ? "true" : "false",
        active_only_ads: "false",
      });

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/pinterest-ads-reporting?${params}`;
      
      const fetchResponse = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (fetchResponse.ok) {
        const result: AdsReportingData = await fetchResponse.json();
        if (result.entities) {
          setCampaignsList(result.entities.filter(e => e.entity_type === "campaign"));
        }
      }
    } catch (err) {
      console.error("[useAdsReporting] Error fetching campaigns list:", err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [selectedPreset, activeOnlyCampaigns]);

  // Fetch ads for a specific campaign
  const fetchAdsForCampaign = useCallback(async (campaignId: string) => {
    setLoadingAds(true);
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - Math.max(selectedPreset.days - 1, 0));

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        granularity: "DAY",
        level: "PIN_PROMOTION",
        click_window_days: "30",
        view_window_days: "1",
        active_only_campaigns: "false",
        active_only_ads: activeOnlyAds ? "true" : "false",
        selected_campaign_ids: campaignId,
      });

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/pinterest-ads-reporting?${params}`;
      
      const fetchResponse = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (fetchResponse.ok) {
        const result: AdsReportingData = await fetchResponse.json();
        if (result.entities) {
          setAdsList(result.entities.filter(e => e.entity_type === "ad"));
        }
      }
    } catch (err) {
      console.error("[useAdsReporting] Error fetching ads for campaign:", err);
    } finally {
      setLoadingAds(false);
    }
  }, [selectedPreset, activeOnlyAds]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range in UTC
      // NOTE: "Last N days" typically includes today + previous (N-1) days.
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - Math.max(selectedPreset.days - 1, 0));

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        granularity,
        level,
        click_window_days: "30",
        view_window_days: "1",
        active_only_campaigns: activeOnlyCampaigns ? "true" : "false",
        active_only_ads: activeOnlyAds ? "true" : "false",
        ...(forceRefresh && { force_refresh: "true" }),
      });

      // Add entity filters if selected
      if (selectedCampaignIds.length > 0) {
        params.set("selected_campaign_ids", selectedCampaignIds.join(","));
      }
      if (selectedAdIds.length > 0) {
        params.set("selected_ad_ids", selectedAdIds.join(","));
      }

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
  }, [selectedPreset, granularity, level, activeOnlyCampaigns, activeOnlyAds, selectedCampaignIds, selectedAdIds]);

  // Auto-fetch on mount and when params change
  useEffect(() => {
    if (options.autoFetch) {
      fetchData();
    }
  }, [fetchData, options.autoFetch]);

  // Fetch campaigns list on mount and when preset changes
  useEffect(() => {
    if (options.autoFetch) {
      fetchCampaignsList();
    }
  }, [fetchCampaignsList, options.autoFetch]);

  // Fetch ads when campaign selection changes
  useEffect(() => {
    if (selectedCampaignIds.length === 1) {
      fetchAdsForCampaign(selectedCampaignIds[0]);
    } else {
      setAdsList([]);
    }
  }, [selectedCampaignIds, fetchAdsForCampaign]);

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

    activeOnlyCampaigns,
    setActiveOnlyCampaigns,
    activeOnlyAds,
    setActiveOnlyAds,

    // Entity filters
    selectedCampaignIds,
    setSelectedCampaignIds,
    selectedAdIds,
    setSelectedAdIds,
    
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
    
    // Campaigns and ads list for filtering
    campaignsList,
    loadingCampaigns,
    refetchCampaigns: fetchCampaignsList,
    adsList,
    loadingAds,
  };
}
