import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Thresholds for alerts
const THRESHOLDS = {
  SUCCESS_RATE_MIN: 90, // Alert if below 90%
  DEAD_LETTERS_MAX: 5,  // Alert if more than 5 dead letters in a day
  ERROR_RATE_MAX: 15,   // Alert if error rate exceeds 15%
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error("[check-tracking-thresholds] Invalid or missing x-cron-secret");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in UTC
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[check-tracking-thresholds] Checking thresholds for ${yesterdayStr}`);

    const alerts: Array<{
      severity: "info" | "warn" | "critical";
      type: string;
      message: string;
      context: Record<string, unknown>;
    }> = [];

    // Check tracking_health_daily for yesterday's metrics
    const { data: healthData, error: healthError } = await supabase
      .from("tracking_health_daily")
      .select("*")
      .eq("day", yesterdayStr)
      .single();

    if (healthError && healthError.code !== "PGRST116") {
      console.error("[check-tracking-thresholds] Error fetching health data:", healthError);
    }

    if (healthData) {
      const successRate = Number(healthData.success_rate) || 0;
      const errorRate = Number(healthData.error_rate) || 0;

      // Check success rate threshold
      if (successRate < THRESHOLDS.SUCCESS_RATE_MIN && healthData.orders_seen > 0) {
        const severity = successRate < 80 ? "critical" : "warn";
        alerts.push({
          severity,
          type: "low_success_rate",
          message: `Success rate dropped to ${successRate.toFixed(1)}% (threshold: ${THRESHOLDS.SUCCESS_RATE_MIN}%). ${healthData.orders_seen} orders processed with ${healthData.error_count} errors.`,
          context: {
            success_rate: successRate,
            error_rate: errorRate,
            orders_seen: healthData.orders_seen,
            error_count: healthData.error_count,
            threshold: THRESHOLDS.SUCCESS_RATE_MIN,
          },
        });
      }

      // Check error rate threshold
      if (errorRate > THRESHOLDS.ERROR_RATE_MAX && healthData.orders_seen > 0) {
        alerts.push({
          severity: errorRate > 25 ? "critical" : "warn",
          type: "high_error_rate",
          message: `Error rate spiked to ${errorRate.toFixed(1)}% (threshold: ${THRESHOLDS.ERROR_RATE_MAX}%). ${healthData.error_count} errors out of ${healthData.orders_seen} orders.`,
          context: {
            error_rate: errorRate,
            error_count: healthData.error_count,
            orders_seen: healthData.orders_seen,
            threshold: THRESHOLDS.ERROR_RATE_MAX,
          },
        });
      }
    }

    // Check dead letters count for yesterday
    const startOfYesterday = `${yesterdayStr}T00:00:00Z`;
    const endOfYesterday = `${todayStr}T00:00:00Z`;

    const { count: deadLettersCount, error: deadLettersError } = await supabase
      .from("recovery_dead_letters")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", endOfYesterday);

    if (deadLettersError) {
      console.error("[check-tracking-thresholds] Error fetching dead letters:", deadLettersError);
    }

    const deadLetters = deadLettersCount || 0;
    if (deadLetters > THRESHOLDS.DEAD_LETTERS_MAX) {
      alerts.push({
        severity: deadLetters > 10 ? "critical" : "warn",
        type: "dead_letters_spike",
        message: `Dead letters spiked to ${deadLetters} (threshold: ${THRESHOLDS.DEAD_LETTERS_MAX}). These orders failed all recovery attempts.`,
        context: {
          dead_letters_count: deadLetters,
          threshold: THRESHOLDS.DEAD_LETTERS_MAX,
        },
      });
    }

    console.log(`[check-tracking-thresholds] Found ${alerts.length} threshold breaches`);

    // Send alerts if any thresholds were breached
    const sentAlerts: string[] = [];
    for (const alert of alerts) {
      try {
        // Call send-tracking-alert edge function
        const alertResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-tracking-alert`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": expectedSecret,
            },
            body: JSON.stringify({
              severity: alert.severity,
              type: alert.type,
              message: alert.message,
              day: yesterdayStr,
              context: alert.context,
            }),
          }
        );

        if (alertResponse.ok) {
          sentAlerts.push(alert.type);
          console.log(`[check-tracking-thresholds] Sent ${alert.type} alert`);

          // Also insert into tracking_alerts table for history
          await supabase.from("tracking_alerts").insert({
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            day: yesterdayStr,
            context: alert.context,
          });
        } else {
          console.error(`[check-tracking-thresholds] Failed to send ${alert.type} alert:`, await alertResponse.text());
        }
      } catch (err) {
        console.error(`[check-tracking-thresholds] Error sending ${alert.type} alert:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date_checked: yesterdayStr,
        thresholds: THRESHOLDS,
        breaches_found: alerts.length,
        alerts_sent: sentAlerts,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[check-tracking-thresholds] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
