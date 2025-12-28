import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackEventRequest {
  action: "track";
  event_type: "pre_reveal_viewed" | "full_reveal_unlocked" | "email_popup_viewed" | "email_popup_submitted";
  session_id: string;
  persona_cluster?: string;
  insight_count?: number;
  email?: string;
  user_agent?: string;
  referrer?: string;
}

interface GetStatsRequest {
  action: "get_stats";
  days?: number;
}

type RequestBody = TrackEventRequest | GetStatsRequest;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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
      const { event_type, session_id, persona_cluster, insight_count, email, user_agent, referrer } = body as TrackEventRequest;

      console.log(`[quiz-reveal-analytics] Tracking event: ${event_type} for session: ${session_id}`);

      const { error } = await supabase.from("quiz_reveal_analytics").insert({
        session_id,
        event_type,
        persona_cluster,
        insight_count,
        email,
        user_agent,
        referrer,
      });

      if (error) {
        console.error("[quiz-reveal-analytics] Insert error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get stats action (admin only)
    if (body.action === "get_stats") {
      const { days = 30 } = body as GetStatsRequest;
      
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all events in date range
      const { data: events, error } = await supabase
        .from("quiz_reveal_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[quiz-reveal-analytics] Query error:", error);
        throw error;
      }

      // Calculate stats
      const preRevealViews = events?.filter(e => e.event_type === "pre_reveal_viewed") || [];
      const fullRevealUnlocks = events?.filter(e => e.event_type === "full_reveal_unlocked") || [];

      // Track unique sessions
      const preRevealSessions = new Set(preRevealViews.map(e => e.session_id));
      const fullRevealSessions = new Set(fullRevealUnlocks.map(e => e.session_id));
      
      // Sessions that converted (had pre-reveal then full reveal)
      const convertedSessions = [...preRevealSessions].filter(s => fullRevealSessions.has(s));

      // Persona breakdown
      const personaStats: Record<string, { pre: number; full: number }> = {};
      preRevealViews.forEach(e => {
        const persona = e.persona_cluster || "unknown";
        if (!personaStats[persona]) personaStats[persona] = { pre: 0, full: 0 };
        personaStats[persona].pre++;
      });
      fullRevealUnlocks.forEach(e => {
        const persona = e.persona_cluster || "unknown";
        if (!personaStats[persona]) personaStats[persona] = { pre: 0, full: 0 };
        personaStats[persona].full++;
      });

      // Daily breakdown for chart
      const dailyStats: Record<string, { date: string; pre: number; full: number }> = {};
      events?.forEach(e => {
        const date = e.created_at.split("T")[0];
        if (!dailyStats[date]) dailyStats[date] = { date, pre: 0, full: 0 };
        if (e.event_type === "pre_reveal_viewed") dailyStats[date].pre++;
        if (e.event_type === "full_reveal_unlocked") dailyStats[date].full++;
      });

      const stats = {
        summary: {
          total_pre_reveal_views: preRevealViews.length,
          total_full_reveal_unlocks: fullRevealUnlocks.length,
          unique_pre_reveal_sessions: preRevealSessions.size,
          unique_full_reveal_sessions: fullRevealSessions.size,
          converted_sessions: convertedSessions.length,
          conversion_rate: preRevealSessions.size > 0 
            ? Math.round((convertedSessions.length / preRevealSessions.size) * 100) 
            : 0,
        },
        persona_breakdown: personaStats,
        daily_breakdown: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
        recent_events: events?.slice(0, 50) || [],
      };

      console.log(`[quiz-reveal-analytics] Stats retrieved: ${stats.summary.total_pre_reveal_views} pre-reveal, ${stats.summary.total_full_reveal_unlocks} full reveal`);

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
    console.error("[quiz-reveal-analytics] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
