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
  adLevelInsights?: any; // Ad-level insights for granular analysis
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
  days: number,
  level: string = "ACCOUNT"
): Promise<any> {
  const { start, end } = getDateRange(days);
  
  const params = new URLSearchParams({
    start_date: start,
    end_date: end,
    granularity: "DAY",
    level: level,
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
    console.error(`[weekly-ads-report] Pinterest fetch failed for ${days}d ${level}:`, response.status, text);
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
  totals: any,
  adLevelInsights?: any
): string {
  const insightsList = insights?.insights || [];
  const summary = insights?.summary || "";
  const healthScore = insights?.account_health_score;
  
  // Extract ad-level insights
  const adInsightsList = adLevelInsights?.insights || [];
  const adOnlyInsights = adInsightsList.filter((i: InsightItem) => i.level === "ad");
  
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

  // Separate campaign/account level insights from ad-level
  const campaignInsights = insightsList.filter((i: InsightItem) => i.level !== "ad");
  
  const campaignInsightsHtml = campaignInsights.length > 0
    ? campaignInsights.map((insight: InsightItem, idx: number) => formatInsightHtml(insight, idx)).join("")
    : `<p style="color: #6b7280; font-style: italic;">No campaign-level insights for this timeframe.</p>`;

  // Ad-level insights section
  const adInsightsHtml = adOnlyInsights.length > 0 ? `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 2px dashed #e5e7eb;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #4b5563;">
        🎨 Ad-Level Insights <span style="background: #ede9fe; color: #7c3aed; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;">${adOnlyInsights.length} ads</span>
      </h3>
      ${adOnlyInsights.slice(0, 5).map((insight: InsightItem, idx: number) => formatInsightHtml(insight, idx)).join("")}
      ${adOnlyInsights.length > 5 ? `<p style="color: #6b7280; font-size: 13px; font-style: italic; margin-top: 12px;">+ ${adOnlyInsights.length - 5} more ad-level insights available in the dashboard</p>` : ""}
    </div>
  ` : "";

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">${label}</h2>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">${description}</p>
      ${healthScoreHtml}
      ${metricsHtml}
      ${summary ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;"><p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">${summary}</p></div>` : ""}
      ${campaignInsightsHtml}
      ${adInsightsHtml}
    </div>
  `;
}

// Build executive summary comparing all timeframes
function buildExecutiveSummary(timeframes: TimeframeData[]): string {
  const tf7 = timeframes.find(t => t.days === 7);
  const tf14 = timeframes.find(t => t.days === 14);
  const tf30 = timeframes.find(t => t.days === 30);
  
  const t7 = tf7?.data?.totals || {};
  const t14 = tf14?.data?.totals || {};
  const t30 = tf30?.data?.totals || {};
  
  // Calculate trends
  const roas7 = t7.roas || 0;
  const roas14 = t14.roas || 0;
  const roas30 = t30.roas || 0;
  
  const spend7 = t7.spend || 0;
  const spend14 = t14.spend || 0;
  const spend30 = t30.spend || 0;
  
  // Determine overall trend
  let trendAnalysis = "";
  if (roas7 > roas14 && roas14 > roas30) {
    trendAnalysis = "📈 <strong>Positive Trend:</strong> ROAS is improving over time (7d > 14d > 30d). Recent optimizations are working.";
  } else if (roas7 < roas14 && roas14 < roas30) {
    trendAnalysis = "📉 <strong>Declining Trend:</strong> ROAS is deteriorating over time (7d < 14d < 30d). Immediate attention needed.";
  } else if (roas7 > roas30) {
    trendAnalysis = "📊 <strong>Recovery Pattern:</strong> Recent 7d ROAS (${roas7.toFixed(2)}x) is higher than 30d (${roas30.toFixed(2)}x). Recent changes are helping.";
  } else if (roas7 < roas30) {
    trendAnalysis = "⚠️ <strong>Warning Pattern:</strong> Recent 7d ROAS (${roas7.toFixed(2)}x) is lower than 30d (${roas30.toFixed(2)}x). Performance is slipping.";
  } else {
    trendAnalysis = "➡️ <strong>Stable Pattern:</strong> Performance is relatively consistent across timeframes.";
  }
  
  // Calculate account status
  const breakEven = 1.54;
  const scaleTarget = 2.0;
  
  let overallStatus = "";
  let statusColor = "#6b7280";
  if (roas7 >= scaleTarget) {
    overallStatus = "🟢 SCALE-ELIGIBLE";
    statusColor = "#059669";
  } else if (roas7 >= breakEven) {
    overallStatus = "🟡 PROFITABLE BUT CAUTIOUS";
    statusColor = "#d97706";
  } else if (roas7 >= 1.0) {
    overallStatus = "🟠 BREAK-EVEN RISK";
    statusColor = "#ea580c";
  } else {
    overallStatus = "🔴 CAPITAL AT RISK";
    statusColor = "#dc2626";
  }
  
  // Collect all insights for analysis
  const allInsights: InsightItem[] = [];
  timeframes.forEach(tf => {
    if (tf.insights?.insights) {
      allInsights.push(...tf.insights.insights);
    }
    if (tf.adLevelInsights?.insights) {
      allInsights.push(...tf.adLevelInsights.insights);
    }
  });
  
  // Categorize insights
  const scaleOps = allInsights.filter(i => (i.decision || i.type) === "scale");
  const pauseOps = allInsights.filter(i => (i.decision || i.type) === "pause" || (i.decision || i.type) === "reduce");
  const testOps = allInsights.filter(i => (i.decision || i.type) === "test");
  const adLevelInsights = allInsights.filter(i => i.level === "ad");
  
  // Build strengths, weaknesses, opportunities, threats
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];
  
  if (roas7 >= breakEven) strengths.push(`Current 7d ROAS (${roas7.toFixed(2)}x) is above break-even`);
  if (scaleOps.length > 0) strengths.push(`${scaleOps.length} campaign(s)/ad(s) identified for scaling`);
  if (t7.ctr > 0.5) strengths.push(`CTR (${(t7.ctr || 0).toFixed(2)}%) is above Pinterest benchmark`);
  
  if (roas7 < breakEven) weaknesses.push(`7d ROAS (${roas7.toFixed(2)}x) is below break-even (${breakEven}x)`);
  if (pauseOps.length > 0) weaknesses.push(`${pauseOps.length} underperforming element(s) identified for pause/reduction`);
  if (roas7 < roas30) weaknesses.push(`Recent performance is declining vs. 30d average`);
  
  if (testOps.length > 0) opportunities.push(`${testOps.length} testing opportunity/ies identified`);
  if (roas7 >= scaleTarget) opportunities.push(`Account is scale-eligible - consider +10-15% budget increase`);
  if (adLevelInsights.length > 0) opportunities.push(`${adLevelInsights.filter(i => (i.decision || i.type) === "scale").length} winning ads identified for scaling`);
  
  if (roas7 < 1.0) threats.push(`Account is currently cash-flow negative`);
  if (t7.frequency && t7.frequency > 2.5) threats.push(`Frequency (${t7.frequency.toFixed(1)}) is approaching fatigue threshold`);
  if (roas7 < roas14 && roas14 < roas30) threats.push(`Consistent downward trend requires immediate intervention`);
  
  return `
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">🎯 Executive Summary</h2>
      
      <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.15); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 140px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.8;">7-DAY ROAS</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${roas7.toFixed(2)}x</p>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 140px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.8;">14-DAY ROAS</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${roas14.toFixed(2)}x</p>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 140px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.8;">30-DAY ROAS</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${roas30.toFixed(2)}x</p>
        </div>
        <div style="background: ${statusColor}; padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 180px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.8;">ACCOUNT STATUS</p>
          <p style="margin: 0; font-size: 16px; font-weight: 700;">${overallStatus}</p>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.6;">${trendAnalysis}</p>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
      <div style="background: #d1fae5; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #065f46;">💪 Strengths</h3>
        ${strengths.length > 0 
          ? `<ul style="margin: 0; padding-left: 20px; color: #047857; font-size: 14px; line-height: 1.6;">${strengths.map(s => `<li>${s}</li>`).join("")}</ul>`
          : `<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">No clear strengths identified</p>`
        }
      </div>
      <div style="background: #fee2e2; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b;">⚠️ Weaknesses</h3>
        ${weaknesses.length > 0 
          ? `<ul style="margin: 0; padding-left: 20px; color: #dc2626; font-size: 14px; line-height: 1.6;">${weaknesses.map(w => `<li>${w}</li>`).join("")}</ul>`
          : `<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">No major weaknesses identified</p>`
        }
      </div>
      <div style="background: #dbeafe; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af;">🚀 Opportunities</h3>
        ${opportunities.length > 0 
          ? `<ul style="margin: 0; padding-left: 20px; color: #2563eb; font-size: 14px; line-height: 1.6;">${opportunities.map(o => `<li>${o}</li>`).join("")}</ul>`
          : `<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">Continue monitoring for opportunities</p>`
        }
      </div>
      <div style="background: #fef3c7; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #92400e;">🔥 Threats</h3>
        ${threats.length > 0 
          ? `<ul style="margin: 0; padding-left: 20px; color: #d97706; font-size: 14px; line-height: 1.6;">${threats.map(t => `<li>${t}</li>`).join("")}</ul>`
          : `<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">No immediate threats detected</p>`
        }
      </div>
    </div>
    
    <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #111827;">📋 This Week's Action Priorities</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #065f46; font-weight: 600;">✅ SCALE</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #059669;">${scaleOps.length}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">campaigns/ads</p>
        </div>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #991b1b; font-weight: 600;">❌ PAUSE/REDUCE</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626;">${pauseOps.length}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">campaigns/ads</p>
        </div>
        <div style="background: #ede9fe; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #5b21b6; font-weight: 600;">🧪 TEST</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #7c3aed;">${testOps.length}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">opportunities</p>
        </div>
      </div>
    </div>
    
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 32px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e40af;">💡 How to Read This Report</h3>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
        <li><strong>7-Day Window:</strong> Your PRIMARY decision layer. Make scale/pause decisions here.</li>
        <li><strong>14-Day Window:</strong> Trend confirmation. If 7d diverges significantly from 14d, investigate why.</li>
        <li><strong>30-Day Window:</strong> Structural patterns only. Never make reactive decisions based on 30d.</li>
        <li><strong>24-Hour Context:</strong> FYI only. Never decisive. Use to spot anomalies.</li>
        <li><strong>Ad-Level Insights:</strong> Individual creative performance within each timeframe.</li>
      </ul>
    </div>
  `;
}

function buildEmailHtml(timeframes: TimeframeData[], weekLabel: string): string {
  // Build executive summary first
  const executiveSummary = buildExecutiveSummary(timeframes);
  
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
      s.tf!.data?.totals,
      s.tf!.adLevelInsights
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
            
            ${executiveSummary}
            
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
      
      // Fetch account-level data
      const data = await fetchPinterestData(supabaseUrl, supabaseKey, days, "ACCOUNT");
      
      // Fetch ad-level data for 7d and 14d windows only (most actionable)
      let adData = null;
      if (days === 7 || days === 14) {
        console.log(`[weekly-ads-report] Fetching ${label} AD-level data...`);
        adData = await fetchPinterestData(supabaseUrl, supabaseKey, days, "AD");
      }
      
      let insights = null;
      if (data && data.totals) {
        console.log(`[weekly-ads-report] Generating ${label} insights...`);
        insights = await generateInsights(supabaseUrl, supabaseKey, data);
      }
      
      // Generate ad-level insights
      let adLevelInsights = null;
      if (adData && adData.totals) {
        console.log(`[weekly-ads-report] Generating ${label} AD-level insights...`);
        adLevelInsights = await generateInsights(supabaseUrl, supabaseKey, adData);
      }

      timeframes.push({
        label,
        days,
        data,
        insights,
        adLevelInsights,
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
