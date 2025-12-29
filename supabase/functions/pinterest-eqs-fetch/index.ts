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
 */
function extractCoverage(components: EQSComponent[], componentName: string): number | null {
  const component = components.find((c) =>
    c.name.toLowerCase().includes(componentName.toLowerCase())
  );

  const raw = component?.coverage;
  if (typeof raw !== "number") return null;

  // Normalize 0..1 → 0..100
  if (raw >= 0 && raw <= 1) return Math.round(raw * 10000) / 100;

  return raw;
}

function normalizeEqsPayload(payload: any): { overall_status: string | null; quality_components: EQSComponent[] } {
  const root = payload?.data ?? payload;

  const overall =
    typeof root?.overall_status === "string"
      ? root.overall_status
      : typeof root?.overallStatus === "string"
        ? root.overallStatus
        : null;

  // Most common: array of components
  if (Array.isArray(root?.quality_components)) {
    return { overall_status: overall, quality_components: root.quality_components };
  }

  // Sometimes returned as object keyed by component name
  if (root?.quality_components && typeof root.quality_components === "object") {
    const components: EQSComponent[] = Object.entries(root.quality_components).map(([name, value]: any) => ({
      name,
      status: String(value?.status ?? value?.overall_status ?? value?.overallStatus ?? "UNKNOWN"),
      coverage: typeof value?.coverage === "number" ? value.coverage : undefined,
      recommendation: typeof value?.recommendation === "string" ? value.recommendation : undefined,
    }));
    return { overall_status: overall, quality_components: components };
  }

  // Unknown shape
  return { overall_status: overall, quality_components: [] };
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
    // FETCH EQS FROM PINTEREST API
    // ========================================================================

    const lookbackPeriod = "14d";
    const sourcePlatform = "WEB";
    const ingestionSources = ["CONVERSIONS_API", "TAG"] as const;

    let responseStatus = 0;
    let apiErrorMessage: string | null = null;
    let overallStatus: string = "UNKNOWN";
    let components: EQSComponent[] = [];
    let ingestionSourceUsed: (typeof ingestionSources)[number] = "CONVERSIONS_API";

    for (const ingestionSource of ingestionSources) {
      const eqsUrl = new URL(
        `https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/conversion_eqs`
      );
      eqsUrl.searchParams.set("lookback_period", lookbackPeriod);
      eqsUrl.searchParams.set("ingestion_source", ingestionSource);
      eqsUrl.searchParams.set("source_platform", sourcePlatform);

      console.log("[Pinterest EQS Fetch] Calling Pinterest API:", eqsUrl.toString());

      const pinterestResponse = await fetch(eqsUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      responseStatus = pinterestResponse.status;
      const responseText = await pinterestResponse.text();

      if (!pinterestResponse.ok) {
        apiErrorMessage = `API error ${responseStatus}: ${responseText.slice(0, 500)}`;
        console.error("[Pinterest EQS Fetch] API error:", apiErrorMessage);
        break;
      }

      console.log("[Pinterest EQS Fetch] Raw response (first 300):", responseText.slice(0, 300));

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseError) {
        apiErrorMessage = `Failed to parse response: ${responseText.slice(0, 200)}`;
        console.error("[Pinterest EQS Fetch] Parse error:", apiErrorMessage);
        break;
      }

      const normalized = normalizeEqsPayload(parsed);
      const normalizedComponents = normalized.quality_components || [];
      const normalizedOverall = normalized.overall_status;

      console.log("[Pinterest EQS Fetch] EQS data received:", {
        overall_status: normalizedOverall,
        component_count: Array.isArray(normalizedComponents) ? normalizedComponents.length : 0,
        ingestion_source: ingestionSource,
      });

      // If we got anything meaningful, keep it and stop.
      if ((normalizedOverall && normalizedOverall !== "UNKNOWN") || normalizedComponents.length > 0) {
        components = normalizedComponents;
        overallStatus = normalizedOverall || "UNKNOWN";
        ingestionSourceUsed = ingestionSource;
        apiErrorMessage = null;
        break;
      }

      // Otherwise, try next ingestion_source.
      ingestionSourceUsed = ingestionSource;
      components = normalizedComponents;
      overallStatus = normalizedOverall || "UNKNOWN";
    }

    // If 200 but no useful fields returned, annotate so UI doesn't look "broken".
    if (responseStatus === 200 && components.length === 0 && overallStatus === "UNKNOWN") {
      apiErrorMessage =
        "EQS returned no components yet. This usually means Pinterest hasn't computed EQS for this account/source (or there were no eligible events in the last 14 days).";
    }

    // ========================================================================
    // DERIVE INSIGHTS AND PERSIST SNAPSHOT
    // ========================================================================

    const coverageEmail = extractCoverage(components, "email");
    const coverageExternalId = extractCoverage(components, "external_id");
    const coverageOrderId = extractCoverage(components, "order_id");
    const coverageClickId = extractCoverage(components, "click_id");

    const blockingIssues = deriveBlockingIssues(components);

    console.log("[Pinterest EQS Fetch] Derived metrics:", {
      overall_status: overallStatus,
      coverage_email: coverageEmail,
      coverage_click_id: coverageClickId,
      blocking_issues_count: blockingIssues.length,
    });

    // Insert snapshot
    const { data: insertData, error: insertError } = await supabase
      .from("pinterest_eqs_snapshots")
      .insert({
        ad_account_id: PINTEREST_AD_ACCOUNT_ID,
        overall_status: overallStatus,
        source_platform: sourcePlatform,
        ingestion_source: ingestionSourceUsed,
        lookback_period: lookbackPeriod,
        quality_components: components,
        coverage_email: coverageEmail,
        coverage_external_id: coverageExternalId,
        coverage_order_id: coverageOrderId,
        coverage_click_id: coverageClickId,
        blocking_issues: blockingIssues,
        api_response_status: responseStatus,
        api_error_message: apiErrorMessage,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Pinterest EQS Fetch] DB insert error:", insertError);
      return createErrorResponse(`Database error: ${insertError.message}`, 500);
    }

    console.log("[Pinterest EQS Fetch] Snapshot saved:", insertData?.id);

    // ========================================================================
    // RESPONSE
    // ========================================================================

    return createSuccessResponse({
      success: true,
      snapshot_id: insertData?.id,
      overall_status: overallStatus,
      coverage: {
        email: coverageEmail,
        external_id: coverageExternalId,
        order_id: coverageOrderId,
        click_id: coverageClickId,
      },
      blocking_issues: blockingIssues.length,
      api_status: responseStatus,
      message: apiErrorMessage ? "EQS fetch failed, snapshot saved with error" : "EQS snapshot saved successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pinterest EQS Fetch] Error:", errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
});
