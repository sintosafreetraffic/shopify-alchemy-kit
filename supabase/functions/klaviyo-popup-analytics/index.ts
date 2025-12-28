import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyticsRequest {
  action: "get_stats";
  days?: number; // 7 or 30, defaults to 7
  include_debug?: boolean; // Only for admins
}

interface PopupStats {
  views_unique_sessions: number;
  submits_unique_sessions: number;
  dismissed_unique_sessions: number;
  submission_rate: number;
  dismissal_rate: number;
  period_days: number;
  trend: {
    views_delta: number;
    submits_delta: number;
    rate_delta: number;
  };
  top_pages: Array<{ page_path: string; views: number; submits: number }>;
  debug_events?: Array<{
    id: string;
    created_at: string;
    event_type: string;
    page_path: string;
    session_id_hash: string;
  }>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as AnalyticsRequest;
    
    if (body.action !== "get_stats") {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const days = body.days === 30 ? 30 : 7;
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requester is admin (for debug data)
    let isAdmin = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anonClient = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const { data: { user } } = await anonClient.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        if (user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();
          isAdmin = !!roleData;
        }
      } catch {
        // Ignore auth errors
      }
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

    // Get current period stats
    const { data: currentEvents, error: currentError } = await supabase
      .from("klaviyo_form_events")
      .select("session_id, event_type, page_path")
      .gte("created_at", periodStart.toISOString());

    if (currentError) {
      console.error("[klaviyo-popup-analytics] Error fetching current events:", currentError);
      throw currentError;
    }

    // Get previous period stats for trend
    const { data: previousEvents, error: prevError } = await supabase
      .from("klaviyo_form_events")
      .select("session_id, event_type")
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", periodStart.toISOString());

    if (prevError) {
      console.error("[klaviyo-popup-analytics] Error fetching previous events:", prevError);
      // Don't fail, just use empty data for trend
    }

    // Calculate current period metrics (unique sessions per event type)
    const currentViews = new Set(
      (currentEvents || []).filter(e => e.event_type === "viewed").map(e => e.session_id)
    );
    const currentSubmits = new Set(
      (currentEvents || []).filter(e => e.event_type === "submitted").map(e => e.session_id)
    );
    const currentDismissed = new Set(
      (currentEvents || []).filter(e => e.event_type === "dismissed").map(e => e.session_id)
    );

    // Calculate previous period metrics
    const prevViews = new Set(
      (previousEvents || []).filter(e => e.event_type === "viewed").map(e => e.session_id)
    );
    const prevSubmits = new Set(
      (previousEvents || []).filter(e => e.event_type === "submitted").map(e => e.session_id)
    );

    // Calculate rates
    const currentRate = currentViews.size > 0 
      ? (currentSubmits.size / currentViews.size) * 100 
      : 0;
    const prevRate = prevViews.size > 0 
      ? (prevSubmits.size / prevViews.size) * 100 
      : 0;
    const dismissalRate = currentViews.size > 0
      ? (currentDismissed.size / currentViews.size) * 100
      : 0;

    // Calculate top pages
    const pageStats: Record<string, { views: Set<string>; submits: Set<string> }> = {};
    for (const event of currentEvents || []) {
      if (!pageStats[event.page_path]) {
        pageStats[event.page_path] = { views: new Set(), submits: new Set() };
      }
      if (event.event_type === "viewed") {
        pageStats[event.page_path].views.add(event.session_id);
      } else if (event.event_type === "submitted") {
        pageStats[event.page_path].submits.add(event.session_id);
      }
    }

    const topPages = Object.entries(pageStats)
      .map(([page_path, stats]) => ({
        page_path,
        views: stats.views.size,
        submits: stats.submits.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const stats: PopupStats = {
      views_unique_sessions: currentViews.size,
      submits_unique_sessions: currentSubmits.size,
      dismissed_unique_sessions: currentDismissed.size,
      submission_rate: Math.round(currentRate * 10) / 10,
      dismissal_rate: Math.round(dismissalRate * 10) / 10,
      period_days: days,
      trend: {
        views_delta: currentViews.size - prevViews.size,
        submits_delta: currentSubmits.size - prevSubmits.size,
        rate_delta: Math.round((currentRate - prevRate) * 10) / 10,
      },
      top_pages: topPages,
    };

    // Add debug events for admins if requested
    if (isAdmin && body.include_debug) {
      const { data: recentEvents } = await supabase
        .from("klaviyo_form_events")
        .select("id, created_at, event_type, page_path, session_id")
        .order("created_at", { ascending: false })
        .limit(10);

      stats.debug_events = (recentEvents || []).map(e => ({
        id: e.id,
        created_at: e.created_at,
        event_type: e.event_type,
        page_path: e.page_path,
        session_id_hash: e.session_id.substring(0, 8) + "...",
      }));
    }

    console.log("[klaviyo-popup-analytics] Stats computed", {
      period_days: days,
      views: stats.views_unique_sessions,
      submits: stats.submits_unique_sessions,
      rate: stats.submission_rate,
    });

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[klaviyo-popup-analytics] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
