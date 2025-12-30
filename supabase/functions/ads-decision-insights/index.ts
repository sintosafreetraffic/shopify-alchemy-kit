/**
 * AI-Powered Ads Decision Insights Edge Function
 * 
 * Uses Lovable AI to interpret Pinterest Ads data and provide
 * actionable recommendations for founders.
 * 
 * Returns structured decision insights:
 * - What to scale
 * - What is burning money
 * - What is improving/declining
 * - Data quality warnings
 * 
 * Insights are saved to database for persistence.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/env.ts";

// ============================================================================
// TYPES
// ============================================================================

interface ProcessedMetrics {
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  checkouts: number;
  cpa: number;
  add_to_carts: number;
  conversions: number;
  conversion_rate: number;
  add_to_cart_rate: number;
}

interface TimeseriesEntry extends ProcessedMetrics {
  date: string;
  has_attribution_lag: boolean;
}

interface AdsDataInput {
  totals: ProcessedMetrics;
  timeseries: TimeseriesEntry[];
  range: {
    start: string;
    end: string;
    granularity: string;
  };
  level: string;
  attribution: {
    click_window: number;
    view_window: number;
  };
  eqs_score?: number; // Enhanced Quality Score if available
}

interface DecisionInsight {
  type: "scale" | "burn" | "improving" | "declining" | "info";
  title: string;
  explanation: string;
  metric_reference?: string;
  recommended_action: string;
  confidence: "high" | "medium" | "low";
  severity: "high" | "medium" | "low";
}

interface AIInsightsResponse {
  insights: DecisionInsight[];
  summary: string;
  generated_at: string;
}

// ============================================================================
// ENHANCED SYSTEM PROMPT WITH GAP FIXES
// ============================================================================

const SYSTEM_PROMPT = `# CONTEXT & ROLE

You are an internal performance intelligence system for RiseByNight, a premium Scandinavian sleep brand.

Your role is not to describe data.
Your role is to interpret paid media performance and recommend financially intelligent actions.

Constraints:
- No medical claims
- No hype
- No vanity metrics
- Prioritize profit, signal quality, and long-term scalability
- Pinterest is our only paid acquisition channel

## BUSINESS CONTEXT (GAP FIXES)

### Margin & Break-Even Context
- Our blended gross margin is ~60%
- Break-even ROAS is approximately 1.67x (1 / 0.60)
- Target ROAS for sustainable scaling: 2.0x+
- Total daily budget cap: €250

### Spend Thresholds for Statistical Validity
- Minimum €50/day or €350/period for reliable decision signals
- Below €50/day: treat as "learning phase" — do not penalize
- Below €20/day: insufficient data for any conclusions

### Benchmark References (Pinterest Home/Lifestyle)
- Typical CPM range: €5-12
- Typical CTR range: 0.4%-0.8%
- Typical ATC rate (from click): 1%-3%
- Typical ATC→Checkout: 15%-35%

## DATA INPUT

You receive Pinterest Ads reporting data via the Pinterest Ads API v5 with Conversion API + Enhanced Quality Signals (EQS) fully implemented.

Reporting Levels (current scope):
- ACCOUNT
- CAMPAIGN
- AD_GROUP
- PIN_PROMOTION (Ad-level)

Creative naming conventions may encode metadata (creative angle, product, format).

## ATTRIBUTION & DATA REALITY (CRITICAL)

Before any conclusions:
- Assume attribution lag of 24–48 hours
- View-through + engagement conversions may arrive late
- The last 1–2 days may be incomplete
- Do NOT penalize recent spend
- If checkouts = 0 but spend is recent → flag as "pending", not "bad"
- Metrics may not perfectly match Ads Manager (API data can be fresher, spend can be spread across UTC days)
- Minor deltas are normal and should not trigger panic actions

## EQS INTEGRATION (GAP 3 FIX)

When EQS (Enhanced Quality Score) data is provided:
- EQS ≥ 80%: High confidence in conversion data
- EQS 60-79%: Moderate confidence — weight intent signals (ATC rate) higher than checkout count
- EQS < 60%: Degraded confidence — flag conversion data as unreliable, recommend investigating tracking before budget changes
- If EQS drops significantly, note that ad performance drops may be tracking issues, not actual performance issues

## CORE METRICS AVAILABLE

You have access to:
- Spend, Impressions, Clicks, CTR, CPM, CPC
- Add to carts, Checkouts, Revenue, ROAS, CPA
- Time-series (daily/weekly/monthly)

## YOUR OBJECTIVE

Transform raw metrics into clear decisions at each reporting level:
**Scale / Hold / Reduce / Pause**

You must:
1. Identify where money should be added
2. Identify where money is being wasted
3. Explain why, in business terms
4. Warn about data limitations
5. Avoid premature conclusions

## DECISION FRAMEWORK (MANDATORY)

### 1. PROFIT SIGNALS (PRIMARY)

Classify performance using ROAS + volume context, not ROAS alone:

| Classification | Criteria |
|----------------|----------|
| Strong scale signal | ROAS ≥ 2.0 AND meaningful spend (≥€50/day) or consistent conversions |
| Conditional scale | ROAS 1.5–2.0 AND improving trend OR strong checkout intent |
| Neutral / learning | ROAS < 1.5 BUT low spend (<€50/day) or recent data |
| Burn signal | ROAS < 1.0 AND sufficient spend (≥€100 total) AND no attribution lag explanation |

Always explain confidence level of the signal.

### 2. INTENT QUALITY (SECONDARY)

Evaluate traffic quality, not just cost:
- Clicks → Add-to-Cart ratio (benchmark: 1-3%)
- Add-to-Cart → Checkout ratio (benchmark: 15-35%)

Interpretation:
- High clicks + low ATC → audience/promise mismatch
- High ATC + low checkout → friction, trust, or pricing issue
- Strong ATC→checkout → scale-worthy signal

### 3. EFFICIENCY DYNAMICS (TERTIARY)

Look for hidden inefficiencies:
- High CPM (>€12) + low CTR (<0.4%) → creative or audience fatigue
- Rising CPA → saturation or declining relevance
- Improving CTR but flat ROAS → curiosity clicks, not buyers

### 4. TRENDS > SNAPSHOTS

Compare:
- First half vs second half of the period
- Direction of ROAS, CTR, CPA

Classify trends:
- Improving
- Declining
- Flat / inconclusive

Low sample sizes (<5 days of data) must trigger a "not enough data" warning, not a decision.

## CROSS-LEVEL LOGIC (VERY IMPORTANT)

You must reason top-down and bottom-up:
- A healthy account can hide bad campaigns
- A bad campaign can hide one strong ad group
- A good campaign with one weak ad group → recommend pruning

Because creative-level is missing, you must explicitly state:
"Performance dispersion inside this ad group/campaign likely exists. Once ad-level data is available, isolate winning creatives and kill the rest."

## OUTPUT FORMAT (CRITICAL)

You MUST respond with valid JSON only. No markdown, no explanation text outside JSON.

Return an object with:
{
  "insights": [
    {
      "type": "scale" | "burn" | "improving" | "declining" | "info",
      "title": "Clear and decisive title",
      "explanation": "1-2 sentences, business-oriented explanation",
      "metric_reference": "ROAS: 2.1x, Spend: €450",
      "recommended_action": "Increase budget by 20-30%" | "Hold & monitor" | "Reduce spend by 50%" | "Pause",
      "confidence": "high" | "medium" | "low",
      "severity": "high" | "medium" | "low"
    }
  ],
  "summary": "60-second founder summary answering: where to add money, what to stop, what needs more data"
}

Insights must be prioritized:
1. Scale or Burn (highest priority)
2. Trend-based
3. Contextual / informational (lowest priority)

Maximum 5 insights. Quality over quantity.

## LANGUAGE & TONE RULES

- Calm, Scandinavian, analytical
- No hype, no fear-mongering
- No absolutes unless confidence is high
- Always respect uncertainty

Bad example: "This campaign is failing."
Good example: "This campaign is currently unprofitable with sufficient spend and no remaining attribution lag, indicating a clear efficiency issue."

## EXPLICIT LIMITATIONS (MUST BE STATED WHEN RELEVANT)

When appropriate, explicitly mention:
- Attribution lag (last 1-2 days incomplete)
- Sample size limitations (< 5 days)
- Missing creative-level visibility
- Seasonality or day-of-week effects
- EQS-related data quality issues

## ULTIMATE GOAL

Your output should allow a founder to answer, in under 60 seconds:
1. Where do I put more money today?
2. What should I stop funding?
3. What needs more data before touching?
4. What will become obvious once creative-level data is added?

If your output does not clearly enable those decisions, it is insufficient.`;

// ============================================================================
// AI REQUEST
// ============================================================================

async function generateInsights(data: AdsDataInput): Promise<AIInsightsResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Prepare data summary for the AI
  const validEntries = data.timeseries.filter(e => !e.has_attribution_lag);
  const lagEntries = data.timeseries.filter(e => e.has_attribution_lag);
  
  // Calculate trends
  const calculateTrendDirection = (entries: TimeseriesEntry[], key: keyof ProcessedMetrics): string => {
    if (entries.length < 3) return "insufficient data";
    const midpoint = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, midpoint);
    const secondHalf = entries.slice(midpoint);
    const firstAvg = firstHalf.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / secondHalf.length;
    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    if (changePercent > 15) return "improving (+${changePercent.toFixed(0)}%)";
    if (changePercent < -15) return "declining (${changePercent.toFixed(0)}%)";
    return "flat";
  };

  const userPrompt = `Analyze the following Pinterest Ads performance data and provide decision insights.

## REPORTING CONTEXT
- Level: ${data.level}
- Date Range: ${data.range.start} to ${data.range.end}
- Granularity: ${data.range.granularity}
- Attribution Window: ${data.attribution.click_window}-day click / ${data.attribution.view_window}-day view
${data.eqs_score !== undefined ? `- EQS Score: ${data.eqs_score}%` : '- EQS Score: Not available'}

## AGGREGATE TOTALS
- Spend: €${data.totals.spend.toFixed(2)}
- Revenue: €${data.totals.revenue.toFixed(2)}
- ROAS: ${data.totals.roas.toFixed(2)}x
- Impressions: ${data.totals.impressions.toLocaleString()}
- Clicks: ${data.totals.clicks.toLocaleString()}
- CTR: ${data.totals.ctr.toFixed(2)}%
- CPM: €${data.totals.cpm.toFixed(2)}
- CPC: €${data.totals.cpc.toFixed(2)}
- Add to Carts: ${data.totals.add_to_carts}
- Checkouts: ${data.totals.checkouts}
- CPA: ${data.totals.cpa > 0 ? '€' + data.totals.cpa.toFixed(2) : 'N/A (no checkouts)'}
- Conversion Rate: ${data.totals.conversion_rate.toFixed(2)}%
- Add to Cart Rate: ${data.totals.add_to_cart_rate.toFixed(2)}%

## INTENT FUNNEL
- Click → ATC: ${data.totals.clicks > 0 ? ((data.totals.add_to_carts / data.totals.clicks) * 100).toFixed(1) : 0}%
- ATC → Checkout: ${data.totals.add_to_carts > 0 ? ((data.totals.checkouts / data.totals.add_to_carts) * 100).toFixed(1) : 0}%

## TREND ANALYSIS
- Valid days (outside attribution lag): ${validEntries.length}
- Days with attribution lag (last 1-2 days): ${lagEntries.length}
- ROAS trend: ${calculateTrendDirection(validEntries, 'roas')}
- CTR trend: ${calculateTrendDirection(validEntries, 'ctr')}
- CPA trend: ${calculateTrendDirection(validEntries, 'cpa')}

## DAILY BREAKDOWN (most recent 7 days)
${data.timeseries.slice(-7).map(e => 
  `${e.date}: Spend €${e.spend.toFixed(2)}, Revenue €${e.revenue.toFixed(2)}, ROAS ${e.roas.toFixed(2)}x, Checkouts ${e.checkouts}${e.has_attribution_lag ? ' [ATTRIBUTION LAG]' : ''}`
).join('\n')}

Provide your analysis as a JSON object with "insights" array and "summary" string.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent, analytical responses
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (response.status === 402) {
      throw new Error("PAYMENT_REQUIRED");
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response (may be wrapped in markdown code blocks)
  let jsonContent = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonContent.trim());
    return {
      insights: parsed.insights || [],
      summary: parsed.summary || "",
      generated_at: new Date().toISOString(),
    };
  } catch (parseError) {
    console.error("Failed to parse AI response:", content.substring(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

// ============================================================================
// DATABASE PERSISTENCE
// ============================================================================

function createDataHash(data: AdsDataInput): string {
  // Create a simple hash based on key metrics
  const hashInput = JSON.stringify({
    spend: data.totals.spend,
    revenue: data.totals.revenue,
    checkouts: data.totals.checkouts,
    days: data.timeseries.length,
  });
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

async function saveInsightsToDb(
  supabase: any,
  data: AdsDataInput,
  insights: AIInsightsResponse,
  dataHash: string
): Promise<void> {
  const { error } = await supabase
    .from("ads_decision_insights")
    .upsert({
      level: data.level,
      date_range_start: data.range.start,
      date_range_end: data.range.end,
      granularity: data.range.granularity,
      data_hash: dataHash,
      insights: insights.insights,
      summary: insights.summary,
      eqs_score: data.eqs_score || null,
      totals_snapshot: data.totals,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "level,date_range_start,date_range_end,granularity",
    });
  
  if (error) {
    console.error("[ads-decision-insights] Failed to save insights:", error);
  } else {
    console.log("[ads-decision-insights] Insights saved to database");
  }
}

async function loadInsightsFromDb(
  supabase: any,
  data: AdsDataInput
): Promise<{ insights: AIInsightsResponse; dataHash: string } | null> {
  const { data: savedInsights, error } = await supabase
    .from("ads_decision_insights")
    .select("*")
    .eq("level", data.level)
    .eq("date_range_start", data.range.start)
    .eq("date_range_end", data.range.end)
    .eq("granularity", data.range.granularity)
    .maybeSingle();
  
  if (error || !savedInsights) {
    return null;
  }
  
  return {
    insights: {
      insights: savedInsights.insights as DecisionInsight[],
      summary: savedInsights.summary || "",
      generated_at: savedInsights.updated_at,
    },
    dataHash: savedInsights.data_hash,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: AdsDataInput = await req.json();
    
    // Validate required fields
    if (!data.totals || !data.timeseries) {
      return createErrorResponse("Missing required fields: totals, timeseries", 400);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Calculate current data hash
    const currentDataHash = createDataHash(data);
    
    // Check for existing saved insights
    const savedData = await loadInsightsFromDb(supabase, data);
    
    // If we have saved insights with matching data hash, return them
    if (savedData && savedData.dataHash === currentDataHash) {
      console.log(`[ads-decision-insights] Returning cached insights for ${data.level} level`);
      return createSuccessResponse({
        ...savedData.insights,
        from_cache: true,
      });
    }

    console.log(`[ads-decision-insights] Generating insights for ${data.level} level, ${data.timeseries.length} days`);

    const insights = await generateInsights(data);
    
    console.log(`[ads-decision-insights] Generated ${insights.insights.length} insights`);

    // Save insights to database
    await saveInsightsToDb(supabase, data, insights, currentDataHash);

    return createSuccessResponse({
      ...insights,
      from_cache: false,
    });
  } catch (error) {
    console.error("[ads-decision-insights] Error:", error);
    
    if (error instanceof Error) {
      if (error.message === "RATE_LIMITED") {
        return createErrorResponse("AI rate limit exceeded. Please try again in a moment.", 429);
      }
      if (error.message === "PAYMENT_REQUIRED") {
        return createErrorResponse("AI credits exhausted. Please add funds.", 402);
      }
      return createErrorResponse(error.message, 500);
    }
    
    return createErrorResponse("Unknown error generating insights", 500);
  }
});
