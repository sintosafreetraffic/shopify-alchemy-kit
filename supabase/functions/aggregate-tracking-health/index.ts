import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface DayStats {
  orders_seen: number;
  success_count: number;
  error_count: number;
  pending_count: number;
  unknown_status: number;
  context_rows: number;
  with_epik: number;
  with_ip: number;
  with_ua: number;
  consent_granted: number;
  reconciliation_mismatches: number;
  total_value_eur: number;
  success_rate: number;
  error_rate: number;
  epik_rate: number;
  ip_rate: number;
  ua_rate: number;
  consent_rate: number;
}

interface AlertInfo {
  type: string;
  severity: "warn" | "critical";
  message: string;
}

interface DayResult {
  day: string;
  stats: DayStats;
  alerts_created: number;
  alerts: AlertInfo[];
}

interface ResponseBody {
  success: boolean;
  dry_run: boolean;
  days_requested: number;
  days_processed: number;
  days: DayResult[];
  total_alerts_created: number;
  error: string | null;
}

// Division-safe rate calculation
function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Format rate as percentage string
function formatPct(rate: number): string {
  return (rate * 100).toFixed(1) + "%";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  
  // Parse and validate days param (v2.4: clamp to 14, treat invalid as 1)
  let daysParam = parseInt(url.searchParams.get("days") || "1", 10);
  if (isNaN(daysParam) || daysParam <= 0) {
    daysParam = 1;
  } else if (daysParam > 14) {
    daysParam = 14;
  }
  const daysRequested = daysParam;
  
  const dryRun = url.searchParams.get("dry_run") === "1";

  // v2.4 SECURITY MODEL: x-cron-secret header ONLY
  // Body-based auth markers (triggered_by: "pg_cron") are FORBIDDEN
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || cronSecret !== expectedSecret) {
    console.error("[aggregate-tracking-health] Invalid or missing x-cron-secret header");
    // v2.4: Auth failure → HTTP 401
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[aggregate-tracking-health] Auth passed via x-cron-secret`);

  // Create service-role client for DB writes
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const response: ResponseBody = {
    success: true,
    dry_run: dryRun,
    days_requested: daysRequested,
    days_processed: 0,
    days: [],
    total_alerts_created: 0,
    error: null,
  };

  try {
    // Calculate days to process (most recent N days, ending yesterday)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const daysToProcess: Date[] = [];
    for (let i = 1; i <= daysParam; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      daysToProcess.push(d);
    }
    // Reverse so we process oldest first (for drift to work correctly)
    daysToProcess.reverse();

    console.log(`[aggregate-tracking-health] Processing ${daysToProcess.length} day(s), dry_run=${dryRun}`);

    for (const day of daysToProcess) {
      const dayStr = day.toISOString().split("T")[0];
      const windowStart = day.toISOString();
      const windowEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const dayAlerts: AlertInfo[] = [];

      console.log(`[aggregate-tracking-health] Processing day=${dayStr}, window=${windowStart} to ${windowEnd}`);

      // ========== ORDER-SIDE METRICS ==========
      const { data: orderMetrics, error: orderError } = await supabase.rpc("get_order_metrics_for_day", {
        p_window_start: windowStart,
        p_window_end: windowEnd,
      });

      // Fallback to direct queries if RPC doesn't exist
      let orders_seen = 0, success_count = 0, error_count = 0, pending_count = 0, total_value_eur = 0;

      if (orderError) {
        console.log(`[aggregate-tracking-health] RPC fallback: querying pinterest_purchase_events directly`);
        
        // Total orders (EXCLUDE test orders - is_test = false only)
        const { count: totalOrders } = await supabase
          .from("pinterest_purchase_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", windowStart)
          .lt("created_at", windowEnd)
          .eq("is_test", false);
        orders_seen = totalOrders || 0;

        // Success count (exclude test orders)
        const { count: successOrders } = await supabase
          .from("pinterest_purchase_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", windowStart)
          .lt("created_at", windowEnd)
          .eq("is_test", false)
          .ilike("render_status", "%success%");
        success_count = successOrders || 0;

        // Error count (error OR fail, exclude test orders)
        const { data: errorData } = await supabase
          .from("pinterest_purchase_events")
          .select("id")
          .gte("created_at", windowStart)
          .lt("created_at", windowEnd)
          .eq("is_test", false)
          .or("render_status.ilike.%error%,render_status.ilike.%fail%");
        error_count = errorData?.length || 0;

        // Pending count (NULL or 'pending', exclude test orders)
        const { data: pendingData } = await supabase
          .from("pinterest_purchase_events")
          .select("id")
          .gte("created_at", windowStart)
          .lt("created_at", windowEnd)
          .eq("is_test", false)
          .or("render_status.is.null,render_status.eq.pending");
        pending_count = pendingData?.length || 0;

        // Total value (sum all currencies - stored as USD in column named total_value_eur for legacy reasons)
        const { data: valueData } = await supabase
          .from("pinterest_purchase_events")
          .select("value")
          .gte("created_at", windowStart)
          .lt("created_at", windowEnd)
          .eq("is_test", false);
        total_value_eur = valueData?.reduce((sum, row) => sum + (Number(row.value) || 0), 0) || 0;
      } else if (orderMetrics) {
        orders_seen = orderMetrics.orders_seen || 0;
        success_count = orderMetrics.success_count || 0;
        error_count = orderMetrics.error_count || 0;
        pending_count = orderMetrics.pending_count || 0;
        total_value_eur = orderMetrics.total_value_eur || 0;
      }

      const unknown_status = orders_seen - success_count - error_count - pending_count;

      // ========== CONTEXT-SIDE METRICS ==========
      const { count: contextRows } = await supabase
        .from("pinterest_context")
        .select("*", { count: "exact", head: true })
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd);
      const context_rows = contextRows || 0;

      // with_epik: not null AND not empty string
      const { data: epikData } = await supabase
        .from("pinterest_context")
        .select("id")
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd)
        .not("epik", "is", null)
        .neq("epik", "");
      const with_epik = epikData?.length || 0;

      const { count: ipCount } = await supabase
        .from("pinterest_context")
        .select("*", { count: "exact", head: true })
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd)
        .not("client_ip_address", "is", null);
      const with_ip = ipCount || 0;

      const { count: uaCount } = await supabase
        .from("pinterest_context")
        .select("*", { count: "exact", head: true })
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd)
        .not("client_user_agent", "is", null);
      const with_ua = uaCount || 0;

      const { count: consentCount } = await supabase
        .from("pinterest_context")
        .select("*", { count: "exact", head: true })
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd)
        .eq("consent_status", "granted");
      const consent_granted = consentCount || 0;

      // ========== RECONCILIATION MISMATCHES ==========
      const { count: mismatchCount } = await supabase
        .from("missing_purchase_events")
        .select("*", { count: "exact", head: true })
        .gte("detected_at", windowStart)
        .lt("detected_at", windowEnd)
        .eq("status", "detected");
      const reconciliation_mismatches = mismatchCount || 0;

      // ========== RATE CALCULATIONS ==========
      const success_rate = safeRate(success_count, orders_seen);
      const error_rate = safeRate(error_count, orders_seen);
      const epik_rate = safeRate(with_epik, context_rows);
      const ip_rate = safeRate(with_ip, context_rows);
      const ua_rate = safeRate(with_ua, context_rows);
      const consent_rate = safeRate(consent_granted, context_rows);

      const stats: DayStats = {
        orders_seen,
        success_count,
        error_count,
        pending_count,
        unknown_status,
        context_rows,
        with_epik,
        with_ip,
        with_ua,
        consent_granted,
        reconciliation_mismatches,
        total_value_eur,
        success_rate: Math.round(success_rate * 10000) / 10000,
        error_rate: Math.round(error_rate * 10000) / 10000,
        epik_rate: Math.round(epik_rate * 10000) / 10000,
        ip_rate: Math.round(ip_rate * 10000) / 10000,
        ua_rate: Math.round(ua_rate * 10000) / 10000,
        consent_rate: Math.round(consent_rate * 10000) / 10000,
      };

      console.log(`[aggregate-tracking-health] Day ${dayStr} stats:`, JSON.stringify(stats));

      // ========== UPSERT DAILY ROW ==========
      if (!dryRun) {
        const { error: upsertError } = await supabase
          .from("tracking_health_daily")
          .upsert({
            day: dayStr,
            window_start: windowStart,
            window_end: windowEnd,
            updated_at: new Date().toISOString(),
            ...stats,
          }, { onConflict: "day" });

        if (upsertError) {
          console.error(`[aggregate-tracking-health] Upsert error for ${dayStr}:`, upsertError);
        }
      }

      // ========== DRIFT DETECTION ==========
      let alertsCreated = 0;

      // Get yesterday's data for drift comparison
      const yesterdayDate = new Date(day.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

      const { data: yesterdayRow } = await supabase
        .from("tracking_health_daily")
        .select("*")
        .eq("day", yesterdayStr)
        .single();

      // Helper to send email notification for alert
      async function sendAlertEmail(
        type: string,
        severity: "warn" | "critical",
        message: string,
        context: Record<string, unknown>
      ) {
        try {
          const cronSecret = Deno.env.get("CRON_SECRET");
          const response = await fetch(`${supabaseUrl}/functions/v1/send-tracking-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": cronSecret || "",
            },
            body: JSON.stringify({
              severity,
              type,
              message,
              day: dayStr,
              context,
            }),
          });
          
          if (response.ok) {
            console.log(`[aggregate-tracking-health] Email notification sent for ${type}`);
          } else {
            console.warn(`[aggregate-tracking-health] Email notification failed: ${response.status}`);
          }
        } catch (emailError) {
          console.error(`[aggregate-tracking-health] Email notification error:`, emailError);
        }
      }

      // Helper to create alert (with dedupe and email notification)
      async function createAlert(
        type: string,
        severity: "warn" | "critical",
        message: string,
        context: Record<string, unknown>
      ) {
        const alertInfo: AlertInfo = { type, severity, message };
        dayAlerts.push(alertInfo);
        
        if (dryRun) {
          console.log(`[aggregate-tracking-health] DRY RUN: Would create ${severity} alert: ${type} - ${message}`);
          alertsCreated++;
          return;
        }

        // Check for existing alert with same day+type (dedupe)
        const { data: existing } = await supabase
          .from("tracking_alerts")
          .select("id")
          .eq("day", dayStr)
          .eq("type", type)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[aggregate-tracking-health] Alert already exists for ${dayStr}/${type}, skipping`);
          return;
        }

        const { error: alertError } = await supabase
          .from("tracking_alerts")
          .insert({
            day: dayStr,
            severity,
            type,
            message,
            context,
          });

        if (alertError) {
          console.error(`[aggregate-tracking-health] Alert insert error:`, alertError);
        } else {
          console.log(`[aggregate-tracking-health] Created ${severity} alert: ${type}`);
          alertsCreated++;
          
          // Send email notification for new alerts
          await sendAlertEmail(type, severity, message, context);
        }
      }

      // v2.4 DRIFT RULES: Only run success_rate_drop and error_spike if yesterday exists
      if (yesterdayRow) {
        const yesterdaySuccessRate = Number(yesterdayRow.success_rate) || 0;
        const successDrop = yesterdaySuccessRate - success_rate;

        // success_rate_drop (v2.4: critical ONLY if >= 0.10, warn ONLY if >= 0.05 AND < 0.10)
        if (successDrop >= 0.10) {
          await createAlert(
            "success_rate_drop",
            "critical",
            `Success rate dropped from ${formatPct(yesterdaySuccessRate)} to ${formatPct(success_rate)} (drop ${(successDrop * 100).toFixed(1)}pp)`,
            { today_rate: success_rate, yesterday_rate: yesterdaySuccessRate, drop: successDrop }
          );
        } else if (successDrop >= 0.05) {
          await createAlert(
            "success_rate_drop",
            "warn",
            `Success rate dropped from ${formatPct(yesterdaySuccessRate)} to ${formatPct(success_rate)} (drop ${(successDrop * 100).toFixed(1)}pp)`,
            { today_rate: success_rate, yesterday_rate: yesterdaySuccessRate, drop: successDrop }
          );
        }

        // error_spike (v2.4: critical ONLY if > 0.10, warn ONLY if > 0.05 AND <= 0.10)
        if (error_rate > 0.10) {
          await createAlert(
            "error_spike",
            "critical",
            `Error rate is ${formatPct(error_rate)}`,
            { today_rate: error_rate }
          );
        } else if (error_rate > 0.05) {
          await createAlert(
            "error_spike",
            "warn",
            `Error rate is ${formatPct(error_rate)}`,
            { today_rate: error_rate }
          );
        }
      } else {
        console.log(`[aggregate-tracking-health] No yesterday row for ${yesterdayStr}, skipping drift-based alerts (success_rate_drop, error_spike)`);
      }

      // ========== ABSOLUTE ALERTS (don't require yesterday) ==========
      
      // epik_collapse (v2.4: critical ONLY if < 0.10, warn ONLY if < 0.20 AND >= 0.10)
      if (context_rows > 0) {
        if (epik_rate < 0.10) {
          await createAlert(
            "epik_collapse",
            "critical",
            `EPIK rate is ${formatPct(epik_rate)}`,
            { today_rate: epik_rate }
          );
        } else if (epik_rate < 0.20) {
          await createAlert(
            "epik_collapse",
            "warn",
            `EPIK rate is ${formatPct(epik_rate)}`,
            { today_rate: epik_rate }
          );
        }
      }

      // context_capture_failure (v2.4: critical if ip < 0.10 OR ua < 0.10, warn if ip < 0.20 OR ua < 0.20)
      if (context_rows > 0) {
        const isCritical = ip_rate < 0.10 || ua_rate < 0.10;
        const isWarn = (ip_rate < 0.20 || ua_rate < 0.20) && !isCritical;
        
        if (isCritical) {
          await createAlert(
            "context_capture_failure",
            "critical",
            `Context capture low: ip_rate ${formatPct(ip_rate)} ua_rate ${formatPct(ua_rate)}`,
            { ip_rate, ua_rate }
          );
        } else if (isWarn) {
          await createAlert(
            "context_capture_failure",
            "warn",
            `Context capture low: ip_rate ${formatPct(ip_rate)} ua_rate ${formatPct(ua_rate)}`,
            { ip_rate, ua_rate }
          );
        }
      }

      // reconciliation_mismatch (v2.4: critical ONLY if >= 10, warn ONLY if >= 1 AND < 10)
      if (reconciliation_mismatches >= 10) {
        await createAlert(
          "reconciliation_mismatch",
          "critical",
          `Reconciliation mismatches detected: ${reconciliation_mismatches}`,
          { mismatches: reconciliation_mismatches }
        );
      } else if (reconciliation_mismatches >= 1) {
        await createAlert(
          "reconciliation_mismatch",
          "warn",
          `Reconciliation mismatches detected: ${reconciliation_mismatches}`,
          { mismatches: reconciliation_mismatches }
        );
      }

      response.days.push({
        day: dayStr,
        stats,
        alerts_created: alertsCreated,
        alerts: dayAlerts,
      });
      response.total_alerts_created += alertsCreated;
      response.days_processed++;
    }

    // ========== RECORD JOB EXECUTION ==========
    if (!dryRun) {
      const duration_ms = Date.now() - startTime;
      const { error: jobError } = await supabase
        .from("tracking_jobs")
        .insert({
          job_name: "aggregate-tracking-health",
          window_start: daysToProcess[0]?.toISOString() || null,
          window_end: daysToProcess[daysToProcess.length - 1] 
            ? new Date(daysToProcess[daysToProcess.length - 1].getTime() + 24 * 60 * 60 * 1000).toISOString()
            : null,
          success: true,
          duration_ms,
          stats: {
            days_requested: daysRequested,
            days_processed: response.days_processed,
            total_alerts_created: response.total_alerts_created,
            dry_run: false,
          },
        });

      if (jobError) {
        console.error(`[aggregate-tracking-health] Job record insert error:`, jobError);
      }
    }

    console.log(`[aggregate-tracking-health] Completed. Days: ${response.days_processed}, Alerts: ${response.total_alerts_created}`);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[aggregate-tracking-health] Fatal error:`, errorMessage);
    response.success = false;
    response.error = errorMessage;

    // Record failed job
    if (!dryRun) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        await supabase.from("tracking_jobs").insert({
          job_name: "aggregate-tracking-health",
          success: false,
          duration_ms: Date.now() - startTime,
          error: errorMessage,
          stats: {
            days_requested: daysRequested,
            days_processed: response.days_processed,
            dry_run: false,
          },
        });
      } catch (jobInsertErr) {
        console.error(`[aggregate-tracking-health] Failed to record failed job:`, jobInsertErr);
      }
    }
  }

  // v2.4: Internal errors after auth → HTTP 200 with success=false
  // Success → HTTP 200 with success=true
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
