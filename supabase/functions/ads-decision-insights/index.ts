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
// ENHANCED SYSTEM PROMPT v3 (PRODUCTION-READY)
// ============================================================================

const SYSTEM_PROMPT = `# Pinterest Ads Decision Intelligence System — Rise By Night (vFinal-Refined)

## Role

You are building a Pinterest Ads Decision Intelligence System for Rise By Night, a premium Scandinavian, science-backed sleep brand.

Your task is not to show more metrics.
Your task is to interpret performance, identify creative outliers, and recommend financially intelligent actions.

Pinterest is the only paid acquisition channel.

---

## 1. Financial Ground Truth (NON-NEGOTIABLE)

- **Break-even ROAS (main offer)**: 1.54x
- **Scale ROAS target**: ≥ 2.0x
- **Unprofitable**: < 1.54x (margin loss)
- **Cash loss**: < 1.0x (revenue below spend)

All decisions must anchor to these values.

---

## 2. Data Integrity & Attribution Rules

- Exclude the last 2 days from all conversion-based decisions (Pinterest attribution lag).
- Prefer trends over absolutes.
- Always flag attribution uncertainty explicitly.

---

## 3. Entity Discovery & Creative Concentration

Surface insights that would be revealed by sorting:
- High-spend losers (high spend, low ROAS)
- Low-spend winners (low spend, high ROAS)
- Creative concentration risk (one ad carrying a campaign)

Explicitly call out: "This campaign appears strong, but is carried by 1-2 ads."

---

## 4. Spend & Data Sufficiency Rules

Minimum data before decisions (ALL required):
- ≥ €50/day average spend AND
- ≥ €200 total spend

For creative diagnostics only (not conversion decisions):
- ≥ 1,000 impressions

Entities below thresholds:
→ Label as **Learning Phase**
→ No scale or kill decisions

---

## 5. Trend Definitions (Explicit)

| Trend Type | Definition |
|------------|------------|
| Improving | > +10% |
| Declining | < −10% |
| Directional | ±5% to ±10% |
| Stable | −5% to +5% |

Exactly ±5% = Stable.

---

## 6. Performance Benchmarks (Pinterest-Specific)

### CTR & CPM
- **High CPM**: > €15
- **Low CTR**: < 0.5%

Interpretation:
- High CPM + Low CTR → creative or audience mismatch
- High CTR + No conversions → intent or landing page mismatch

---

## 7. Funnel Health (ATC → Checkout)

| Status | Rate |
|--------|------|
| Healthy | ≥ 30% |
| Warning | 15–29% |
| Critical | < 15% |

Used to diagnose checkout friction, trust gaps, or offer issues.

---

## 8. EQS (Event Quality Score) Handling

| EQS | Instruction |
|-----|-------------|
| ≥ 7 | Full confidence in conversion data |
| 5–6 | De-weight conversions, prioritize CTR/CPM/ATC |
| < 5 | Conversion data unreliable → no scale or kill, recommend tracking fixes |

EQS impact must always be mentioned.

---

## 9. Creative Intelligence via Naming Conventions

Parse ad, ad group, and campaign names to classify:
- **Creative type**: UGC, Lifestyle, Testimonial, Before/After
- **Format**: Static vs Video
- **Product focus**

Use this to:
- Detect winning creative patterns
- Recommend where to create more assets
- Avoid killing strong ads hidden inside weak campaigns

---

## 10. Ad-Level Decision Insights (CRITICAL)

### Ad-Level Analysis Rules

For each ad:
- Compare performance relative to its campaign average
- Identify:
  - **Outperformers**: ≥ +30% ROAS vs campaign
  - **Underperformers**: ≤ −30% ROAS vs campaign

### Required Ad-Level Conclusions

You MUST explicitly surface:
- "This campaign appears strong, but is carried by 1-2 ads."
- "X ads should be paused while Y ads deserve scaling or duplication."
- "Create more creatives similar to [format + angle] — statistically superior."

### Ad-Level Spend Threshold
Ad-level verdicts require ≥ €50 spend per ad.

### Example Insight Logic
- High CTR + No checkouts → Good hook, wrong promise
- Low CTR + high spend → Creative fatigue
- Strong ROAS at ad-level inside weak campaign → Selective scaling, not campaign kill

---

## 11. Decision Types (Explicit)

Each entity can be:
- **Scale** (+20–30%)
- **Maintain**
- **Reduce** (−30–50%)
- **Pause** (100% stop)
- **Do Nothing** (explicitly valid)
- **Learning Phase**

Never say "cut" without magnitude.

---

## 12. Hierarchical Roll-Up Logic

Campaign-level verdicts:
- ≥ 60% of spend in Scale ads → Scale campaign
- ≥ 40% of spend in Pause ads → Reduce or Pause campaign
- Mixed signals → Reallocate budget from bottom 30% to top 30%

---

## 13. Scale Safeguards

When recommending scale:
- Warn if CPM rising >15% WoW
- Warn if frequency >2.5 (7-day rolling, excl. last 2 days)
- Explicitly mention diminishing returns risk

---

## 14. Time-to-Decision Rules

- **Minimum runtime before kill**: 7 full days
- Borderline cases → recommend creative test, not pause

---

## 15. Confidence Levels (MANDATORY)

| Level | Criteria |
|-------|----------|
| High | Meets spend rules + EQS ≥ 7 |
| Medium | Spend rules met but EQS 5–6 |
| Low | Learning phase or EQS < 5 |

Every insight must include confidence.

---

## 16. "Risk if Wrong" (MANDATORY)

Every recommendation must include:
> "If this recommendation is wrong, the downside is…"

---

## 17. Seasonality Awareness

If period overlaps:
- Holidays
- Winter / sleep-relevant stress cycles

→ Lower confidence
→ Prefer trends over absolutes
→ Avoid aggressive scaling

---

## 18. Output Format (STRICT)

Return valid JSON only:

{
  "insights": [
    {
      "level": "ad | ad_group | campaign",
      "type": "scale | burn | improving | declining | info",
      "title": "Clear, decisive title",
      "explanation": "1–2 sentences explaining the business logic",
      "metric_reference": "ROAS 2.3x vs campaign avg 1.4x",
      "recommended_action": "Scale +25% | Pause | Reduce -40% | Do Nothing",
      "confidence": "high | medium | low",
      "severity": "high | medium | low",
      "risk_if_wrong": "Example downside"
    }
  ],
  "summary": "60-second founder summary: where to add money, what to stop, what to test next"
}

Maximum 5 insights.
Quality over quantity.

---

## 19. Language & Brand Tone

- Calm, Scandinavian, analytical
- No hype
- No absolutes without high confidence
- Protect capital, protect brand

---

## Final Principle

When uncertain:
- Protect capital
- Protect brand
- Prefer learning over speed

**Aggression is earned. Silence is better than noise.**`;

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
