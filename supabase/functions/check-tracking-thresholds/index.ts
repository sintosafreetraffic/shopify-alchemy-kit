import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronSecret } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Default thresholds (used if not configured in app_settings)
const DEFAULT_THRESHOLDS = {
  SUCCESS_RATE_MIN: 90,
  DEAD_LETTERS_MAX: 5,
  ERROR_RATE_MAX: 15,
};

// Severity ranking for escalation (never downgrade)
const SEVERITY_RANK: Record<string, number> = {
  info: 1,
  warn: 2,
  critical: 3,
};

function maxSeverity(a: string, b: string): "info" | "warn" | "critical" {
  const rankA = SEVERITY_RANK[a] || 1;
  const rankB = SEVERITY_RANK[b] || 1;
  if (rankA >= rankB) return a as "info" | "warn" | "critical";
  return b as "info" | "warn" | "critical";
}

// Fetch thresholds from app_settings, fallback to defaults
// deno-lint-ignore no-explicit-any
async function getThresholds(supabase: any) {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "tracking_thresholds")
      .single();

    if (error || !data) {
      console.log("[check-tracking-thresholds] Using default thresholds");
      return DEFAULT_THRESHOLDS;
    }

    const configuredThresholds = data.value as Record<string, number>;
    return {
      SUCCESS_RATE_MIN: configuredThresholds.success_rate_min ?? DEFAULT_THRESHOLDS.SUCCESS_RATE_MIN,
      DEAD_LETTERS_MAX: configuredThresholds.dead_letters_max ?? DEFAULT_THRESHOLDS.DEAD_LETTERS_MAX,
      ERROR_RATE_MAX: configuredThresholds.error_rate_max ?? DEFAULT_THRESHOLDS.ERROR_RATE_MAX,
    };
  } catch (err) {
    console.error("[check-tracking-thresholds] Error fetching thresholds:", err);
    return DEFAULT_THRESHOLDS;
  }
}

// Upsert alert: insert if not exists, update if exists (idempotent)
// deno-lint-ignore no-explicit-any
async function upsertAlert(
  supabase: any,
  alert: {
    type: string;
    severity: "info" | "warn" | "critical";
    message: string;
    day: string;
    context: Record<string, unknown>;
  }
): Promise<"insert" | "update" | "error"> {
  try {
    // Check if alert already exists for this (day, type)
    const { data: existing, error: selectError } = await supabase
      .from("tracking_alerts")
      .select("id, severity, status")
      .eq("day", alert.day)
      .eq("type", alert.type)
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error(`[check-tracking-thresholds] Error checking existing alert:`, selectError);
      return "error";
    }

    if (existing) {
      // UPDATE existing - escalate severity but preserve status/acknowledged_at
      const newSeverity = maxSeverity(existing.severity, alert.severity);
      
      const { error: updateError } = await supabase
        .from("tracking_alerts")
        .update({
          message: alert.message,
          context: alert.context,
          severity: newSeverity,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error(`[check-tracking-thresholds] Error updating alert:`, updateError);
        return "error";
      }

      console.log(`[check-tracking-thresholds] upsert day=${alert.day} type=${alert.type} action=update severity=${newSeverity}`);
      return "update";
    } else {
      // INSERT new alert
      const { error: insertError } = await supabase
        .from("tracking_alerts")
        .insert({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          day: alert.day,
          context: alert.context,
        });

      if (insertError) {
        console.error(`[check-tracking-thresholds] Error inserting alert:`, insertError);
        return "error";
      }

      console.log(`[check-tracking-thresholds] upsert day=${alert.day} type=${alert.type} action=insert severity=${alert.severity}`);
      return "insert";
    }
  } catch (err) {
    console.error(`[check-tracking-thresholds] Upsert error:`, err);
    return "error";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Centralized cron auth
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load configurable thresholds
    const THRESHOLDS = await getThresholds(supabase);

    // Get yesterday's date in UTC
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Structured logging: start of run
    console.log(`[check-tracking-thresholds] day=${yesterdayStr} thresholds_loaded=true thresholds=${JSON.stringify(THRESHOLDS)}`);

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
      .maybeSingle();

    if (healthError) {
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
            day: yesterdayStr,
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
            day: yesterdayStr,
          },
        });
      }
    }

    // Check dead letters count for yesterday (runs even if healthData missing)
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
    console.log(`[check-tracking-thresholds] day=${yesterdayStr} deadLetters=${deadLetters}`);

    if (deadLetters > THRESHOLDS.DEAD_LETTERS_MAX) {
      // Severity: critical if >= 2x threshold
      const severity = deadLetters >= THRESHOLDS.DEAD_LETTERS_MAX * 2 ? "critical" : "warn";
      alerts.push({
        severity,
        type: "dead_letters_spike",
        message: `Dead letters spiked to ${deadLetters} (threshold: ${THRESHOLDS.DEAD_LETTERS_MAX}). These orders failed all recovery attempts.`,
        context: {
          dead_letters_count: deadLetters,
          threshold: THRESHOLDS.DEAD_LETTERS_MAX,
          day: yesterdayStr,
        },
      });
    }

    // Structured logging: after evaluation
    console.log(`[check-tracking-thresholds] day=${yesterdayStr} alerts_generated=${alerts.length}`);

    // Upsert alerts (idempotent) and optionally send notifications
    const upsertResults: string[] = [];
    const expectedSecret = Deno.env.get("CRON_SECRET");

    for (const alert of alerts) {
      // Upsert to tracking_alerts table (idempotent)
      const action = await upsertAlert(supabase, {
        ...alert,
        day: yesterdayStr,
      });
      upsertResults.push(`${alert.type}:${action}`);

      // Only send notification on INSERT (not on update to avoid spam)
      if (action === "insert") {
        try {
          const alertResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-tracking-alert`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cron-secret": expectedSecret || "",
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

          if (!alertResponse.ok) {
            console.error(`[check-tracking-thresholds] Failed to send ${alert.type} notification:`, await alertResponse.text());
          }
        } catch (err) {
          console.error(`[check-tracking-thresholds] Error sending ${alert.type} notification:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date_checked: yesterdayStr,
        thresholds: THRESHOLDS,
        alerts_generated: alerts.length,
        upsert_results: upsertResults,
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
