/**
 * Email Popup Analytics Edge Function
 * 
 * Fetches email popup view/submit stats from quiz_reveal_analytics table
 * for displaying submission rate on the tracking dashboard.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetStatsRequest {
  action: "get_stats";
  days?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GetStatsRequest = await req.json();

    if (body.action !== "get_stats") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { days = 30 } = body;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`[email-popup-analytics] Fetching stats for last ${days} days`);

    // Fetch popup events from quiz_reveal_analytics
    const { data: events, error } = await supabase
      .from("quiz_reveal_analytics")
      .select("*")
      .in("event_type", ["email_popup_viewed", "email_popup_submitted"])
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[email-popup-analytics] Query error:", error);
      throw error;
    }

    // Calculate stats
    const views = events?.filter(e => e.event_type === "email_popup_viewed") || [];
    const submissions = events?.filter(e => e.event_type === "email_popup_submitted") || [];

    // Unique sessions
    const viewSessions = new Set(views.map(e => e.session_id));
    const submitSessions = new Set(submissions.map(e => e.session_id));
    
    // Converted sessions (viewed AND submitted)
    const convertedSessions = [...viewSessions].filter(s => submitSessions.has(s));

    // Daily breakdown
    const dailyStats: Record<string, { date: string; views: number; submissions: number }> = {};
    events?.forEach(e => {
      const date = e.created_at.split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, views: 0, submissions: 0 };
      }
      if (e.event_type === "email_popup_viewed") dailyStats[date].views++;
      if (e.event_type === "email_popup_submitted") dailyStats[date].submissions++;
    });

    const submissionRate = viewSessions.size > 0 
      ? Math.round((convertedSessions.length / viewSessions.size) * 100)
      : 0;

    const stats = {
      summary: {
        total_views: views.length,
        total_submissions: submissions.length,
        unique_view_sessions: viewSessions.size,
        unique_submit_sessions: submitSessions.size,
        converted_sessions: convertedSessions.length,
        submission_rate: submissionRate,
      },
      daily_breakdown: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      recent_events: events?.slice(0, 50) || [],
    };

    console.log(`[email-popup-analytics] Stats: ${stats.summary.total_views} views, ${stats.summary.total_submissions} submissions, ${stats.summary.submission_rate}% rate`);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[email-popup-analytics] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
