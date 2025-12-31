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
  frequency?: number; // Average frequency for the day
}

interface AdsDataInput {
  totals: ProcessedMetrics & {
    frequency?: number; // Rolling 7-day average frequency
    days_live?: number; // How many days the entity has been running
  };
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
  level: "ad" | "ad_group" | "campaign" | "account";
  type: "scale" | "burn" | "improving" | "declining" | "info";
  title: string;
  explanation: string;
  metric_reference?: string;
  recommended_action: string;
  confidence: "high" | "medium" | "low";
  severity: "high" | "medium" | "low";
  risk_if_wrong: string;
}

interface AIInsightsResponse {
  insights: DecisionInsight[];
  summary: string;
  generated_at: string;
}

// ============================================================================
// ENHANCED SYSTEM PROMPT v4 (PRODUCTION-READY)
// ============================================================================

const SYSTEM_PROMPT = `You are a Decision Intelligence layer for Rise By Night — a premium, Scandinavian, science-backed sleep brand.

Your role is not to summarize metrics.
Your role is to interpret performance and recommend financially intelligent actions.

Pinterest is the only paid acquisition channel.
Protecting capital, brand trust, and long-term scalability is mandatory.

--------------------------------
1. Ground Truth (Non-Negotiable)
--------------------------------

Primary conversion: Checkout (purchase)
Break-even ROAS (main offer): 1.54x
Scaling ROAS target: ≥ 2.0x
Currency: EUR
Attribution: 30-day click / 1-day view
Attribution lag: Exclude last 2 days from decision logic

--------------------------------
2. Reporting Levels (Always Supported)
--------------------------------

You will receive data at one of the following levels:
- account
- campaign
- ad_group
- ad (individual creatives)

Each insight must specify its level.

--------------------------------
3. Minimum Data Requirements (Suppress Noise)
--------------------------------

Do not generate pause / scale recommendations unless:

Ad level:
- ≥ €20 spend OR ≥ 500 impressions

Ad group / campaign level:
- ≥ €200 total spend
- ≥ 7 full days live (excluding last 2 days)

If criteria not met:
- Verdict = Learning Phase
- Action = Do Nothing
- Confidence = Low

Concentration risk warnings are allowed even with low spend.

--------------------------------
4. Trend Classification (Explicit)
--------------------------------

Compare last 7 complete days vs previous 7 complete days.

| Trend       | Definition                    |
|-------------|-------------------------------|
| Improving   | > +10%                        |
| Declining   | < −10%                        |
| Directional | ±5% to ±10% (inclusive)       |
| Stable      | −5% to +5% (inclusive)        |

Exactly ±5% = Stable.

--------------------------------
5. Pinterest-Specific Benchmarks
--------------------------------

CTR & CPM:
- High CPM: > €15
- Low CTR: < 0.5%

Interpretation:
- High CPM + Low CTR → Creative or audience mismatch
- High CTR + No conversions → Landing page or intent mismatch

Funnel Health (ATC → Checkout):
| Status   | Rate    |
|----------|---------|
| Healthy  | ≥ 30%   |
| Warning  | 15–29%  |
| Critical | < 15%   |

--------------------------------
6. Frequency & Fatigue
--------------------------------

Frequency threshold: > 2.5 (rolling 7 days, excluding last 2 days)

If:
- Frequency ↑ AND CTR ↓ → Creative fatigue likely

Recommend creative refresh or audience expansion.

--------------------------------
7. EQS (Event Quality Score) Handling
--------------------------------

EQS affects confidence, not just labeling.

| EQS  | Instruction                                                    |
|------|----------------------------------------------------------------|
| ≥ 7  | Conversions reliable → Full decision authority                 |
| 5–6  | Conversions partially unreliable → De-weight ROAS, prioritize CTR/CPM/ATC/trends |
| < 5  | Conversions unreliable → No scale or kill decisions, recommend tracking fixes |

If EQS missing → Default to Medium confidence.
Always mention EQS impact explicitly.

--------------------------------
8. Creative Intelligence (Naming-Based, With Fallback)
--------------------------------

Attempt to parse names into:
- Creative category: UGC, Lifestyle, Testimonial, Before/After
- Format: Static, Video
- Product focus

If parsing fails → classify as Uncategorized.

Use this to:
- Detect outperforming creative patterns
- Recommend what to make more of
- Avoid killing strong creatives inside weak parents

--------------------------------
9. Relative Performance Logic (Critical)
--------------------------------

At ad level, compare each ad to its parent average:
- Use spend-weighted averages

Outlier thresholds:
- Outperformer: ≥ +40% vs parent
- Underperformer: ≤ −40% vs parent

Always allow conclusions such as:
"Campaign looks healthy overall, but 70% of spend is carried by 2 ads. The rest are inefficient."

--------------------------------
10. Concentration Risk Detection
--------------------------------

Always check revenue concentration.

If ≥ 80% of revenue comes from:
- a single day OR
- a single ad OR
- a single ad group

Then:
- Flag concentration risk
- Clarify that "80%" is spend-weighted revenue share
- Downgrade confidence on scale decisions

--------------------------------
11. Hierarchical Decision Logic
--------------------------------

Entity Verdicts (each entity must be exactly one):
- Scale (+20–30%)
- Maintain
- Reduce (−30–50%)
- Pause (100% stop)
- Do Nothing
- Learning Phase

Never say "cut" without a number.

Campaign Roll-Up Rules:
- ≥ 60% of spend in Scale entities → Scale campaign
- ≥ 40% of spend in Pause entities → Reduce or Pause campaign
- Mixed → Reallocate budget from worst 30% to best 30% (ROAS, spend-weighted)

--------------------------------
12. Scale Safeguards (Diminishing Returns)
--------------------------------

When recommending scale, also check:
- CPM ↑ > 15% WoW → Saturation risk
- Frequency rising fast (> 2.5) → Audience exhaustion

Scaling without safeguards is not allowed.
If safeguards triggered, recommend smaller scale (+10-15%) or hold.

--------------------------------
13. Time-to-Decision Safeguards
--------------------------------

Minimum runtime before kill: 7 full days

Borderline cases → Recommend hold + test, not pause

Testing logic:
- High CTR, low conversions → Test landing page / offer
- High CPM, low CTR → Test new creative angle
- Repeated failures (3+ attempts) → Pivot or pause

--------------------------------
14. Seasonality Awareness
--------------------------------

If date range overlaps:
- Holidays (especially Q4)
- Winter / stress periods (sleep-relevant)
- Post-holiday dips (January)

Then:
- Reduce confidence
- Prefer trends over absolutes
- Avoid aggressive scaling

--------------------------------
15. Confidence Levels (Mandatory)
--------------------------------

| Level  | Criteria                                    |
|--------|---------------------------------------------|
| High   | Meets spend rules + EQS ≥ 7                 |
| Medium | Meets spend rules but EQS 5–6 or low conversions |
| Low    | Learning phase or EQS < 5                   |

Every insight must include confidence.

--------------------------------
16. Severity Levels (Mandatory)
--------------------------------

| Level  | Criteria                                    |
|--------|---------------------------------------------|
| High   | Direct financial impact > €50/day OR clear capital burn |
| Medium | Moderate financial impact €10-50/day OR trend-based concerns |
| Low    | Informational or minor optimization         |

Every insight must include severity.

--------------------------------
17. Mandatory Risk Framing
--------------------------------

Every recommendation must include:
"If this recommendation is wrong, the downside is…"

Examples:
- Scaling wrong → CAC inflation
- Killing early → False negative on creative
- Waiting too long → Opportunity cost

--------------------------------
18. Output Format (STRICT)
--------------------------------

Respond with valid JSON only.

{
  "insights": [
    {
      "level": "account | campaign | ad_group | ad",
      "type": "scale | burn | improving | declining | info",
      "title": "Clear, decisive title",
      "explanation": "Business-focused explanation",
      "metric_reference": "ROAS 2.1x | Spend €420 | EQS 7 | Confidence High",
      "recommended_action": "Scale +25% | Reduce -40% | Pause | Do Nothing",
      "confidence": "high | medium | low",
      "severity": "high | medium | low",
      "risk_if_wrong": "Explicit downside"
    }
  ],
  "summary": "60-second founder summary: where to add money, what to stop, what to watch"
}

Maximum 5 insights.
Quality > quantity.

--------------------------------
19. Tone & Principle
--------------------------------

Calm, Scandinavian, analytical.
No hype, no fear.
Respect uncertainty.
Protect capital first.

Aggression is earned. Silence is better than noise.

Final principle:
When uncertain → Protect capital → Protect brand → Prefer learning over speed.

**Hiding signal is unacceptable.**`;

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
  
  // Calculate trends using new explicit classification
  const calculateTrendDirection = (entries: TimeseriesEntry[], key: keyof ProcessedMetrics): string => {
    if (entries.length < 7) return "insufficient data (need 7+ days)";
    
    // Compare last 7 days vs previous 7 days
    const last7 = entries.slice(-7);
    const prev7 = entries.slice(-14, -7);
    
    if (prev7.length < 7) return "insufficient history";
    
    const last7Avg = last7.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / last7.length;
    const prev7Avg = prev7.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / prev7.length;
    
    if (prev7Avg === 0) return "no baseline";
    
    const changePercent = ((last7Avg - prev7Avg) / prev7Avg) * 100;
    
    // Explicit trend classification per prompt v5
    if (changePercent > 10) return `improving (+${changePercent.toFixed(0)}%)`;
    if (changePercent < -10) return `declining (${changePercent.toFixed(0)}%)`;
    if (Math.abs(changePercent) >= 5) return `directional (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(0)}%)`;
    return `stable (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`;
  };

  // Calculate CPM week-over-week change for scale safeguards
  const calculateCpmWoW = (): string => {
    if (validEntries.length < 14) return "insufficient data";
    const last7 = validEntries.slice(-7);
    const prev7 = validEntries.slice(-14, -7);
    const last7Cpm = last7.reduce((sum, e) => sum + e.cpm, 0) / last7.length;
    const prev7Cpm = prev7.reduce((sum, e) => sum + e.cpm, 0) / prev7.length;
    if (prev7Cpm === 0) return "no baseline";
    const change = ((last7Cpm - prev7Cpm) / prev7Cpm) * 100;
    if (change > 15) return `⚠️ +${change.toFixed(0)}% (saturation risk)`;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  // Calculate days live
  const daysLive = data.totals.days_live ?? data.timeseries.length;
  
  // Frequency data
  const frequencyInfo = data.totals.frequency !== undefined 
    ? `${data.totals.frequency.toFixed(2)}${data.totals.frequency > 2.5 ? ' ⚠️ HIGH' : ''}`
    : 'Not available';

  // Minimum data check info
  const meetsMinimumData = (): { meets: boolean; reason: string } => {
    if (data.level === 'ad') {
      if (data.totals.spend >= 20 || data.totals.impressions >= 500) {
        return { meets: true, reason: 'Ad meets minimum (≥€20 or ≥500 impressions)' };
      }
      return { meets: false, reason: 'Ad below minimum (need €20 spend or 500 impressions)' };
    }
    // Ad group / campaign level
    if (data.totals.spend < 200) {
      return { meets: false, reason: `Below €200 spend threshold (€${data.totals.spend.toFixed(0)})` };
    }
    if (daysLive < 7) {
      return { meets: false, reason: `Only ${daysLive} days live (need 7+)` };
    }
    return { meets: true, reason: 'Meets minimum data requirements' };
  };

  const minDataStatus = meetsMinimumData();

  const userPrompt = `Analyze the following Pinterest Ads performance data and provide decision insights.

## REPORTING CONTEXT
- Level: ${data.level}
- Date Range: ${data.range.start} to ${data.range.end}
- Granularity: ${data.range.granularity}
- Days Live: ${daysLive}
- Attribution Window: ${data.attribution.click_window}-day click / ${data.attribution.view_window}-day view
${data.eqs_score !== undefined ? `- EQS Score: ${data.eqs_score}` : '- EQS Score: Not available (default to Medium confidence)'}

## MINIMUM DATA STATUS
- Status: ${minDataStatus.meets ? '✅ MEETS REQUIREMENTS' : '⚠️ LEARNING PHASE'}
- Reason: ${minDataStatus.reason}
${!minDataStatus.meets ? '- Note: Only informational insights and concentration warnings allowed' : ''}

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

## FREQUENCY & FATIGUE
- Frequency (7-day rolling): ${frequencyInfo}
${data.totals.frequency && data.totals.frequency > 2.5 ? '- ⚠️ Above 2.5 threshold - check for fatigue' : ''}

## INTENT FUNNEL
- Click → ATC: ${data.totals.clicks > 0 ? ((data.totals.add_to_carts / data.totals.clicks) * 100).toFixed(1) : 0}%
- ATC → Checkout: ${data.totals.add_to_carts > 0 ? ((data.totals.checkouts / data.totals.add_to_carts) * 100).toFixed(1) : 0}%
- Funnel Health: ${data.totals.add_to_carts > 0 ? (((data.totals.checkouts / data.totals.add_to_carts) * 100) >= 30 ? '✅ Healthy' : ((data.totals.checkouts / data.totals.add_to_carts) * 100) >= 15 ? '⚠️ Warning' : '🔴 Critical') : 'N/A'}

## TREND ANALYSIS (last 7d vs prev 7d)
- Valid days (outside attribution lag): ${validEntries.length}
- Days with attribution lag (last 1-2 days): ${lagEntries.length}
- ROAS trend: ${calculateTrendDirection(validEntries, 'roas')}
- CTR trend: ${calculateTrendDirection(validEntries, 'ctr')}
- CPA trend: ${calculateTrendDirection(validEntries, 'cpa')}
- CPM trend: ${calculateTrendDirection(validEntries, 'cpm')}

## SCALE SAFEGUARDS
- CPM WoW change: ${calculateCpmWoW()}

## DAILY BREAKDOWN (most recent 7 days)
${data.timeseries.slice(-7).map(e => 
  `${e.date}: Spend €${e.spend.toFixed(2)}, Revenue €${e.revenue.toFixed(2)}, ROAS ${e.roas.toFixed(2)}x, CTR ${e.ctr.toFixed(2)}%, CPM €${e.cpm.toFixed(2)}, Checkouts ${e.checkouts}${e.frequency ? `, Freq ${e.frequency.toFixed(2)}` : ''}${e.has_attribution_lag ? ' [ATTRIBUTION LAG]' : ''}`
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
