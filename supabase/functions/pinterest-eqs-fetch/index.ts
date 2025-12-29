/**
 * Pinterest EQS (Event Quality Score) Fetch Edge Function
 * 
 * Fetches EQS metrics from Pinterest Ads API and persists snapshots for trend analysis.
 * Runs daily via cron to track measurement quality over time.
 * 
 * Pinterest EQS API: GET /v5/ad_accounts/{AD_ACCOUNT_ID}/conversion_eqs
 * 
 * Required secrets:
 * - PINTEREST_AD_ACCOUNT_ID
 * - (optional) PINTEREST_ACCESS_TOKEN (preferred if provided)
 * - (optional) PINTEREST_APP_ID + PINTEREST_APP_SECRET (used for OAuth token refresh)
 * 
 * OAuth tokens are stored in pinterest_oauth_tokens table via OAuth flow.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
  validateCronSecret,
} from "../_shared/env.ts";

// ============================================================================
// OAUTH TOKEN MANAGEMENT
// ============================================================================

interface PinterestTokens {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
}

/**
 * Get valid Pinterest access token, refreshing if expired
 */
async function getValidAccessToken(
  supabase: SupabaseClient,
  appId: string,
  appSecret: string
): Promise<string> {
  // Fetch current tokens from database
  const { data: tokenData, error: fetchError } = await supabase
    .from("pinterest_oauth_tokens")
    .select("id, access_token, refresh_token, expires_at")
    .single();

  if (fetchError || !tokenData) {
    throw new Error("No Pinterest OAuth tokens found. Please connect Pinterest via OAuth first.");
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer before expiry

  // Check if token is still valid (with buffer)
  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    console.log("[Pinterest EQS] Using existing valid token");
    return tokenData.access_token;
  }

  // Token expired or expiring soon - refresh it
  if (!tokenData.refresh_token) {
    throw new Error("Access token expired and no refresh token available. Please re-authorize.");
  }

  console.log("[Pinterest EQS] Token expired, refreshing...");
  
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
    console.error("[Pinterest EQS] Token refresh failed:", response.status, errorText);
    throw new Error(`Token refresh failed: ${response.status}. Please re-authorize Pinterest.`);
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database
  const { error: updateError } = await supabase
    .from("pinterest_oauth_tokens")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokenData.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenData.id);

  if (updateError) {
    console.error("[Pinterest EQS] Failed to update tokens:", updateError);
    // Still return the new token even if db update fails
  } else {
    console.log("[Pinterest EQS] Token refreshed successfully");
  }

  return newTokens.access_token;
}

// ============================================================================
// TYPES
// ============================================================================

interface EQSComponent {
  name: string;
  status: string;
  coverage?: number;
  recommendation?: string;
}

interface EQSResponse {
  overall_status: string;
  quality_components: EQSComponent[];
}

