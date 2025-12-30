/**
 * Pinterest Ads Reporting Edge Function
 * 
 * Fetches analytics data from Pinterest Ads API v5 for spend, conversions, ROAS tracking.
 * Includes caching to reduce API calls and handle rate limits gracefully.
 * 
 * Pinterest API: GET /v5/ad_accounts/{ad_account_id}/analytics
 * 
 * Required secrets:
 * - PINTEREST_AD_ACCOUNT_ID
 * - PINTEREST_APP_ID + PINTEREST_APP_SECRET (for token refresh)
 * 
 * OAuth tokens stored in pinterest_oauth_tokens table.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
  getEnvVar,
} from "../_shared/env.ts";

// ============================================================================
// TYPES
// ============================================================================

interface AdsReportingRequest {
  start_date: string;
  end_date: string;
  granularity: "DAY" | "WEEK" | "MONTH" | "TOTAL";
  level: "ACCOUNT" | "CAMPAIGN" | "AD_GROUP";
  click_window_days: number;
  view_window_days: number;
}

interface ProcessedMetrics {
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

interface TimeseriesEntry extends ProcessedMetrics {
  date: string;
}

interface AdsReportingResponse {
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

// Pinterest metrics we request (verified against API v5)
const METRICS_COLUMNS = [
  "SPEND_IN_MICRO_DOLLAR",
  "TOTAL_IMPRESSION",
  "TOTAL_CLICKTHROUGH",
  "TOTAL_CONVERSIONS",
  "TOTAL_CHECKOUT",
  "TOTAL_CLICK_ADD_TO_CART",  // Correct name (not TOTAL_ADD_TO_CART)
  "TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR",  // Correct name for revenue
].join(",");

const CACHE_TTL_MINUTES = 30;

// ============================================================================
// TOKEN MANAGEMENT (reuse pattern from pinterest-eqs-fetch)
// ============================================================================

async function getValidAccessToken(
  supabase: SupabaseClient,
  appId: string,
  appSecret: string
): Promise<string> {
  const { data: tokenData, error: fetchError } = await supabase
    .from("pinterest_oauth_tokens")
    .select("id, access_token, refresh_token, expires_at")
    .single();

  if (fetchError || !tokenData) {
    throw new Error("No Pinterest OAuth tokens found. Please connect Pinterest via OAuth first.");
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    console.log("[Pinterest Ads] Using existing valid token");
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    throw new Error("Access token expired and no refresh token available. Please re-authorize.");
  }

  console.log("[Pinterest Ads] Token expired, refreshing...");
  
  const credentials = btoa(`${appId}:${appSecret}`);
  
  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenData.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Pinterest Ads] Token refresh failed:", response.status, errorText);
    throw new Error(`Token refresh failed: ${response.status}. Please re-authorize Pinterest.`);
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  await supabase
    .from("pinterest_oauth_tokens")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokenData.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenData.id);

  console.log("[Pinterest Ads] Token refreshed successfully");
  return newTokens.access_token;
}

// ============================================================================
// CACHING
// ============================================================================

function generateCacheKey(
  adAccountId: string,
  params: AdsReportingRequest
): string {
  return `${adAccountId}:${params.level}:${params.start_date}:${params.end_date}:${params.granularity}:${params.click_window_days}:${params.view_window_days}`;
}

async function getCachedData(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<{ data: AdsReportingResponse | null; isStale: boolean }> {
  const { data, error } = await supabase
    .from("pinterest_ads_cache")
    .select("payload, expires_at, created_at")
    .eq("cache_key", cacheKey)
    .single();

  if (error || !data) {
    return { data: null, isStale: false };
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  const isStale = now > expiresAt;

  return {
    data: {
      ...data.payload as AdsReportingResponse,
      cached_at: data.created_at,
      is_cached: true,
      stale: isStale,
    },
    isStale,
  };
}

async function setCacheData(
  supabase: SupabaseClient,
  cacheKey: string,
  payload: AdsReportingResponse
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from("pinterest_ads_cache")
    .upsert({
      cache_key: cacheKey,
      payload,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "cache_key",
    });

  console.log("[Pinterest Ads] Cache updated, expires:", expiresAt);
}

// ============================================================================
// PINTEREST API
// ============================================================================

function processRawMetrics(raw: Record<string, any>): ProcessedMetrics {
  const spendMicro = raw.SPEND_IN_MICRO_DOLLAR || 0;
  const revenueMicro = raw.TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR || 0;  // Updated
  const impressions = raw.TOTAL_IMPRESSION || 0;
  const clicks = raw.TOTAL_CLICKTHROUGH || 0;
  const checkouts = raw.TOTAL_CHECKOUT || 0;
  const addToCarts = raw.TOTAL_CLICK_ADD_TO_CART || 0;  // Updated
  const conversions = raw.TOTAL_CONVERSIONS || 0;

  const spend = spendMicro / 1_000_000;
  const revenue = revenueMicro / 1_000_000;

  return {
    spend: Math.round(spend * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
    roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
    cpm: impressions > 0 ? Math.round((spend / impressions * 1000) * 100) / 100 : 0,
    checkouts,
    cpa: checkouts > 0 ? Math.round((spend / checkouts) * 100) / 100 : 0,
    add_to_carts: addToCarts,
    conversions,
  };
}

async function fetchPinterestAnalytics(
  accessToken: string,
  adAccountId: string,
  params: AdsReportingRequest
): Promise<AdsReportingResponse> {
  const url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/analytics`);
  url.searchParams.set("start_date", params.start_date);
  url.searchParams.set("end_date", params.end_date);
  url.searchParams.set("granularity", params.granularity);
  url.searchParams.set("click_window_days", params.click_window_days.toString());
  url.searchParams.set("view_window_days", params.view_window_days.toString());
  url.searchParams.set("columns", METRICS_COLUMNS);

  console.log("[Pinterest Ads] Fetching:", url.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Pinterest Ads] API error:", response.status, errorText);
    throw new Error(`Pinterest API error: ${response.status}`);
  }

  const rawData = await response.json();
  console.log("[Pinterest Ads] Raw response entries:", rawData.length || 0);

  // Process timeseries
  const timeseries: TimeseriesEntry[] = [];
  const totalsAccum: Record<string, number> = {
    SPEND_IN_MICRO_DOLLAR: 0,
    TOTAL_IMPRESSION: 0,
    TOTAL_CLICKTHROUGH: 0,
    TOTAL_CONVERSIONS: 0,
    TOTAL_CHECKOUT: 0,
    TOTAL_ADD_TO_CART: 0,
    TOTAL_CONVERSIONS_VALUE_IN_MICRO_DOLLAR: 0,
  };

  // Pinterest returns array of daily entries
  for (const entry of rawData) {
    const date = entry.DATE;
    const metrics = processRawMetrics(entry);
    
    if (date) {
      timeseries.push({ date, ...metrics });
    }

    // Accumulate totals
    for (const key of Object.keys(totalsAccum)) {
      totalsAccum[key] += entry[key] || 0;
    }
  }

  // Sort by date ascending
  timeseries.sort((a, b) => a.date.localeCompare(b.date));

  const totals = processRawMetrics(totalsAccum);

  return {
    range: {
      start: params.start_date,
      end: params.end_date,
      granularity: params.granularity,
    },
    level: params.level,
    attribution: {
      click_window: params.click_window_days,
      view_window: params.view_window_days,
    },
    totals,
    timeseries,
    cached_at: null,
    is_cached: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Pinterest Ads Reporting] Request received");

  try {
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const PINTEREST_APP_ID = getEnvVar("PINTEREST_APP_ID");
    const PINTEREST_APP_SECRET = getEnvVar("PINTEREST_APP_SECRET");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params
    const url = new URL(req.url);
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 14);

    const params: AdsReportingRequest = {
      start_date: url.searchParams.get("start_date") || defaultStart.toISOString().split("T")[0],
      end_date: url.searchParams.get("end_date") || today.toISOString().split("T")[0],
      granularity: (url.searchParams.get("granularity") || "DAY") as AdsReportingRequest["granularity"],
      level: (url.searchParams.get("level") || "ACCOUNT") as AdsReportingRequest["level"],
      click_window_days: parseInt(url.searchParams.get("click_window_days") || "30"),
      view_window_days: parseInt(url.searchParams.get("view_window_days") || "1"),
    };

    // Validate date range (max 90 days)
    const startDate = new Date(params.start_date);
    const endDate = new Date(params.end_date);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      return createErrorResponse("Date range cannot exceed 90 days", 400);
    }

    if (daysDiff < 0) {
      return createErrorResponse("Start date must be before end date", 400);
    }

    console.log("[Pinterest Ads] Params:", params);

    // Check cache first
    const cacheKey = generateCacheKey(PINTEREST_AD_ACCOUNT_ID, params);
    const { data: cachedData, isStale } = await getCachedData(supabase, cacheKey);

    if (cachedData && !isStale) {
      console.log("[Pinterest Ads] Returning fresh cached data");
      return createSuccessResponse(cachedData);
    }

    // Need fresh data - get access token
    if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) {
      // If we have stale cache, return it
      if (cachedData) {
        console.log("[Pinterest Ads] No OAuth credentials, returning stale cache");
        return createSuccessResponse({
          ...cachedData,
          stale: true,
          error: "OAuth credentials not configured",
        });
      }
      return createErrorResponse("Pinterest OAuth not configured", 500);
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabase, PINTEREST_APP_ID, PINTEREST_APP_SECRET);
    } catch (tokenError) {
      if (cachedData) {
        console.log("[Pinterest Ads] Token error, returning stale cache");
        return createSuccessResponse({
          ...cachedData,
          stale: true,
          error: String(tokenError),
        });
      }
      throw tokenError;
    }

    // Fetch from Pinterest
    let freshData: AdsReportingResponse;
    try {
      freshData = await fetchPinterestAnalytics(accessToken, PINTEREST_AD_ACCOUNT_ID, params);
    } catch (apiError) {
      const errorMsg = String(apiError);
      
      if (errorMsg.includes("RATE_LIMITED") && cachedData) {
        console.log("[Pinterest Ads] Rate limited, returning stale cache");
        return createSuccessResponse({
          ...cachedData,
          rate_limited: true,
          stale: true,
        });
      }

      if (cachedData) {
        console.log("[Pinterest Ads] API error, returning stale cache");
        return createSuccessResponse({
          ...cachedData,
          stale: true,
          error: errorMsg,
        });
      }

      throw apiError;
    }

    // Cache the fresh data
    await setCacheData(supabase, cacheKey, freshData);

    console.log("[Pinterest Ads] Returning fresh data, totals:", freshData.totals);
    return createSuccessResponse(freshData);

  } catch (error) {
    console.error("[Pinterest Ads Reporting] Error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
