/**
 * Weekly Ads Report Edge Function
 * 
 * Sends a weekly Capital Allocation Memo every Monday at 8:00 AM CET.
 * Fetches Pinterest ads data for multiple timeframes and generates AI insights.
 * 
 * Triggered by: pg_cron schedule
 * Auth: Validates CRON_SECRET internally
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const REPORT_EMAIL = "info.optiseek@gmail.com";

interface TimeframeData {
  label: string;
  days: number;
  data: any;
  insights: any;
}

interface InsightItem {
  level: string;
  decision?: string;
  type?: string;
  title: string;
  explanation: string;
  metrics?: string;
  metric_reference?: string;
  recommended_action?: string;
  recommendation?: string;
  confidence: string;
  risk_if_wrong: string;
  priority?: number;
  severity?: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

async function fetchPinterestData(
  supabaseUrl: string,
  supabaseKey: string,
  days: number
): Promise<any> {
  const { start, end } = getDateRange(days);
  
  const params = new URLSearchParams({
    start_date: start,
    end_date: end,
    granularity: "DAY",
    level: "ACCOUNT",
    click_window_days: "30",
    view_window_days: "1",
  });

  const response = await fetch(
    `${supabaseUrl}/functions/v1/pinterest-ads-reporting?${params}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`[weekly-ads-report] Pinterest fetch failed for ${days}d:`, response.status, text);
    return null;
  }

  return await response.json();
}

async function generateInsights(
  supabaseUrl: string,
  supabaseKey: string,
  data: any
): Promise<any> {
  if (!data || !data.totals) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/ads-decision-insights`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        totals: data.totals,
        timeseries: data.timeseries || [],
        entities: data.entities || [],
        range: {
          start: data.range?.start || "",
          end: data.range?.end || "",
          granularity: "DAY",
        },
        level: "ACCOUNT",
        attribution: {
          click_window: 30,
          view_window: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`[weekly-ads-report] Insights generation failed:`, response.status, text);
    return null;
  }

  return await response.json();
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "high":
      return "#059669";
    case "medium":
      return "#d97706";
    default:
      return "#6b7280";
  }
}

function getDecisionColor(decision: string): string {
  const d = decision?.toLowerCase() || "";
  if (d.includes("scale")) return "#059669";
  if (d.includes("pause") || d.includes("reduce")) return "#dc2626";
  if (d.includes("test")) return "#8b5cf6";
  if (d.includes("maintain")) return "#3b82f6";
  return "#6b7280";
}

function formatInsightHtml(insight: InsightItem, index: number): string {
  const decision = insight.decision || insight.type || "info";
  const action = insight.recommended_action || insight.recommendation || "";
  const metrics = insight.metrics || insight.metric_reference || "";
  const priority = insight.priority ? `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">P${insight.priority}</span>` : "";
  
  return `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-left: 4px solid ${getDecisionColor(decision)}; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          ${priority}
          <span style="background: ${getDecisionColor(decision)}20; color: ${getDecisionColor(decision)}; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-left: 4px;">${decision}</span>
          <span style="background: ${getConfidenceColor(insight.confidence)}20; color: ${getConfidenceColor(insight.confidence)}; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 4px;">${insight.confidence} confidence</span>
        </div>
        <span style="font-size: 12px; color: #9ca3af;">${insight.level?.toUpperCase() || "ACCOUNT"}</span>
      </div>
      <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">${insight.title}</h4>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${insight.explanation}</p>
      ${metrics ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;"><strong>Metrics:</strong> ${metrics}</p>` : ""}
      ${action ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: ${getDecisionColor(decision)}; font-weight: 600;">→ ${action}</p>` : ""}
      <p style="margin: 0; font-size: 12px; color: #9ca3af; font-style: italic;">⚠️ If wrong: ${insight.risk_if_wrong}</p>
    </div>
  `;
}

function formatTimeframeSection(
  label: string,
  description: string,
  insights: any,
  totals: any
): string {
  const insightsList = insights?.insights || [];
  const summary = insights?.summary || "";
  const healthScore = insights?.account_health_score;
  
  const metricsHtml = totals ? `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;">
      <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px; min-width: 100px;">
        <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Spend</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #111827;">€${totals.spend?.toLocaleString() || "0"}</p>
      </div>
      <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px; min-width: 100px;">
        <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Revenue</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #111827;">€${totals.revenue?.toLocaleString() || "0"}</p>
      </div>
      <div style="background: ${(totals.roas || 0) >= 2 ? "#d1fae5" : (totals.roas || 0) >= 1.54 ? "#fef3c7" : "#fee2e2"}; padding: 12px 16px; border-radius: 8px; min-width: 100px;">
        <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">ROAS</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: ${(totals.roas || 0) >= 2 ? "#059669" : (totals.roas || 0) >= 1.54 ? "#d97706" : "#dc2626"};">${totals.roas?.toFixed(2) || "0.00"}x</p>
      </div>
      <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px; min-width: 100px;">
        <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Purchases</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #111827;">${totals.checkouts || 0}</p>
      </div>
    </div>
  ` : "";

  const healthScoreHtml = healthScore ? `
    <div style="display: inline-block; background: ${healthScore >= 70 ? "#d1fae5" : healthScore >= 40 ? "#fef3c7" : "#fee2e2"}; padding: 8px 16px; border-radius: 20px; margin-bottom: 16px;">
      <span style="font-size: 14px; font-weight: 600; color: ${healthScore >= 70 ? "#059669" : healthScore >= 40 ? "#d97706" : "#dc2626"};">Account Health Score: ${healthScore}/100</span>
    </div>
  ` : "";

  const insightsHtml = insightsList.length > 0
    ? insightsList.map((insight: InsightItem, idx: number) => formatInsightHtml(insight, idx)).join("")
    : `<p style="color: #6b7280; font-style: italic;">No actionable insights for this timeframe.</p>`;

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">${label}</h2>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">${description}</p>
      ${healthScoreHtml}
      ${metricsHtml}
      ${summary ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;"><p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">${summary}</p></div>` : ""}
      ${insightsHtml}
    </div>
  `;
}

function buildEmailHtml(timeframes: TimeframeData[], weekLabel: string): string {
  const sections = [
    {
      tf: timeframes.find(t => t.days === 7),
      label: "📊 7-DAY WINDOW — Decision Layer",
      description: "Primary decision window. Scale, pause, or test based on these signals."
    },
    {
      tf: timeframes.find(t => t.days === 14),
      label: "📈 14-DAY STABILITY CHECK",
      description: "Trend confirmation. Flag if 7d diverges significantly from 14d."
    },
    {
      tf: timeframes.find(t => t.days === 30),
      label: "🔍 30-DAY STRATEGIC PATTERNS",
      description: "Structural observations only. No reactive decisions."
    },
    {
      tf: timeframes.find(t => t.days === 1),
      label: "⏰ 24-HOUR CONTEXT (FYI Only)",
      description: "Notable spikes or drops. Never decisive."
    },
  ];

  const sectionsHtml = sections
    .filter(s => s.tf)
    .map(s => formatTimeframeSection(
      s.label,
      s.description,
      s.tf!.insights,
      s.tf!.data?.totals
    ))
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Capital Allocation Memo</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; margin: 0; padding: 0; background-color: #f9fafb; color: #111827;">
        <div style="max-width: 700px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Weekly Capital Allocation Memo</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Rise By Night — ${weekLabel}</p>
          </div>
          
          <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Reminder:</strong> Break-even ROAS = 1.54x | Scaling target = ≥ 2.0x | Last 2 days excluded from conversion decisions.
              </p>
            </div>
            
            ${sectionsHtml}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <div style="text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0;">
                Generated by Rise By Night Decision Intelligence System
              </p>
              <a href="https://risebynight.com/risebynight/ads-reporting" style="color: #6366f1; font-size: 14px; text-decoration: none;">View Full Dashboard →</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Validate cron secret, debug secret, or admin user
    const cronSecret = req.headers.get("x-cron-secret");
    const debugSecret = req.headers.get("x-debug-secret");
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const expectedDebugSecret = Deno.env.get("DEBUG_SECRET");
    const isInternalCron = req.headers.get("X-Supabase-Internal") === "true" ||
                           (req.headers.get("User-Agent") || "").includes("pg_net");

    // Check for valid secrets
    const hasValidCronSecret = cronSecret && cronSecret === expectedSecret;
    const hasValidBearerToken = authHeader && authHeader.replace("Bearer ", "") === expectedSecret;
    const hasValidDebugSecret = debugSecret && expectedDebugSecret && debugSecret === expectedDebugSecret;
    
    // Check for admin user authentication
    let isAdminUser = false;
    if (authHeader && authHeader.startsWith("Bearer ") && supabaseUrl && supabaseKey) {
      const token = authHeader.replace("Bearer ", "");
      // Only check admin if it's not a cron secret
      if (token !== expectedSecret) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          
          if (user && !userError) {
            // Check if user has admin role
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "admin")
              .maybeSingle();
            
            isAdminUser = !!roleData;
            if (isAdminUser) {
              console.log(`[weekly-ads-report] Admin user ${user.email} triggered report`);
            }
          }
        } catch (authErr) {
          console.log("[weekly-ads-report] Auth check failed, trying other methods:", authErr);
        }
      }
    }
    
    if (!isInternalCron && !hasValidCronSecret && !hasValidBearerToken && !hasValidDebugSecret && !isAdminUser) {
      console.error("[weekly-ads-report] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const isTestRun = hasValidDebugSecret || isAdminUser;
    if (isTestRun) {
      console.log("[weekly-ads-report] Test run triggered");
    }

    console.log("[weekly-ads-report] Starting weekly report generation...");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Define timeframes to fetch
    const timeframeDays = [1, 7, 14, 30];
    const timeframes: TimeframeData[] = [];

    // Fetch data and generate insights for each timeframe
    for (const days of timeframeDays) {
      const label = days === 1 ? "24h" : `${days}d`;
      console.log(`[weekly-ads-report] Fetching ${label} data...`);
      
      const data = await fetchPinterestData(supabaseUrl, supabaseKey, days);
      
      let insights = null;
      if (data && data.totals) {
        console.log(`[weekly-ads-report] Generating ${label} insights...`);
        insights = await generateInsights(supabaseUrl, supabaseKey, data);
      }

      timeframes.push({
        label,
        days,
        data,
        insights,
      });
    }

    // Build week label
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekLabel = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    // Build and send email
    const htmlContent = buildEmailHtml(timeframes, weekLabel);

    console.log("[weekly-ads-report] Sending email...");
    
    const emailResponse = await resend.emails.send({
      from: "Rise By Night <alerts@send.risebynight.com>",
      to: [REPORT_EMAIL],
      subject: `📊 Weekly Capital Allocation Memo — ${weekLabel}`,
      html: htmlContent,
    });

    console.log("[weekly-ads-report] Email sent successfully:", emailResponse);

    // Save report to database for historical reference
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const reportData = {
      week_label: weekLabel,
      timeframes: timeframes.map(tf => ({
        label: tf.label,
        days: tf.days,
        totals: tf.data?.totals || null,
        insights_count: tf.insights?.insights?.length || 0,
        summary: tf.insights?.summary || null,
        account_health_score: tf.insights?.account_health_score || null,
      })),
      sent_to: REPORT_EMAIL,
      sent_at: new Date().toISOString(),
    };

    // Store in app_settings as a simple key-value (no new table needed)
    await supabase
      .from("app_settings")
      .upsert({
        key: `weekly_ads_report_${now.toISOString().split("T")[0]}`,
        value: reportData,
        updated_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResponse.data?.id,
        timeframes_processed: timeframes.length,
        week_label: weekLabel,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[weekly-ads-report] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
