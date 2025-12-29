/**
 * Pinterest EQS (Event Quality Score) Fetch Edge Function
 * 
 * Fetches EQS metrics from Pinterest Ads API and persists snapshots for trend analysis.
 * Runs daily via cron to track measurement quality over time.
 * 
 * Pinterest EQS API: GET /v5/ad_accounts/{AD_ACCOUNT_ID}/conversion_eqs
 * 
 * Required secrets:
 * - PINTEREST_CONVERSION_TOKEN (OAuth token with ads:read scope)
 * - PINTEREST_AD_ACCOUNT_ID
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
  validateCronSecret,
} from "../_shared/env.ts";

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
 * Extract coverage percentage from quality components
 */
function extractCoverage(components: EQSComponent[], componentName: string): number | null {
  const component = components.find(c => 
    c.name.toLowerCase().includes(componentName.toLowerCase())
  );
  if (component && typeof component.coverage === "number") {
    return component.coverage;
  }
  return null;
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

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Pinterest EQS Fetch] Request received");

  // Validate CRON_SECRET for scheduled execution
  const authHeader = req.headers.get("Authorization");
  if (!validateCronSecret(authHeader)) {
    console.error("[Pinterest EQS Fetch] Unauthorized - invalid CRON_SECRET");
    return createErrorResponse("Unauthorized", 401);
  }

  try {
    const PINTEREST_CONVERSION_TOKEN = requireEnvVar("PINTEREST_CONVERSION_TOKEN");
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========================================================================
    // FETCH EQS FROM PINTEREST API
    // ========================================================================

    const eqsUrl = new URL(`https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/conversion_eqs`);
    eqsUrl.searchParams.set("lookback_period", "14d");
    eqsUrl.searchParams.set("ingestion_source", "CONVERSIONS_API");
    eqsUrl.searchParams.set("source_platform", "WEB");

    console.log("[Pinterest EQS Fetch] Calling Pinterest API:", eqsUrl.toString());

    const pinterestResponse = await fetch(eqsUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PINTEREST_CONVERSION_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const responseStatus = pinterestResponse.status;
    let eqsData: EQSResponse | null = null;
    let apiErrorMessage: string | null = null;

    if (pinterestResponse.ok) {
      const responseText = await pinterestResponse.text();
      try {
        eqsData = JSON.parse(responseText);
        console.log("[Pinterest EQS Fetch] EQS data received:", {
          overall_status: eqsData?.overall_status,
          component_count: eqsData?.quality_components?.length || 0,
        });
      } catch (parseError) {
        apiErrorMessage = `Failed to parse response: ${responseText.slice(0, 200)}`;
        console.error("[Pinterest EQS Fetch] Parse error:", apiErrorMessage);
      }
    } else {
      const errorText = await pinterestResponse.text();
      apiErrorMessage = `API error ${responseStatus}: ${errorText.slice(0, 500)}`;
      console.error("[Pinterest EQS Fetch] API error:", apiErrorMessage);
    }

    // ========================================================================
    // DERIVE INSIGHTS AND PERSIST SNAPSHOT
    // ========================================================================

    const components = eqsData?.quality_components || [];
    const overallStatus = eqsData?.overall_status || "UNKNOWN";

    // Extract coverage metrics
    const coverageEmail = extractCoverage(components, "email");
    const coverageExternalId = extractCoverage(components, "external_id");
    const coverageOrderId = extractCoverage(components, "order_id");
    const coverageClickId = extractCoverage(components, "click_id");

    // Derive blocking issues
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
        source_platform: "WEB",
        ingestion_source: "CONVERSIONS_API",
        lookback_period: "14d",
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