interface BlockingIssue {
  issue_type: string;
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

// Known issue types and their severities
const ISSUE_SEVERITY_MAP: Record<string, "high" | "medium" | "low"> = {
  click_id_coverage_low: "high",
  email_coverage_low: "high",
  product_id_mismatch: "medium",
  external_id_missing: "medium",
  order_id_missing: "low",
  duplicate_events: "medium",
  stale_events: "low",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract coverage percentage from quality components.
 * Pinterest often returns coverage as either 0..1 or 0..100 depending on endpoint/version.
 * Component names from Pinterest: email, external_id, click_id, order_id, user_agent, ip_address, source_url
 */
function extractCoverage(components: EQSComponent[], componentName: string): number | null {
  // Map our names to Pinterest's actual field names
  const nameMap: Record<string, string[]> = {
    "email": ["email", "em", "hashed_email"],
    "click_id": ["click_id", "epik", "click"],
    "order_id": ["order_id", "order"],
    "external_id": ["external_id", "external"],
  };
  
  const searchNames = nameMap[componentName.toLowerCase()] || [componentName.toLowerCase()];
  
  const component = components.find((c) =>
    searchNames.some(name => c.name.toLowerCase() === name || c.name.toLowerCase().includes(name))
  );

  const raw = component?.coverage;
  if (typeof raw !== "number") return null;

  // Coverage is usually 0..100, but normalize just in case
  if (raw >= 0 && raw <= 1) return Math.round(raw * 10000) / 100;

  return Math.round(raw * 100) / 100;
}

interface DetailedComponent {
  name: string;
  status: string;
  coverage: number | undefined;
  event_types: Record<string, { coverage: number; issues?: Array<{ id: string; name: string; reason: string }> }>;
}

function normalizeEqsPayload(payload: any): { 
  overall_status: string | null; 
  quality_components: EQSComponent[];
  detailed_components: DetailedComponent[];
  raw_quality_components: any;
} {
  // Pinterest often returns an array - extract first element
  let root = payload?.data ?? payload;
  if (Array.isArray(root) && root.length > 0) {
    root = root[0];
    console.log("[Pinterest EQS] Extracted first element from array response");
  }

  const overall =
    typeof root?.overall_status === "string"
      ? root.overall_status
      : typeof root?.overallStatus === "string"
        ? root.overallStatus
        : null;

  // Store raw for detailed display
  const rawQualityComponents = root?.quality_components || {};

  // Most common: array of components
  if (Array.isArray(root?.quality_components)) {
    return { 
      overall_status: overall, 
      quality_components: root.quality_components,
      detailed_components: [],
      raw_quality_components: rawQualityComponents,
    };
  }

  // Sometimes returned as object keyed by component name (e.g., { email: {...}, click_id: {...} })
  if (root?.quality_components && typeof root.quality_components === "object") {
    const components: EQSComponent[] = [];
    const detailedComponents: DetailedComponent[] = [];
    
    for (const [componentName, eventTypes] of Object.entries(root.quality_components)) {
      // eventTypes is like { checkout: { coverage: 100 }, add_to_cart: { coverage: 100 } }
      if (typeof eventTypes === "object" && eventTypes !== null) {
        // Calculate average coverage across all event types for this component
        let totalCoverage = 0;
        let coverageCount = 0;
        let hasIssues = false;
        const eventTypeDetails: DetailedComponent["event_types"] = {};
        
        for (const [eventType, data] of Object.entries(eventTypes as Record<string, any>)) {
          if (typeof data?.coverage === "number") {
            totalCoverage += data.coverage;
            coverageCount++;
            eventTypeDetails[eventType] = {
              coverage: Math.round(data.coverage * 100) / 100,
              issues: Array.isArray(data.issues) ? data.issues : undefined,
            };
          }
          if (Array.isArray(data?.issues) && data.issues.length > 0) {
            hasIssues = true;
          }
        }
        
        const avgCoverage = coverageCount > 0 ? totalCoverage / coverageCount : undefined;
        const status = hasIssues ? "NEEDS_IMPROVEMENT" : (avgCoverage && avgCoverage >= 90 ? "GOOD" : "FAIR");
        
        components.push({
          name: componentName,
          status,
          coverage: avgCoverage !== undefined ? Math.round(avgCoverage * 100) / 100 : undefined,
          recommendation: undefined,
        });

        detailedComponents.push({
          name: componentName,
          status,
          coverage: avgCoverage !== undefined ? Math.round(avgCoverage * 100) / 100 : undefined,
          event_types: eventTypeDetails,
        });
      }
    }
    
    console.log(`[Pinterest EQS] Parsed ${components.length} components from object format`);
    return { 
      overall_status: overall, 
      quality_components: components,
      detailed_components: detailedComponents,
      raw_quality_components: rawQualityComponents,
    };
  }

  // Unknown shape
  console.log("[Pinterest EQS] Unknown payload shape, returning empty components");
  return { 
    overall_status: overall, 
    quality_components: [],
    detailed_components: [],
    raw_quality_components: rawQualityComponents,
  };
}

/**
 * Derive blocking issues from quality components
 * Returns max 3 issues sorted by severity
 */
function deriveBlockingIssues(components: EQSComponent[]): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  for (const component of components) {
    if (component.status === "NEEDS_IMPROVEMENT" || component.status === "FAIR") {
      const issueType = component.name.toLowerCase().replace(/\s+/g, "_");
      const severity = ISSUE_SEVERITY_MAP[issueType] || "medium";
      
      let description = `${component.name} needs improvement`;
      let recommendation = component.recommendation || "Review Pinterest Event Manager for details";

      // Generate specific recommendations based on component type
      if (component.name.toLowerCase().includes("click_id")) {
        description = "Click ID (EPIK) coverage is insufficient for optimal attribution";
        recommendation = "Ensure Pinterest click parameter is captured on landing pages and passed through checkout";
      } else if (component.name.toLowerCase().includes("email")) {
        description = "Email coverage is below optimal threshold";
        recommendation = "Capture customer email earlier in the funnel (e.g., email popup before checkout)";
      } else if (component.name.toLowerCase().includes("product")) {
        description = "Product catalog mismatch detected";
        recommendation = "Verify product IDs in events match your Pinterest catalog feed";
      } else if (component.name.toLowerCase().includes("external_id")) {
        description = "External ID not being sent with events";
        recommendation = "Add external_id (customer ID) to conversion events for better matching";
      } else if (component.name.toLowerCase().includes("order")) {
        description = "Order ID coverage is incomplete";
        recommendation = "Ensure order_id is sent with all checkout events";
      }

      issues.push({
        issue_type: issueType,
        severity,
        description,
        recommendation,
      });
    }
  }

  // Sort by severity (high > medium > low) and return top 3
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return issues
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 3);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Validate admin user via Supabase JWT
 */
async function validateAdminAuth(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  
  const token = authHeader.replace("Bearer ", "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return false;
    
    // Check if user has admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    return !!roles;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Pinterest EQS Fetch] Request received");

  // Validate auth - accept either CRON_SECRET or admin JWT
  const authHeader = req.headers.get("Authorization");
  const isCronAuth = validateCronSecret(authHeader);
  const isAdminAuth = !isCronAuth && await validateAdminAuth(authHeader);
  
  if (!isCronAuth && !isAdminAuth) {
    console.error("[Pinterest EQS Fetch] Unauthorized - invalid credentials");
    return createErrorResponse("Unauthorized", 401);
  }
  
  console.log(`[Pinterest EQS Fetch] Auth: ${isCronAuth ? "cron" : "admin"}`);

  try {
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Prefer a direct long-lived access token if provided; otherwise use stored OAuth tokens.
    const directAccessToken = Deno.env.get("PINTEREST_ACCESS_TOKEN")?.trim();
    const PINTEREST_ACCESS_TOKEN = directAccessToken
      ? (console.log("[Pinterest EQS] Using PINTEREST_ACCESS_TOKEN secret"), directAccessToken)
      : await getValidAccessToken(
          supabase,
          requireEnvVar("PINTEREST_APP_ID"),
          requireEnvVar("PINTEREST_APP_SECRET")
        );

    // ========================================================================
    // FETCH EQS FROM PINTEREST API - BOTH INGESTION SOURCES
    // ========================================================================

    const lookbackPeriod = "14d";
    const sourcePlatform = "WEB";
    const ingestionSources = ["CONVERSIONS_API", "TAG"] as const;

    interface IngestionResult {
      ingestionSource: string;
      responseStatus: number;
      apiErrorMessage: string | null;
      overallStatus: string;
      components: EQSComponent[];
      rawQualityComponents: any;
    }

    const results: IngestionResult[] = [];

    for (const ingestionSource of ingestionSources) {
      const eqsUrl = new URL(
        `https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/conversion_eqs`
      );
      eqsUrl.searchParams.set("lookback_period", lookbackPeriod);
      eqsUrl.searchParams.set("ingestion_source", ingestionSource);
      eqsUrl.searchParams.set("source_platform", sourcePlatform);

      console.log("[Pinterest EQS Fetch] Calling Pinterest API:", eqsUrl.toString());

      try {
        const pinterestResponse = await fetch(eqsUrl.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        const responseStatus = pinterestResponse.status;
        const responseText = await pinterestResponse.text();

        if (!pinterestResponse.ok) {
          console.error(`[Pinterest EQS Fetch] API error for ${ingestionSource}:`, responseStatus, responseText.slice(0, 200));
          results.push({
            ingestionSource,
            responseStatus,
            apiErrorMessage: `API error ${responseStatus}: ${responseText.slice(0, 200)}`,
            overallStatus: "ERROR",
            components: [],
            rawQualityComponents: {},
          });
          continue;
        }

        console.log(`[Pinterest EQS Fetch] ${ingestionSource} raw response (first 500):`, responseText.slice(0, 500));

        let parsed: any;
        try {
          parsed = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[Pinterest EQS Fetch] Parse error for ${ingestionSource}:`, responseText.slice(0, 200));
          results.push({
            ingestionSource,
            responseStatus,
            apiErrorMessage: `Failed to parse response`,
            overallStatus: "ERROR",
            components: [],
            rawQualityComponents: {},
          });
          continue;
        }

        const normalized = normalizeEqsPayload(parsed);
        
        console.log(`[Pinterest EQS Fetch] ${ingestionSource} EQS data received:`, {
          overall_status: normalized.overall_status,
          component_count: normalized.quality_components.length,
          raw_keys: Object.keys(normalized.raw_quality_components),
        });

        results.push({
          ingestionSource,
          responseStatus,
          apiErrorMessage: null,
          overallStatus: normalized.overall_status || "UNKNOWN",
          components: normalized.quality_components,
          rawQualityComponents: normalized.raw_quality_components,
        });

      } catch (err) {
        console.error(`[Pinterest EQS Fetch] Fetch error for ${ingestionSource}:`, err);
        results.push({
          ingestionSource,
          responseStatus: 0,
          apiErrorMessage: err instanceof Error ? err.message : "Unknown error",
          overallStatus: "ERROR",
          components: [],
          rawQualityComponents: {},
        });
      }
    }

    // ========================================================================
    // PERSIST SNAPSHOTS FOR EACH INGESTION SOURCE
    // ========================================================================

    const savedSnapshots: string[] = [];

    for (const result of results) {
      // Skip if no meaningful data
      if (result.overallStatus === "ERROR" && result.components.length === 0) {
        console.log(`[Pinterest EQS Fetch] Skipping ${result.ingestionSource} - error/no data`);
        continue;
      }

      const coverageEmail = extractCoverage(result.components, "email");
      const coverageExternalId = extractCoverage(result.components, "external_id");
      const coverageOrderId = extractCoverage(result.components, "order_id");
      const coverageClickId = extractCoverage(result.components, "click_id");
      const blockingIssues = deriveBlockingIssues(result.components);

      console.log(`[Pinterest EQS Fetch] ${result.ingestionSource} derived metrics:`, {
        overall_status: result.overallStatus,
        coverage_email: coverageEmail,
        coverage_click_id: coverageClickId,
        component_keys: Object.keys(result.rawQualityComponents),
      });

      const { data: insertData, error: insertError } = await supabase
        .from("pinterest_eqs_snapshots")
        .insert({
          ad_account_id: PINTEREST_AD_ACCOUNT_ID,
          overall_status: result.overallStatus,
          source_platform: sourcePlatform,
          ingestion_source: result.ingestionSource,
          lookback_period: lookbackPeriod,
          quality_components: result.rawQualityComponents,
          coverage_email: coverageEmail,
          coverage_external_id: coverageExternalId,
          coverage_order_id: coverageOrderId,
          coverage_click_id: coverageClickId,
          blocking_issues: blockingIssues,
          api_response_status: result.responseStatus,
          api_error_message: result.apiErrorMessage,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`[Pinterest EQS Fetch] DB insert error for ${result.ingestionSource}:`, insertError);
      } else {
        console.log(`[Pinterest EQS Fetch] Snapshot saved for ${result.ingestionSource}:`, insertData?.id);
        savedSnapshots.push(insertData?.id || "");
      }
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================

    // Use CONVERSIONS_API as primary for response summary
    const primaryResult = results.find(r => r.ingestionSource === "CONVERSIONS_API") || results[0];
    const primaryCoverage = {
      email: extractCoverage(primaryResult?.components || [], "email"),
      external_id: extractCoverage(primaryResult?.components || [], "external_id"),
      order_id: extractCoverage(primaryResult?.components || [], "order_id"),
      click_id: extractCoverage(primaryResult?.components || [], "click_id"),
    };

    return createSuccessResponse({
      success: true,
      snapshots_saved: savedSnapshots.length,
      snapshot_ids: savedSnapshots,
      sources_fetched: results.map(r => ({
        source: r.ingestionSource,
        status: r.overallStatus,
        components: Object.keys(r.rawQualityComponents).length,
      })),
      overall_status: primaryResult?.overallStatus || "UNKNOWN",
      coverage: primaryCoverage,
      message: `EQS snapshots saved for ${savedSnapshots.length} ingestion source(s)`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pinterest EQS Fetch] Error:", errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
});
