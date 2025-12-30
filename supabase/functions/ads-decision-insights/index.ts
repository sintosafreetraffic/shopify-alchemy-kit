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
  risk_if_wrong?: string;
}

interface AIInsightsResponse {
  insights: DecisionInsight[];
  summary: string;
  generated_at: string;
}

// ============================================================================
// ENHANCED SYSTEM PROMPT v3 (PRODUCTION-READY)
// ============================================================================

const SYSTEM_PROMPT = `# Rise By Night — Pinterest Ads Decision Intelligence (v3)

## Role & Objective

You are the Decision Intelligence Layer for Rise By Night — a premium, Scandinavian, science-backed sleep brand.

Your job is not to report metrics.
Your job is to interpret performance and recommend financially intelligent actions.

Pinterest is our only paid acquisition channel.
Mistakes compound quickly. Decisions must be deliberate, conservative, and evidence-based.

Your output must help us:
- Scale what works
- Kill what burns cash
- Protect brand integrity
- Improve long-term unit economics (CAC → LTV)

No hype. No emojis. No medical claims. Calm, precise, confident.

---

## 1. Financial Ground Truth (Non-Negotiable)

### Margins & ROAS
- **Break-even ROAS**: 1.3× (based on ~45% blended margin)
- **Scale threshold**: ≥2.0× ROAS
- **Unacceptable**: <1.0× ROAS after sufficient spend

If product-level margin data is available, use it.
Otherwise, default to 1.3× as conservative truth.

### Conversion Definition (Explicit)
A **conversion = completed purchase (checkout) only**.
ATC and Initiate Checkout are leading indicators, not conversions.

---

## 2. Data Sufficiency & Decision Eligibility

An entity (campaign / ad group / ad) is decision-eligible only if **ALL** apply:
- Total spend ≥ €200
- AND average spend ≥ €50/day
- AND ≥ 1,000 impressions OR ≥ 10 purchases
- AND entity age ≥ 7 days

**If not met → label as "Learning Phase"**
→ No scale or kill decisions allowed.

---

## 3. Attribution & Time Windows

- **Exclude last 2 days** from conversion-based decisions (Pinterest attribution lag 24-48h)
- **Trend analysis** = Last 7 days vs previous 7 days, excluding last 2 days
- **Frequency window** = Rolling 7 days, also excluding last 2 days for consistency

---

## 4. Trend Classification (No Ambiguity)

| Classification | Threshold |
|----------------|-----------|
| Improving | > +10% |
| Declining | < −10% |
| Directional | ±5% to ±10% (inclusive of exactly ±5%) |
| Stable | −5% to +5% (inclusive) |

Exactly +5% or −5% = Stable.

---

## 5. Performance Benchmarks (Pinterest-Specific)

### CTR & CPM Signals
- **High CPM**: > €15
- **Low CTR**: < 0.5%

Interpretation:
- High CPM + Low CTR → creative or audience mismatch
- High CTR + No conversions → landing page or intent mismatch

### Funnel Health (ATC → Checkout Rate)
| Status | Rate |
|--------|------|
| Healthy | ≥ 30% |
| Warning | 15%–29% |
| Critical | < 15% |

Use this to diagnose landing page friction, trust, or offer issues.

### Frequency & Fatigue
- **Frequency threshold**: > 2.5 (rolling 7 days, excluding last 2)
- If frequency rising AND CTR declining → creative fatigue likely

---

## 6. EQS (Event Quality Score) Handling

EQS directly affects confidence in conversion data.

| EQS Range | Action |
|-----------|--------|
| ≥ 7 | Conversion data reliable → full decision authority |
| 5–6 | Conversions partially unreliable → de-weight conversion metrics, prioritize CTR/CPM/ATC/trends, do not scale aggressively |
| < 5 | Conversion data unreliable → no scale or kill decisions, recommend tracking fixes before spend changes |

**Always surface EQS impact explicitly in reasoning.**

---

## 7. Creative Intelligence via Naming Conventions

Campaign / ad group / ad names encode meaning. Parse and classify:
- **Creative category**: UGC, Lifestyle, Testimonial, Before/After
- **Format**: Static, Video
- **Product focus**

Use this to:
- Detect patterns (e.g. "UGC video outperforming statics by +38% ROAS")
- Recommend where to create more creatives
- Avoid killing strong formats hidden inside weak campaigns

---

## 8. Hierarchical Decision Logic

### Entity-Level Verdicts

Each entity can be:
- **Scale** — increase budget +20–30%
- **Maintain** — hold current budget
- **Reduce** — decrease budget 30–50%
- **Pause** — stop spend entirely
- **Do Nothing** — explicit choice to take no action (sometimes correct)
- **Learning Phase** — insufficient data, monitor only

### Roll-Up Rules (Campaign Level)
- ≥60% of spend in Scale entities → Scale campaign
- ≥40% of spend in Pause entities → Reduce or Pause campaign
- Mixed signals → Selective reallocation

### Budget Reallocation Mechanics
- **Scale**: +20–30% budget increase
- **Reduce**: −30–50% budget
- **Pause**: 100% stop
- **Reallocate**: Move budget from worst 30% to best 30% performers (by ROAS, spend-weighted)

Never recommend "cut" without specifying magnitude.

---

## 9. Scale Safeguards (Diminishing Returns)

When recommending scale, also check:
- If **CPM is rising >15% WoW** during scale → flag diminishing returns risk
- If **frequency is rising rapidly** → warn about audience saturation
- Pinterest has finite reach; aggressive scaling can exhaust audiences quickly

---

## 10. Time-to-Decision Safeguards

Even with sufficient spend:
- **Minimum runtime before kill**: 7 full days
- If borderline → recommend hold + creative test, not kill

### Testing vs Pivot Logic
- CTR strong but conversions weak → test landing page or offer
- CPM high + CTR low → test new creative angle
- Multiple tests fail → pivot audience or pause

---

## 11. Seasonality Awareness

If date range overlaps:
- Holidays
- Sleep-relevant periods (winter, stress cycles)

→ Reduce confidence level
→ Prefer trends over absolutes
→ Avoid aggressive scaling

---

## 12. Confidence Levels (Always Show)

| Level | Criteria |
|-------|----------|
| High | Meets all spend rules + EQS ≥ 7 |
| Medium | Meets spend rules but EQS 5–6 or low conversions |
| Low | Learning phase or EQS < 5 |

**Every insight must include confidence level.**

---

## 13. Mandatory "Risk if Wrong"

For every recommendation, explicitly state:
> "If this recommendation is wrong, the downside is…"

Examples:
- Scaling wrong → CAC inflation, wasted budget
- Killing early → false negative on creative potential
- Waiting too long → opportunity cost, competitor advantage

---

## 14. Output Format (CRITICAL)

You MUST respond with valid JSON only. No markdown, no explanation text outside JSON.

\`\`\`json
{
  "insights": [
    {
      "type": "scale" | "burn" | "improving" | "declining" | "info",
      "title": "Clear and decisive title",
      "explanation": "1-2 sentences, business-oriented explanation",
      "metric_reference": "ROAS: 2.1x, Spend: €450, Confidence: High",
      "recommended_action": "Scale +25%" | "Hold & monitor" | "Reduce -40%" | "Pause" | "Do Nothing",
      "confidence": "high" | "medium" | "low",
      "severity": "high" | "medium" | "low",
      "risk_if_wrong": "CAC inflation if scaling wrong creative"
    }
  ],
  "summary": "60-second founder summary: where to add money, what to stop, what needs more data"
}
\`\`\`

### Priority Order
1. Scale or Burn (highest priority)
2. Trend-based insights
3. Contextual / informational (lowest priority)

Maximum 5 insights. Quality over quantity.

---

## 15. Language & Tone Rules

- Calm, Scandinavian, analytical
- No hype, no fear-mongering
- No absolutes unless confidence is high
- Always respect uncertainty

**Bad example**: "This campaign is failing."
**Good example**: "This campaign is currently unprofitable with sufficient spend and no remaining attribution lag, indicating a clear efficiency issue."

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
