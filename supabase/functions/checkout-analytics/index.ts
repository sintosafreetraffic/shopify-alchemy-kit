import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackEventRequest {
  action: "track";
  event_type: "checkout_initiated" | "checkout_success" | "checkout_timeout" | "checkout_retry" | "checkout_error" | "checkout_popup_blocked";
  session_id: string;
  duration_ms?: number;
  retry_count?: number;
  error_message?: string;
  cart_item_count?: number;
  cart_total?: number;
  device_type?: string;
  user_agent?: string;
}

interface GetStatsRequest {
  action: "get_stats";
  days?: number;
}

type RequestBody = TrackEventRequest | GetStatsRequest;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();

    // Track event action
    if (body.action === "track") {
      const { 
        event_type, 
        session_id, 
        duration_ms, 
        retry_count, 
        error_message,
        cart_item_count,
        cart_total,
        device_type,
        user_agent 
      } = body as TrackEventRequest;

      console.log(`[checkout-analytics] Tracking: ${event_type} session=${session_id} duration=${duration_ms}ms retries=${retry_count}`);

      const { error } = await supabase.from("checkout_analytics").insert({
        session_id,
        event_type,
        duration_ms,
        retry_count,
        error_message,
        cart_item_count,
        cart_total,
        device_type,
        user_agent,
      });

      if (error) {
        console.error("[checkout-analytics] Insert error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get stats action
    if (body.action === "get_stats") {
      const { days = 30 } = body as GetStatsRequest;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: events, error } = await supabase
        .from("checkout_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[checkout-analytics] Query error:", error);
        throw error;
      }

      // Calculate stats
      const initiated = events?.filter(e => e.event_type === "checkout_initiated") || [];
      const successes = events?.filter(e => e.event_type === "checkout_success") || [];
      const timeouts = events?.filter(e => e.event_type === "checkout_timeout") || [];
      const retries = events?.filter(e => e.event_type === "checkout_retry") || [];
      const errors = events?.filter(e => e.event_type === "checkout_error") || [];
      const popupBlocked = events?.filter(e => e.event_type === "checkout_popup_blocked") || [];

      // Calculate average duration for successful checkouts
      const successDurations = successes.filter(e => e.duration_ms).map(e => e.duration_ms);
      const avgSuccessDuration = successDurations.length > 0 
        ? Math.round(successDurations.reduce((a, b) => a + b, 0) / successDurations.length)
        : 0;

      // Calculate timeout durations
      const timeoutDurations = timeouts.filter(e => e.duration_ms).map(e => e.duration_ms);
      const avgTimeoutDuration = timeoutDurations.length > 0
        ? Math.round(timeoutDurations.reduce((a, b) => a + b, 0) / timeoutDurations.length)
        : 0;

      // Device breakdown
      const deviceStats: Record<string, { initiated: number; success: number; timeout: number; error: number }> = {};
      events?.forEach(e => {
        const device = e.device_type || "unknown";
        if (!deviceStats[device]) {
          deviceStats[device] = { initiated: 0, success: 0, timeout: 0, error: 0 };
        }
        if (e.event_type === "checkout_initiated") deviceStats[device].initiated++;
        if (e.event_type === "checkout_success") deviceStats[device].success++;
        if (e.event_type === "checkout_timeout") deviceStats[device].timeout++;
        if (e.event_type === "checkout_error") deviceStats[device].error++;
      });

      // Daily breakdown
      const dailyStats: Record<string, { date: string; initiated: number; success: number; timeout: number; retry: number; error: number }> = {};
      events?.forEach(e => {
        const date = e.created_at.split("T")[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { date, initiated: 0, success: 0, timeout: 0, retry: 0, error: 0 };
        }
        if (e.event_type === "checkout_initiated") dailyStats[date].initiated++;
        if (e.event_type === "checkout_success") dailyStats[date].success++;
        if (e.event_type === "checkout_timeout") dailyStats[date].timeout++;
        if (e.event_type === "checkout_retry") dailyStats[date].retry++;
        if (e.event_type === "checkout_error") dailyStats[date].error++;
      });

      // Sessions analysis
      const sessionIds = new Set(initiated.map(e => e.session_id));
      const successSessionIds = new Set(successes.map(e => e.session_id));
      const convertedSessions = [...sessionIds].filter(s => successSessionIds.has(s));

      const stats = {
        summary: {
          total_initiated: initiated.length,
          total_success: successes.length,
          total_timeout: timeouts.length,
          total_retry: retries.length,
          total_error: errors.length,
          total_popup_blocked: popupBlocked.length,
          success_rate: initiated.length > 0 
            ? Math.round((successes.length / initiated.length) * 100)
            : 0,
          timeout_rate: initiated.length > 0
            ? Math.round((timeouts.length / initiated.length) * 100)
            : 0,
          retry_rate: initiated.length > 0
            ? Math.round((retries.length / initiated.length) * 100)
            : 0,
          avg_success_duration_ms: avgSuccessDuration,
          avg_timeout_duration_ms: avgTimeoutDuration,
          unique_sessions: sessionIds.size,
          converted_sessions: convertedSessions.length,
        },
        device_breakdown: deviceStats,
        daily_breakdown: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
        recent_events: events?.slice(0, 50) || [],
      };

      console.log(`[checkout-analytics] Stats: ${stats.summary.total_initiated} initiated, ${stats.summary.total_success} success, ${stats.summary.success_rate}% rate`);

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[checkout-analytics] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
