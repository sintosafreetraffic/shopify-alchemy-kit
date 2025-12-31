/**
 * Pinterest Ads Reporting Edge Function (Production-Grade)
 * 
 * Fetches analytics data from Pinterest Ads API v5 for spend, conversions, ROAS tracking.
 * Includes caching, exponential backoff, structured logging, and timezone normalization.
 * 
 * Pinterest API: GET /v5/ad_accounts/{ad_account_id}/analytics
 * 
 * Required secrets:
 * - PINTEREST_AD_ACCOUNT_ID
 * - PINTEREST_APP_ID + PINTEREST_APP_SECRET (for token refresh)
 * 
 * OAuth tokens stored in pinterest_oauth_tokens table.
 * 
 * Improvements (v2):
 * - Exponential backoff with retries for rate limits
 * - Structured logging with latency tracking
 * - UTC timezone normalization
 * - Attribution lag warnings
 * - EUR currency assumption (Pinterest returns USD micro-dollars)
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
  level: "ACCOUNT" | "CAMPAIGN" | "AD_GROUP" | "PIN_PROMOTION";
  click_window_days: number;
  view_window_days: number;
  force_refresh?: boolean;
  active_only_campaigns?: boolean;
  active_only_ads?: boolean;
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
  conversion_rate: number;
  add_to_cart_rate: number;
  reach: number;      // Unique users who saw the ad
  frequency: number;  // Average times each user saw the ad (impressions / reach)
}

interface TimeseriesEntry extends ProcessedMetrics {
  date: string;
  has_attribution_lag: boolean;
}

// Entity breakdown for individual campaigns/ad groups/ads
interface EntityMetrics extends ProcessedMetrics {
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
  entities?: EntityMetrics[]; // Individual entity breakdown
  cached_at: string | null;
  is_cached: boolean;
  rate_limited?: boolean;
  stale?: boolean;
  error?: string;
  // New fields
  fetched_at: string;
  api_latency_ms: number | null;
  cache_hit: boolean;
  attribution_lag_warning: boolean;
  currency: string;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  data?: Record<string, unknown>;
}

// Pinterest metrics we request (verified against API v5)
// Using TOTAL_IMPRESSION_USER for reach and TOTAL_IMPRESSION_FREQUENCY for frequency
const METRICS_COLUMNS = [
  "SPEND_IN_MICRO_DOLLAR",
  "TOTAL_IMPRESSION",
  "TOTAL_CLICKTHROUGH",
  "TOTAL_CONVERSIONS",
  "TOTAL_CHECKOUT",
  "TOTAL_CLICK_ADD_TO_CART",
  "TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR",
  "TOTAL_IMPRESSION_USER",       // Unique users reached
  "TOTAL_IMPRESSION_FREQUENCY",  // Average frequency from Pinterest
].join(",");

const CACHE_TTL_MINUTES = 30;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const ATTRIBUTION_LAG_DAYS = 2; // Days where conversion data may be incomplete

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

function log(level: LogEntry["level"], event: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
  };
  console.log(JSON.stringify(entry));
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

async function getValidAccessToken(
  supabase: SupabaseClient,
  appId: string,
  appSecret: string
): Promise<string> {
  const startTime = Date.now();
  
  const { data: tokenData, error: fetchError } = await supabase
    .from("pinterest_oauth_tokens")
    .select("id, access_token, refresh_token, expires_at")
    .single();

  if (fetchError || !tokenData) {
    log("error", "token_fetch_failed", { error: fetchError?.message });
    throw new Error("No Pinterest OAuth tokens found. Please connect Pinterest via OAuth first.");
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    log("info", "token_valid", { expires_in_ms: expiresAt.getTime() - now.getTime() });
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    log("error", "token_expired_no_refresh");
    throw new Error("Access token expired and no refresh token available. Please re-authorize.");
  }

  log("info", "token_refresh_starting");
  
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
    log("error", "token_refresh_failed", { status: response.status, error: errorText });
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

  log("info", "token_refresh_success", { latency_ms: Date.now() - startTime });
  return newTokens.access_token;
}

// ============================================================================
// CACHING
// ============================================================================

function generateCacheKey(
  adAccountId: string,
  params: AdsReportingRequest
): string {
  // Bump this when parsing/response structure changes to avoid serving stale cached payloads.
  const CACHE_VERSION = "v4";

  // Include active filters in cache key
  const activeFilters = `${params.active_only_campaigns ? 'ac' : ''}${params.active_only_ads ? 'aa' : ''}`;
  return `${CACHE_VERSION}:${adAccountId}:${params.level}:${params.start_date}:${params.end_date}:${params.granularity}:${params.click_window_days}:${params.view_window_days}:${activeFilters}`;
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
    log("info", "cache_miss", { cache_key: cacheKey.substring(0, 20) + "..." });
    return { data: null, isStale: false };
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  const isStale = now > expiresAt;

  log("info", "cache_hit", { 
    is_stale: isStale, 
    age_minutes: Math.round((now.getTime() - new Date(data.created_at).getTime()) / 60000) 
  });

  return {
    data: {
      ...data.payload as AdsReportingResponse,
      cached_at: data.created_at,
      is_cached: true,
      cache_hit: true,
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

  log("info", "cache_set", { expires_at: expiresAt });
}

// ============================================================================
// PINTEREST API WITH RETRY LOGIC
// ============================================================================

function processRawMetrics(raw: Record<string, number>): ProcessedMetrics {
  const spendMicro = raw.SPEND_IN_MICRO_DOLLAR || 0;
  const revenueMicro = raw.TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR || 0;
  const impressions = raw.TOTAL_IMPRESSION || 0;
  const clicks = raw.TOTAL_CLICKTHROUGH || 0;
  const checkouts = raw.TOTAL_CHECKOUT || 0;
  const addToCarts = raw.TOTAL_CLICK_ADD_TO_CART || 0;
  const conversions = raw.TOTAL_CONVERSIONS || 0;
  const reach = raw.TOTAL_IMPRESSION_USER || 0;
  const pinterestFrequency = raw.TOTAL_IMPRESSION_FREQUENCY || 0;

  // Pinterest returns USD micro-dollars - we assume EUR≈USD for now
  // TODO: Add proper currency conversion if needed
  const spend = spendMicro / 1_000_000;
  const revenue = revenueMicro / 1_000_000;

  // Use Pinterest's native frequency if available, otherwise calculate from reach
  const frequency = pinterestFrequency > 0 
    ? Math.round(pinterestFrequency * 100) / 100 
    : (reach > 0 ? Math.round((impressions / reach) * 100) / 100 : 0);

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
    conversion_rate: clicks > 0 ? Math.round((checkouts / clicks) * 10000) / 100 : 0,
    add_to_cart_rate: clicks > 0 ? Math.round((addToCarts / clicks) * 10000) / 100 : 0,
    reach,
    frequency,
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response;
    }
    
    if (response.status === 429) {
      // Rate limited - exponential backoff
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      const jitter = Math.random() * 500;
      const waitMs = backoffMs + jitter;
      
      log("warn", "rate_limited", { 
        attempt: attempt + 1, 
        max_retries: retries, 
        backoff_ms: Math.round(waitMs) 
      });
      
      if (attempt < retries - 1) {
        await sleep(waitMs);
        continue;
      }
      
      throw new Error("RATE_LIMITED");
    }
    
    // Other error - don't retry
    const errorText = await response.text();
    lastError = new Error(`Pinterest API error: ${response.status} - ${errorText}`);
    log("error", "api_error", { status: response.status, error: errorText.substring(0, 200) });
    throw lastError;
  }
  
  throw lastError || new Error("Max retries exceeded");
}

// ============================================================================
// NAMING CONVENTION PARSER
// ============================================================================

interface ParsedCreativeInfo {
  creative_category?: string;
  creative_format?: string;
  product_focus?: string;
  persona?: string;
}

// Known categories for pipe-delimited parsing
const KNOWN_CATEGORIES: Record<string, string> = {
  'ugc': 'UGC',
  'lifestyle': 'Lifestyle',
  'testimonial': 'Testimonial & Review',
  'testemonial': 'Testimonial & Review',
  'review': 'Testimonial & Review',
  'testimonial & review': 'Testimonial & Review',
  'testemonial & review': 'Testimonial & Review',
  'before/after': 'Before/After',
  'before & after': 'Before/After',
  'b/a': 'Before/After',
  'b&a': 'Before/After',
  'product': 'Product',
  'educational': 'Educational',
  'edu': 'Educational',
  'awareness': 'Awareness',
  'consideration': 'Consideration',
  'conversion': 'Conversion',
  'promo': 'Promo',
  'sale': 'Promo',
  'discount': 'Promo',
  'pain': 'Pain Point',
  'pain point': 'Pain Point',
  'problem': 'Pain Point',
  'benefit': 'Benefit',
  'benefits': 'Benefit',
  'listicle': 'Listicle',
  'listicles': 'Listicle',
  'expert': 'Expert/Authority',
  'authority': 'Expert/Authority',
  'expert/authority': 'Expert/Authority',
  'expert/ authority': 'Expert/Authority',
  'expert / authority': 'Expert/Authority',
  'how to': 'How-To',
  'how-to': 'How-To',
  'tutorial': 'Tutorial',
  'comparison': 'Comparison',
  'vs': 'Comparison',
  'unboxing': 'Unboxing',
  'feature': 'Feature',
  'features': 'Feature',
  'social proof': 'Social Proof',
  'influencer': 'Influencer',
  'creator': 'Creator',
  'demo': 'Demo',
  'demonstration': 'Demo',
};

// Known formats
const KNOWN_FORMATS: Record<string, string> = {
  'video': 'Video',
  'videos': 'Video',
  'vid': 'Video',
  "video's": 'Video',
  'static': 'Static',
  'statics': 'Static',
  'image': 'Static',
  'images': 'Static',
  'img': 'Static',
  'carousel': 'Carousel',
  'carousels': 'Carousel',
  'gif': 'GIF',
  'gifs': 'GIF',
  'collection': 'Collection',
  'collections': 'Collection',
};

// Known products
const KNOWN_PRODUCTS: Record<string, string> = {
  'pillow': 'Pillow',
  'ergo pillow': 'Pillow',
  'ergonomic pillow': 'Pillow',
  'mattress': 'Mattress',
  'topper': 'Topper',
  'bundle': 'Bundle',
  'set': 'Bundle',
};

function normalizeSegment(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .trim();
}

function parseCreativeFromName(name: string): ParsedCreativeInfo {
  const result: ParsedCreativeInfo = {};

  const segmentsRaw = name.split("|").map((s) => s.trim());
  const segments = segmentsRaw.map(normalizeSegment);

  const detectFromText = (text: string) => {
    const t = normalizeSegment(text);

    // Category (robust for pipe segments like "EXPERT/ AUTHORITY VIDEO'S")
    if (!result.creative_category) {
      if (/\blisticles?\b/.test(t)) result.creative_category = "Listicle";
      else if (/(\bexpert\b|\bauthority\b)/.test(t)) result.creative_category = "Expert/Authority";
      else if (/(\btestimonial\b|\btestemonial\b|\breview\b)/.test(t)) result.creative_category = "Testimonial & Review";
      else if ((/\bbefore\b/.test(t) && /\bafter\b/.test(t)) || /\bb\/a\b/.test(t) || /\bb\&a\b/.test(t)) result.creative_category = "Before/After";
      else if (/\bugc\b/.test(t)) result.creative_category = "UGC";
      else if (/\blifestyle\b/.test(t)) result.creative_category = "Lifestyle";
      else if (/\beducational\b|\bedu\b/.test(t)) result.creative_category = "Educational";
      else if (/\bpromo\b|\bsale\b|\bdiscount\b/.test(t)) result.creative_category = "Promo";
      else if (/\bpain\b|\bpain point\b|\bproblem\b/.test(t)) result.creative_category = "Pain Point";
      else if (/\bbenefit\b|\bbenefits\b/.test(t)) result.creative_category = "Benefit";
      else if (KNOWN_CATEGORIES[t]) result.creative_category = KNOWN_CATEGORIES[t];
      else {
        for (const [key, value] of Object.entries(KNOWN_CATEGORIES)) {
          if (t.includes(key) && key.length > 3) {
            result.creative_category = value;
            break;
          }
        }
      }
    }

    // Format
    if (!result.creative_format) {
      if (/\bvideos?\b|\bvid\b/.test(t)) result.creative_format = "Video";
      else if (/\bstatics?\b|\bimages?\b|\bimg\b/.test(t)) result.creative_format = "Static";
      else if (/\bcarousels?\b/.test(t)) result.creative_format = "Carousel";
      else if (/\bgifs?\b/.test(t)) result.creative_format = "GIF";
      else if (KNOWN_FORMATS[t]) result.creative_format = KNOWN_FORMATS[t];
      else {
        for (const [key, value] of Object.entries(KNOWN_FORMATS)) {
          if (t.includes(key)) {
            result.creative_format = value;
            break;
          }
        }
      }
    }

    // Product
    if (!result.product_focus) {
      if (KNOWN_PRODUCTS[t]) result.product_focus = KNOWN_PRODUCTS[t];
      else {
        for (const [key, value] of Object.entries(KNOWN_PRODUCTS)) {
          if (t.includes(key)) {
            result.product_focus = value;
            break;
          }
        }
      }
    }
  };

  // Pipe-delimited segments first
  for (const seg of segments) {
    if (/^\d{2,4}[-/]/.test(seg) || /^\d{4}$/.test(seg)) continue;
    detectFromText(seg);
  }

  // Fallback: whole name
  detectFromText(name);

  // Persona detection
  const personaPatterns = [
    /\b(jason|mia|alex|sarah|mike|emma|chris|lisa|tom|amy|david|jessica|mark|rachel)\b/i,
    /\[(\w+)\]/,
    /persona[:\s-]+(\w+)/i,
  ];

  for (const pattern of personaPatterns) {
    const match = name.match(pattern);
    if (match) {
      result.persona = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      break;
    }
  }

  return result;
}

interface EntityInfo {
  id: string;
  name: string;
  status?: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_group_id?: string;
  ad_group_name?: string;
}

async function fetchCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<EntityInfo[]> {
  const url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/campaigns`);
  url.searchParams.set("page_size", "100");

  const response = await fetchWithRetry(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  return (data.items || []).map((c: { id: string; name: string; status?: string }) => ({
    id: c.id,
    name: c.name || `Campaign ${c.id}`,
    status: c.status,
  }));
}

async function fetchAdGroups(
  accessToken: string,
  adAccountId: string,
  campaignMap?: Map<string, { id: string; name: string }>
): Promise<EntityInfo[]> {
  const url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/ad_groups`);
  url.searchParams.set("page_size", "100");

  const response = await fetchWithRetry(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  return (data.items || []).map((ag: { id: string; name: string; status?: string; campaign_id?: string }) => {
    const campaign = campaignMap?.get(ag.campaign_id || '');
    return {
      id: ag.id,
      name: ag.name || `Ad Group ${ag.id}`,
      status: ag.status,
      campaign_id: ag.campaign_id,
      campaign_name: campaign?.name,
    };
  });
}

async function fetchAds(
  accessToken: string,
  adAccountId: string,
  campaignMap?: Map<string, { id: string; name: string }>,
  adGroupMap?: Map<string, { id: string; name: string; campaign_id?: string }>
): Promise<EntityInfo[]> {
  const url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/ads`);
  url.searchParams.set("page_size", "100");

  const response = await fetchWithRetry(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  return (data.items || []).map((ad: { id: string; name: string; status?: string; campaign_id?: string; ad_group_id?: string }) => {
    const campaign = campaignMap?.get(ad.campaign_id || '');
    const adGroup = adGroupMap?.get(ad.ad_group_id || '');
    return {
      id: ad.id,
      name: ad.name || `Ad ${ad.id}`,
      status: ad.status,
      campaign_id: ad.campaign_id,
      campaign_name: campaign?.name,
      ad_group_id: ad.ad_group_id,
      ad_group_name: adGroup?.name,
    };
  });
}

// Legacy functions for backwards compatibility
async function fetchCampaignIds(
  accessToken: string,
  adAccountId: string
): Promise<string[]> {
  const campaigns = await fetchCampaigns(accessToken, adAccountId);
  return campaigns.map(c => c.id);
}

async function fetchAdGroupIds(
  accessToken: string,
  adAccountId: string
): Promise<string[]> {
  const adGroups = await fetchAdGroups(accessToken, adAccountId);
  return adGroups.map(ag => ag.id);
}

async function fetchAdIds(
  accessToken: string,
  adAccountId: string
): Promise<string[]> {
  const ads = await fetchAds(accessToken, adAccountId);
  return ads.map(ad => ad.id);
}

function isWithinAttributionLag(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= ATTRIBUTION_LAG_DAYS;
}

async function fetchPinterestAnalytics(
  accessToken: string,
  adAccountId: string,
  params: AdsReportingRequest
): Promise<{ response: AdsReportingResponse; latencyMs: number }> {
  const startTime = Date.now();
  
  // Build URL based on level and fetch entity info if needed
  let url: URL;
  let entityInfoMap: Map<string, EntityInfo> = new Map();
  let entityType: "campaign" | "ad_group" | "ad" | undefined;
  
  // Create lookup maps for parent references
  let campaignMap: Map<string, { id: string; name: string }> = new Map();
  let adGroupMap: Map<string, { id: string; name: string; campaign_id?: string }> = new Map();
  
  if (params.level === "CAMPAIGN") {
    let campaigns = await fetchCampaigns(accessToken, adAccountId);
    // Filter by active campaigns if requested
    if (params.active_only_campaigns) {
      campaigns = campaigns.filter(c => c.status === "ACTIVE");
      log("info", "filtered_campaigns", { before: campaigns.length, active_only: true });
    }
    if (campaigns.length === 0) {
      throw new Error("No campaigns found in this ad account");
    }
    campaigns.forEach(c => {
      entityInfoMap.set(c.id, c);
      campaignMap.set(c.id, { id: c.id, name: c.name });
    });
    entityType = "campaign";
    url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/campaigns/analytics`);
    url.searchParams.set("campaign_ids", campaigns.map(c => c.id).join(","));
  } else if (params.level === "AD_GROUP") {
    // Fetch campaigns first for reference
    let campaigns = await fetchCampaigns(accessToken, adAccountId);
    // Filter by active campaigns if requested
    if (params.active_only_campaigns) {
      campaigns = campaigns.filter(c => c.status === "ACTIVE");
    }
    campaigns.forEach(c => campaignMap.set(c.id, { id: c.id, name: c.name }));
    
    let adGroups = await fetchAdGroups(accessToken, adAccountId, campaignMap);
    // Filter ad groups by parent campaign if active_only_campaigns
    if (params.active_only_campaigns) {
      const activeCampaignIds = new Set(campaigns.map(c => c.id));
      adGroups = adGroups.filter(ag => ag.campaign_id && activeCampaignIds.has(ag.campaign_id));
    }
    // Filter by active ad groups if requested
    if (params.active_only_ads) {
      adGroups = adGroups.filter(ag => ag.status === "ACTIVE");
    }
    if (adGroups.length === 0) {
      throw new Error("No ad groups found in this ad account");
    }
    adGroups.forEach(ag => entityInfoMap.set(ag.id, ag));
    entityType = "ad_group";
    url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/ad_groups/analytics`);
    url.searchParams.set("ad_group_ids", adGroups.map(ag => ag.id).join(","));
  } else if (params.level === "PIN_PROMOTION") {
    // Fetch campaigns and ad groups first for reference
    let campaigns = await fetchCampaigns(accessToken, adAccountId);
    if (params.active_only_campaigns) {
      campaigns = campaigns.filter(c => c.status === "ACTIVE");
    }
    campaigns.forEach(c => campaignMap.set(c.id, { id: c.id, name: c.name }));
    
    let adGroups = await fetchAdGroups(accessToken, adAccountId, campaignMap);
    if (params.active_only_campaigns) {
      const activeCampaignIds = new Set(campaigns.map(c => c.id));
      adGroups = adGroups.filter(ag => ag.campaign_id && activeCampaignIds.has(ag.campaign_id));
    }
    adGroups.forEach(ag => adGroupMap.set(ag.id, { id: ag.id, name: ag.name, campaign_id: ag.campaign_id }));
    
    let ads = await fetchAds(accessToken, adAccountId, campaignMap, adGroupMap);
    // Filter ads by parent campaign
    if (params.active_only_campaigns) {
      const activeCampaignIds = new Set(campaigns.map(c => c.id));
      ads = ads.filter(ad => ad.campaign_id && activeCampaignIds.has(ad.campaign_id));
    }
    // Filter by active ads if requested
    if (params.active_only_ads) {
      ads = ads.filter(ad => ad.status === "ACTIVE");
    }
    if (ads.length === 0) {
      throw new Error("No ads found in this ad account");
    }
    ads.forEach(ad => entityInfoMap.set(ad.id, ad));
    entityType = "ad";
    url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/ads/analytics`);
    url.searchParams.set("ad_ids", ads.map(ad => ad.id).join(","));
  } else {
    // ACCOUNT level: still fetch campaigns for entity breakdown
    let campaigns = await fetchCampaigns(accessToken, adAccountId);
    if (params.active_only_campaigns) {
      campaigns = campaigns.filter(c => c.status === "ACTIVE");
    }
    campaigns.forEach(c => {
      entityInfoMap.set(c.id, c);
      campaignMap.set(c.id, { id: c.id, name: c.name });
    });
    if (campaigns.length > 0) {
      entityType = "campaign";
    }
    url = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/analytics`);
  }
  
  // For ACCOUNT level, we need a separate API call to get per-campaign breakdown
  let campaignAnalyticsData: any[] = [];
  if (params.level === "ACCOUNT" && entityInfoMap.size > 0) {
    const campaignUrl = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/campaigns/analytics`);
    campaignUrl.searchParams.set("campaign_ids", Array.from(entityInfoMap.keys()).join(","));
    campaignUrl.searchParams.set("start_date", params.start_date);
    campaignUrl.searchParams.set("end_date", params.end_date);
    campaignUrl.searchParams.set("granularity", "TOTAL"); // Aggregate for entity breakdown
    campaignUrl.searchParams.set("click_window_days", params.click_window_days.toString());
    campaignUrl.searchParams.set("view_window_days", params.view_window_days.toString());
    campaignUrl.searchParams.set("columns", METRICS_COLUMNS);
    
    try {
      const campaignResponse = await fetchWithRetry(campaignUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      campaignAnalyticsData = await campaignResponse.json();
      log("info", "campaign_analytics_fetched", { count: campaignAnalyticsData.length });
    } catch (e) {
      log("warn", "campaign_analytics_failed", { error: String(e) });
    }
  }

  url.searchParams.set("start_date", params.start_date);
  url.searchParams.set("end_date", params.end_date);
  url.searchParams.set("granularity", params.granularity);
  url.searchParams.set("click_window_days", params.click_window_days.toString());
  url.searchParams.set("view_window_days", params.view_window_days.toString());
  url.searchParams.set("columns", METRICS_COLUMNS);

  log("info", "api_request_start", { 
    level: params.level, 
    date_range: `${params.start_date} to ${params.end_date}`,
    entity_count: entityInfoMap.size || 1,
  });

  const response = await fetchWithRetry(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const rawData = await response.json();
  const latencyMs = Date.now() - startTime;
  
  log("info", "api_request_complete", { 
    entries: rawData.length || 0, 
    latency_ms: latencyMs 
  });

  // Process timeseries (aggregated across all entities)
  const timeseries: TimeseriesEntry[] = [];
  const totalsAccum: Record<string, number> = {
    SPEND_IN_MICRO_DOLLAR: 0,
    TOTAL_IMPRESSION: 0,
    TOTAL_CLICKTHROUGH: 0,
    TOTAL_CONVERSIONS: 0,
    TOTAL_CHECKOUT: 0,
    TOTAL_CLICK_ADD_TO_CART: 0,
    TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR: 0,
  };

  // Per-entity accumulators (for breakdown by entity)
  const entityAccum: Map<string, Record<string, number>> = new Map();
  
  let hasAnyAttributionLag = false;

  // Aggregate by date for timeseries and by entity for breakdown
  const dateAggregates: Map<string, Record<string, number>> = new Map();

  for (const entry of rawData) {
    const date = entry.DATE;
    const hasLag = date ? isWithinAttributionLag(date) : false;
    
    if (hasLag) hasAnyAttributionLag = true;
    
    // Get entity ID from the entry (Pinterest returns CAMPAIGN_ID, AD_GROUP_ID, or AD_ID)
    const entityId = entry.CAMPAIGN_ID || entry.AD_GROUP_ID || entry.AD_ID;
    
    // Aggregate for timeseries by date
    if (date) {
      if (!dateAggregates.has(date)) {
        dateAggregates.set(date, {
          SPEND_IN_MICRO_DOLLAR: 0,
          TOTAL_IMPRESSION: 0,
          TOTAL_CLICKTHROUGH: 0,
          TOTAL_CONVERSIONS: 0,
          TOTAL_CHECKOUT: 0,
          TOTAL_CLICK_ADD_TO_CART: 0,
          TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR: 0,
        });
      }
      const dateEntry = dateAggregates.get(date)!;
      for (const key of Object.keys(dateEntry)) {
        dateEntry[key] += entry[key] || 0;
      }
    }
    
    // Aggregate per entity (for entity breakdown)
    if (entityId && entityType) {
      if (!entityAccum.has(entityId)) {
        entityAccum.set(entityId, {
          SPEND_IN_MICRO_DOLLAR: 0,
          TOTAL_IMPRESSION: 0,
          TOTAL_CLICKTHROUGH: 0,
          TOTAL_CONVERSIONS: 0,
          TOTAL_CHECKOUT: 0,
          TOTAL_CLICK_ADD_TO_CART: 0,
          TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR: 0,
        });
      }
      const entityEntry = entityAccum.get(entityId)!;
      for (const key of Object.keys(entityEntry)) {
        entityEntry[key] += entry[key] || 0;
      }
    }

    // Aggregate totals
    for (const key of Object.keys(totalsAccum)) {
      totalsAccum[key] += entry[key] || 0;
    }
  }

  // Build timeseries from date aggregates
  for (const [date, rawMetrics] of dateAggregates.entries()) {
    const metrics = processRawMetrics(rawMetrics);
    timeseries.push({
      date,
      ...metrics,
      has_attribution_lag: isWithinAttributionLag(date),
    });
  }

  // Sort by date ascending
  timeseries.sort((a, b) => a.date.localeCompare(b.date));

  // Build entities breakdown
  const entities: EntityMetrics[] = [];
  
  // For ACCOUNT level, use the separate campaign analytics data
  if (params.level === "ACCOUNT" && campaignAnalyticsData.length > 0) {
    for (const entry of campaignAnalyticsData) {
      const campaignId = entry.CAMPAIGN_ID;
      if (!campaignId) continue;
      
      const entityInfo = entityInfoMap.get(campaignId);
      const name = entityInfo?.name || `Campaign ${campaignId}`;
      const creativeInfo = parseCreativeFromName(name);
      const creativeForCampaign = {
        ...creativeInfo,
        creative_category: creativeInfo.creative_category || "Other",
      };
      
      const rawMetrics = {
        SPEND_IN_MICRO_DOLLAR: entry.SPEND_IN_MICRO_DOLLAR || 0,
        TOTAL_IMPRESSION: entry.TOTAL_IMPRESSION || 0,
        TOTAL_CLICKTHROUGH: entry.TOTAL_CLICKTHROUGH || 0,
        TOTAL_CONVERSIONS: entry.TOTAL_CONVERSIONS || 0,
        TOTAL_CHECKOUT: entry.TOTAL_CHECKOUT || 0,
        TOTAL_CLICK_ADD_TO_CART: entry.TOTAL_CLICK_ADD_TO_CART || 0,
        TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR: entry.TOTAL_CHECKOUT_VALUE_IN_MICRO_DOLLAR || 0,
      };
      const metrics = processRawMetrics(rawMetrics);
      
      entities.push({
        id: campaignId,
        name,
        entity_type: "campaign",
        status: entityInfo?.status,
        ...metrics,
        ...creativeForCampaign,
      });
    }
    entities.sort((a, b) => b.spend - a.spend);
  } else if (entityType) {
    // For other levels, use the accumulated entity data
    for (const [entityId, rawMetrics] of entityAccum.entries()) {
      const entityInfo = entityInfoMap.get(entityId);
      const name = entityInfo?.name || `Unknown ${entityId}`;
      const creativeInfo = parseCreativeFromName(name);
      const metrics = processRawMetrics(rawMetrics);

      const creativeFinal =
        entityType === "campaign"
          ? { ...creativeInfo, creative_category: creativeInfo.creative_category || "Other" }
          : creativeInfo;
      
      entities.push({
        id: entityId,
        name,
        entity_type: entityType,
        status: entityInfo?.status,
        campaign_id: entityInfo?.campaign_id,
        campaign_name: entityInfo?.campaign_name,
        ad_group_id: entityInfo?.ad_group_id,
        ad_group_name: entityInfo?.ad_group_name,
        ...metrics,
        ...creativeFinal,
      });
    }
    
    // Sort entities by spend descending (highest spenders first)
    entities.sort((a, b) => b.spend - a.spend);
  }

  const totals = processRawMetrics(totalsAccum);
  const now = new Date().toISOString();

  log("info", "analytics_processed", {
    timeseries_entries: timeseries.length,
    entities_count: entities.length,
    total_spend: totals.spend,
  });

  return {
    response: {
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
      entities: entities.length > 0 ? entities : undefined,
      cached_at: null,
      is_cached: false,
      cache_hit: false,
      fetched_at: now,
      api_latency_ms: latencyMs,
      attribution_lag_warning: hasAnyAttributionLag,
      currency: "EUR", // Assumed - Pinterest returns USD, we display as EUR
    },
    latencyMs,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  const requestStart = Date.now();
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  log("info", "request_received", { method: req.method });

  try {
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const PINTEREST_APP_ID = getEnvVar("PINTEREST_APP_ID");
    const PINTEREST_APP_SECRET = getEnvVar("PINTEREST_APP_SECRET");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params with UTC date handling
    const url = new URL(req.url);
    const today = new Date();
    const todayUTC = today.toISOString().split("T")[0];
    
    const defaultStart = new Date(today);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 14);
    const defaultStartUTC = defaultStart.toISOString().split("T")[0];

    const params: AdsReportingRequest = {
      start_date: url.searchParams.get("start_date") || defaultStartUTC,
      end_date: url.searchParams.get("end_date") || todayUTC,
      granularity: (url.searchParams.get("granularity") || "DAY") as AdsReportingRequest["granularity"],
      level: (url.searchParams.get("level") || "ACCOUNT") as AdsReportingRequest["level"],
      click_window_days: parseInt(url.searchParams.get("click_window_days") || "30"),
      view_window_days: parseInt(url.searchParams.get("view_window_days") || "1"),
      force_refresh: url.searchParams.get("force_refresh") === "true",
      active_only_campaigns: url.searchParams.get("active_only_campaigns") === "true",
      active_only_ads: url.searchParams.get("active_only_ads") === "true",
    };

    // Validate date range (max 90 days)
    const startDate = new Date(params.start_date + "T00:00:00Z");
    const endDate = new Date(params.end_date + "T00:00:00Z");
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      return createErrorResponse("Date range cannot exceed 90 days", 400);
    }

    if (daysDiff < 0) {
      return createErrorResponse("Start date must be before end date", 400);
    }

    log("info", "params_parsed", { 
      ...params, 
      days_range: daysDiff 
    });

    // Check cache first (unless force_refresh)
    const cacheKey = generateCacheKey(PINTEREST_AD_ACCOUNT_ID, params);
    let cachedData: AdsReportingResponse | null = null;
    let isStale = false;

    if (!params.force_refresh) {
      const cacheResult = await getCachedData(supabase, cacheKey);
      cachedData = cacheResult.data;
      isStale = cacheResult.isStale;

      if (cachedData && !isStale) {
        log("info", "returning_cached", { 
          total_latency_ms: Date.now() - requestStart 
        });
        return createSuccessResponse(cachedData);
      }
    }

    // Need fresh data - get access token
    if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) {
      if (cachedData) {
        log("warn", "no_oauth_returning_stale");
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
        log("warn", "token_error_returning_stale", { error: String(tokenError) });
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
      const result = await fetchPinterestAnalytics(accessToken, PINTEREST_AD_ACCOUNT_ID, params);
      freshData = result.response;
    } catch (apiError) {
      const errorMsg = String(apiError);
      
      if (errorMsg.includes("RATE_LIMITED") && cachedData) {
        log("warn", "rate_limited_returning_stale");
        return createSuccessResponse({
          ...cachedData,
          rate_limited: true,
          stale: true,
        });
      }

      if (cachedData) {
        log("warn", "api_error_returning_stale", { error: errorMsg });
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

    log("info", "returning_fresh", { 
      total_latency_ms: Date.now() - requestStart,
      spend: freshData.totals.spend,
      revenue: freshData.totals.revenue,
      roas: freshData.totals.roas,
    });
    
    return createSuccessResponse(freshData);

  } catch (error) {
    log("error", "request_failed", { 
      error: error instanceof Error ? error.message : String(error),
      total_latency_ms: Date.now() - requestStart,
    });
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
