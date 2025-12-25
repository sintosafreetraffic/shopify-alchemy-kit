import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChaosTestResult {
  test: string;
  success: boolean;
  dry_run: boolean;
  response: unknown;
  duration_ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret) {
      return new Response(
        JSON.stringify({ error: "CRON_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const url = new URL(req.url);
    const testType = url.searchParams.get("test");
    const dryRun = url.searchParams.get("dry_run") !== "0"; // Default to dry_run=true for safety

    if (!testType || !["c4", "c5", "c7"].includes(testType)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid test type. Supported: c4, c5, c7",
          available_tests: {
            c4: "Retry Exhaustion (always_fail)",
            c5: "Rate Limit Simulation",
            c7: "Timestamp Skew",
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ChaosRunner] Admin running test ${testType}, dry_run=${dryRun}`);

    let targetUrl: string;
    let headers: Record<string, string>;

    switch (testType) {
      case "c4":
        // C4: Retry Exhaustion - recover-missing-purchases?chaos=always_fail
        targetUrl = `${supabaseUrl}/functions/v1/recover-missing-purchases?dry_run=${dryRun ? "1" : "0"}&chaos=always_fail`;
        headers = { "x-cron-secret": cronSecret };
        break;

      case "c5":
        // C5: Rate Limit - recover-missing-purchases?chaos=rate_limit
        targetUrl = `${supabaseUrl}/functions/v1/recover-missing-purchases?dry_run=${dryRun ? "1" : "0"}&chaos=rate_limit`;
        headers = { "x-cron-secret": cronSecret };
        break;

      case "c7":
        // C7: Timestamp Skew - reconcile-shopify-orders (some deployments expect CRON_SECRET header name)
        targetUrl = `${supabaseUrl}/functions/v1/reconcile-shopify-orders?dry_run=${dryRun ? "1" : "0"}&chaos=timestamp_skew`;
        headers = {
          "x-cron-secret": cronSecret,
          "CRON_SECRET": cronSecret,
          "x-chaos-mode": "timestamp_skew",
        };
        break;

      default:
        throw new Error("Unknown test type");
    }

    console.log(`[ChaosRunner] Calling ${targetUrl}`);

    const testStart = Date.now();
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    const testDuration = Date.now() - testStart;
    let responseData: unknown;
    
    try {
      responseData = await response.json();
    } catch {
      responseData = { raw: await response.text() };
    }

    const result: ChaosTestResult = {
      test: testType.toUpperCase(),
      success: response.ok,
      dry_run: dryRun,
      response: responseData,
      duration_ms: testDuration,
    };

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }

    console.log(`[ChaosRunner] Test ${testType} completed:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[ChaosRunner] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
