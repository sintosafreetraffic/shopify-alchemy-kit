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

// Entity breakdown for individual campaigns/ad groups/ads
interface EntityMetrics extends ProcessedMetrics {
  id: string;
  name: string;
  entity_type: "campaign" | "ad_group" | "ad";
  status?: string;
  // Parsed from naming conventions
  creative_category?: string; // UGC, Lifestyle, Testimonial, Before/After
  creative_format?: string;   // Static, Video
  product_focus?: string;
  persona?: string;           // e.g., Jason, Mia
  // Parent references (for ads / ad groups)
  campaign_id?: string;
  campaign_name?: string;
  ad_group_id?: string;
  ad_group_name?: string;
}

interface AdsDataInput {
  totals: ProcessedMetrics & {
    frequency?: number; // Rolling 7-day average frequency
    days_live?: number; // How many days the entity has been running
  };
  timeseries: TimeseriesEntry[];
  entities?: EntityMetrics[]; // Individual entity breakdown for creative-level analysis
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
  break_even_roas?: number; // Configurable break-even ROAS (default: 1.54)
}

interface DecisionInsight {
  level: "ad" | "ad_group" | "campaign" | "account";
  // Support both old "type" and new "decision" field for backwards compatibility
  type?: "scale" | "burn" | "improving" | "declining" | "info";
  decision?: "scale" | "reduce" | "pause" | "test" | "maintain" | "do_nothing" | "learning_phase";
  priority?: number;
  title: string;
  explanation: string;
  metric_reference?: string;
  metrics?: string; // New field name
  recommended_action: string;
  confidence: "high" | "medium" | "low";
  severity: "high" | "medium" | "low";
  risk_if_wrong: string;
  next_review?: "3d" | "7d" | "14d";
}

interface AIInsightsResponse {
  account_health_score?: number;
  insights: DecisionInsight[];
  summary: string;
  generated_at: string;
}

// ============================================================================
// ENHANCED SYSTEM PROMPT v6 (FINAL - WITH ALL FIXES & POLISH)
// ============================================================================

function buildSystemPrompt(breakEvenRoas: number): string {
  return `You are the Decision Intelligence System for Rise By Night — a premium Scandinavian, science-backed sleep brand.

Your role is not to report metrics.
Your role is to protect capital, identify asymmetric upside, and recommend financially intelligent actions.

Pinterest is the only paid acquisition channel.
Profitability, signal clarity, and brand integrity matter more than speed.

────────────────────────────────────────
1. DATA INPUT ASSUMPTIONS
────────────────────────────────────────

You will receive structured Pinterest Ads data as JSON with (when available):
- level: account | campaign | ad_group | ad
- name, parent_name
- spend, impressions, clicks, CPM, CPC
- add_to_carts, checkouts, purchases, revenue
- ROAS, CPA, CTR
- frequency (7-day rolling, excluding last 2 days if available)
- EQS (Event Quality Score, 1–10, optional)
- timeframe data: last 1d, 7d, 14d, 30d
- prior period (WoW) data when available

If a metric is missing → Explicitly state "Insufficient data" and skip that analysis.

────────────────────────────────────────
2. GROUND TRUTH ECONOMICS (NON-NEGOTIABLE)
────────────────────────────────────────

- Break-even ROAS: ${breakEvenRoas.toFixed(2)}x
- Scaling ROAS target: ≥ 2.0x
- Currency: EUR
- Attribution: 30-day click / 1-day view
- View-through conversions count at 50% weight vs click-through
- Exclude the last 2 days from conversion-based decisions only (not CTR/CPM)

Definitions:
- ROAS < 1.0x → Cash loss
- ROAS 1.0–${breakEvenRoas.toFixed(2)}x → Unprofitable but learning
- ROAS ≥ ${breakEvenRoas.toFixed(2)}x → Profitable
- ROAS ≥ 2.0x → Scale-eligible

────────────────────────────────────────
3. MINIMUM DATA REQUIREMENTS
────────────────────────────────────────

Conversion Decisions:
- Ads: ≥ €50 spend
- Campaigns / Ad Groups: ≥ €200 spend AND ≥ 7 days live

Creative Diagnostics (non-conversion):
- ≥ 1,000 impressions OR ≥ 500 clicks

If below thresholds → Verdict = learning_phase

────────────────────────────────────────
4. DECISION TYPES (STRICT ENUM)
────────────────────────────────────────

Use ONLY these values:
scale | reduce | pause | test | maintain | do_nothing | learning_phase

────────────────────────────────────────
5. BENCHMARKS (PINTEREST-SPECIFIC)
────────────────────────────────────────

Efficiency:
- High CPM: > €15
- Inefficient CPC: > €1.50
- Low CTR: < 0.5%

Funnel Health (ATC → Purchase):
- Healthy: ≥ 30%
- Warning: 15–29%
- Critical: < 15%

────────────────────────────────────────
6. TREND CLASSIFICATION (CORRECTED)
────────────────────────────────────────

Compare selected timeframe vs prior equivalent period (excluding last 2 days):

| Change           | Classification  |
|------------------|-----------------|
| ≥ +10%           | Improving       |
| +5% to +10%      | Directional ↑   |
| −5% to +5%       | Stable          |
| −10% to −5%      | Directional ↓   |
| ≤ −10%           | Declining       |

If prior data missing → State "Trend unavailable" and rely on absolute thresholds only.

────────────────────────────────────────
7. FREQUENCY & FATIGUE
────────────────────────────────────────

Risk threshold: > 2.5 (7-day rolling)

If frequency ↑ AND CTR ↓ → Fatigue likely
Never scale fatigued creatives.

────────────────────────────────────────
8. CREATIVE INTELLIGENCE
────────────────────────────────────────

Parse names when possible:
- Category: UGC, Testimonial, Lifestyle, Before/After, Expert, Comparison, Static, Video
- If parsing fails → classify as "Uncategorized"

Creative Diversity Health:
- Healthy = ≥ 3 creative categories active with ≥ €100 spend each
- Flag low diversity as structural risk

────────────────────────────────────────
9. RELATIVE PERFORMANCE LOGIC
────────────────────────────────────────

Compare entities only to their direct parent, using spend-weighted averages.

Spend-weighted average formula:
Parent ROAS = Σ(entity_spend × entity_ROAS) / Σ(entity_spend)

Outlier thresholds:
- Winner: ≥ +40% vs parent ROAS
- Loser: ≤ −40% vs parent ROAS

Never kill a campaign if it contains a clear winning ad.

────────────────────────────────────────
10. CONFLICT RESOLUTION HIERARCHY (MANDATORY)
────────────────────────────────────────

When signals conflict, apply in order:
1. Capital protection (cash loss overrides everything)
2. Confidence level
3. Trend direction
4. Spend magnitude
5. Reversibility

If conflict remains → Verdict = maintain + monitor

────────────────────────────────────────
11. SCALING SAFEGUARDS
────────────────────────────────────────

When recommending scale:
- Warn if CPM ↑ > 15% WoW
- Warn if frequency rising rapidly (> 2.5)
- Prefer +10–15% if saturation risk exists

────────────────────────────────────────
12. TESTING LOGIC (BE SPECIFIC)
────────────────────────────────────────

Use "test" only with clarity:
- Creative iteration
- Landing page variant
- Offer/bundle
- Audience refinement

Never recommend vague "testing".

────────────────────────────────────────
13. CONFIDENCE LEVELS
────────────────────────────────────────

- High: Thresholds met + EQS ≥ 7
- Medium: Thresholds met + EQS 5–6 OR partial data
- Low: Learning phase OR EQS < 5

If EQS missing → Default Medium

EQS is Pinterest's Event Match Quality score from Events Manager.
Always mention EQS impact explicitly.

────────────────────────────────────────
14. SEVERITY VS PRIORITY
────────────────────────────────────────

- Severity = urgency / financial risk
- Priority = execution order

Priority ranking (1 = highest):
1. Cash at risk
2. Confidence
3. Reversibility

High severity + low priority = monitor closely

────────────────────────────────────────
15. HIERARCHICAL ROLL-UP LOGIC
────────────────────────────────────────

Campaign verdict rules:
- ≥ 60% of spend in Scale entities → Scale campaign
- ≥ 40% of spend in Pause entities → Reduce or Pause campaign
- Mixed → Reallocate from worst 30% to best 30% (ROAS, spend-weighted)

────────────────────────────────────────
16. ACCOUNT HEALTH SCORE (1–100)
────────────────────────────────────────

Calculate explicitly:

A. ROAS vs target (40 points max):
   Score = (actual_ROAS / 2.0) × 40, capped at 40

B. Efficiency trend (20 points max):
   - Improving: 20
   - Stable: 15
   - Directional: 10
   - Declining: 0
   - Trend unavailable: 10

C. Creative diversity health (20 points max):
   - ≥ 3 categories with ≥ €100 spend each: 20
   - 2 categories: 10
   - < 2 categories: 0

D. Funnel health (20 points max):
   Score = (ATC_to_Purchase_rate / 30) × 20, capped at 20

Always explain the score in one sentence.

────────────────────────────────────────
17. SEASONALITY AWARENESS
────────────────────────────────────────

If date range overlaps:
- Holidays (especially Q4)
- Post-holiday dips (January)
- Winter stress cycles (sleep-relevant)

Then:
- Reduce confidence
- Prefer trends over absolutes
- Avoid aggressive scaling

────────────────────────────────────────
18. EDGE CASE: ALL PERFORMING WELL
────────────────────────────────────────

If all entities meet targets:
→ Recommend incremental scale (+10%)
→ Flag saturation risk proactively
→ Suggest creative diversification test

────────────────────────────────────────
19. EDGE CASE: ALL PERFORMING POORLY
────────────────────────────────────────

If all entities below break-even:
→ Pause lowest performers first
→ Protect top 20% by spend
→ Recommend offer/landing page audit

────────────────────────────────────────
20. MANDATORY RISK FRAMING
────────────────────────────────────────

Every recommendation MUST include:
"If this is wrong, the downside is…"

────────────────────────────────────────
21. OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────

{
  "account_health_score": 72,
  "insights": [
    {
      "level": "ad | ad_group | campaign | account",
      "decision": "scale | reduce | pause | test | maintain | do_nothing | learning_phase",
      "priority": 1,
      "severity": "high | medium | low",
      "confidence": "high | medium | low",
      "title": "Clear business insight",
      "explanation": "Concise reasoning",
      "metrics": "ROAS 2.3x, Spend €420",
      "recommended_action": "Scale +15%",
      "risk_if_wrong": "Short-term CAC inflation",
      "next_review": "3d | 7d | 14d"
    }
  ],
  "summary": "60-second executive summary answering: (1) Where to add budget, (2) What to cut, (3) What to test, (4) What to ignore this week"
}

Max 5 insights. Quality > quantity.

────────────────────────────────────────
22. EXAMPLE INPUT/OUTPUT
────────────────────────────────────────

Example Input (simplified):
{
  "level": "account",
  "totals": { "spend": 1200, "revenue": 2400, "roas": 2.0, "ctr": 0.8, "cpm": 12 },
  "eqs_score": 7
}

Example Output:
{
  "account_health_score": 78,
  "insights": [
    {
      "level": "account",
      "decision": "scale",
      "priority": 1,
      "severity": "medium",
      "confidence": "high",
      "title": "Account at scale-eligible ROAS with healthy efficiency",
      "explanation": "2.0x ROAS exceeds 1.54x break-even. EQS 7 provides high-confidence attribution.",
      "metrics": "ROAS 2.0x, Spend €1,200, CPM €12, CTR 0.8%",
      "recommended_action": "Scale +15%",
      "risk_if_wrong": "Minor CAC inflation if audience saturates",
      "next_review": "7d"
    }
  ],
  "summary": "Account healthy at 2.0x ROAS. Scale cautiously +15%. Monitor CPM for saturation. No urgent cuts needed."
}

────────────────────────────────────────
23. TONE & FINAL PRINCIPLE
────────────────────────────────────────

Calm, Scandinavian, analytical.
No hype, no fear.
Respect uncertainty.
Protect capital first.

When uncertain:
→ Protect capital
→ Protect brand
→ Prefer learning over speed

Aggression is earned. Silence is better than noise.

**Hiding signal is unacceptable.**`;
}

// ============================================================================
// AI REQUEST
// ============================================================================

async function generateInsights(data: AdsDataInput): Promise<AIInsightsResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Use configurable break-even ROAS (default: 1.54)
  const breakEvenRoas = data.break_even_roas ?? 1.54;
  const systemPrompt = buildSystemPrompt(breakEvenRoas);

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

  // Parse creative intelligence from entity names
  const parseCreativeFromName = (name: string): { category?: string; format?: string; persona?: string } => {
    const nameLower = name.toLowerCase();
    
    // Creative category detection
    let category: string | undefined;
    if (nameLower.includes('ugc')) category = 'UGC';
    else if (nameLower.includes('lifestyle')) category = 'Lifestyle';
    else if (nameLower.includes('testimonial')) category = 'Testimonial';
    else if (nameLower.includes('before') && nameLower.includes('after')) category = 'Before/After';
    else if (nameLower.includes('product')) category = 'Product';
    else if (nameLower.includes('educational') || nameLower.includes('edu')) category = 'Educational';
    
    // Format detection
    let format: string | undefined;
    if (nameLower.includes('video') || nameLower.includes('vid')) format = 'Video';
    else if (nameLower.includes('static') || nameLower.includes('image') || nameLower.includes('carousel')) format = 'Static';
    
    // Persona detection (common personas)
    let persona: string | undefined;
    const personaMatches = name.match(/\b(jason|mia|alex|sarah|mike|emma|chris|lisa|tom|amy)\b/i);
    if (personaMatches) persona = personaMatches[1];
    
    return { category, format, persona };
  };

  // Build entity breakdown section for the prompt
  const buildEntitySection = (): string => {
    if (!data.entities || data.entities.length === 0) {
      return '## ENTITY BREAKDOWN\nNo entity-level data provided. Insights based on aggregate totals only.';
    }

    // Calculate parent average for relative comparison
    const parentSpend = data.totals.spend;
    const parentROAS = data.totals.roas;
    const parentCTR = data.totals.ctr;
    
    // Enrich entities with parsed creative intelligence
    const enrichedEntities = data.entities.map(e => {
      const parsed = parseCreativeFromName(e.name);
      return {
        ...e,
        creative_category: e.creative_category || parsed.category || 'Uncategorized',
        creative_format: e.creative_format || parsed.format || 'Unknown',
        persona: e.persona || parsed.persona,
        roas_vs_parent: parentROAS > 0 ? ((e.roas - parentROAS) / parentROAS * 100) : 0,
        ctr_vs_parent: parentCTR > 0 ? ((e.ctr - parentCTR) / parentCTR * 100) : 0,
        spend_share: parentSpend > 0 ? (e.spend / parentSpend * 100) : 0,
      };
    });

    // Sort by spend descending
    enrichedEntities.sort((a, b) => b.spend - a.spend);
    
    // Check for concentration risk
    const topEntitySpendShare = enrichedEntities[0]?.spend_share || 0;
    const top2SpendShare = enrichedEntities.slice(0, 2).reduce((sum, e) => sum + e.spend_share, 0);
    const concentrationWarning = topEntitySpendShare >= 80 
      ? `⚠️ CONCENTRATION RISK: Top entity has ${topEntitySpendShare.toFixed(0)}% of spend`
      : top2SpendShare >= 80 
        ? `⚠️ CONCENTRATION: Top 2 entities have ${top2SpendShare.toFixed(0)}% of spend`
        : '';

    const entityLines = enrichedEntities.slice(0, 15).map((e, idx) => {
      const roasIndicator = e.roas_vs_parent >= 40 ? '✅ OUTPERFORMER' : e.roas_vs_parent <= -40 ? '🔴 UNDERPERFORMER' : '';
      const personaTag = e.persona ? `[${e.persona}]` : '';
      return `${idx + 1}. "${e.name}" ${personaTag}
   - Type: ${e.entity_type} | Category: ${e.creative_category} | Format: ${e.creative_format}
   - Spend: €${e.spend.toFixed(2)} (${e.spend_share.toFixed(1)}% of total) | Revenue: €${e.revenue.toFixed(2)}
   - ROAS: ${e.roas.toFixed(2)}x (${e.roas_vs_parent >= 0 ? '+' : ''}${e.roas_vs_parent.toFixed(0)}% vs parent) ${roasIndicator}
   - CTR: ${e.ctr.toFixed(2)}% (${e.ctr_vs_parent >= 0 ? '+' : ''}${e.ctr_vs_parent.toFixed(0)}% vs parent)
   - Checkouts: ${e.checkouts} | CPA: ${e.cpa > 0 ? '€' + e.cpa.toFixed(2) : 'N/A'}`;
    }).join('\n\n');

    // Aggregate by creative category
    const categoryPerformance: Record<string, { spend: number; revenue: number; count: number; clicks: number; impressions: number }> = {};
    enrichedEntities.forEach(e => {
      const cat = e.creative_category;
      if (!categoryPerformance[cat]) categoryPerformance[cat] = { spend: 0, revenue: 0, count: 0, clicks: 0, impressions: 0 };
      categoryPerformance[cat].spend += e.spend;
      categoryPerformance[cat].revenue += e.revenue;
      categoryPerformance[cat].count++;
      categoryPerformance[cat].clicks += e.clicks;
      categoryPerformance[cat].impressions += e.impressions;
    });
    
    const categoryLines = Object.entries(categoryPerformance)
      .sort(([, a], [, b]) => b.spend - a.spend)
      .map(([cat, stats]) => {
        const catROAS = stats.spend > 0 ? stats.revenue / stats.spend : 0;
        const catCTR = stats.impressions > 0 ? (stats.clicks / stats.impressions * 100) : 0;
        return `- ${cat}: ${stats.count} entities, €${stats.spend.toFixed(0)} spend, ${catROAS.toFixed(2)}x ROAS, ${catCTR.toFixed(2)}% CTR`;
      }).join('\n');

    // Aggregate by format (Static vs Video)
    const formatPerformance: Record<string, { spend: number; revenue: number; count: number; clicks: number; impressions: number }> = {};
    enrichedEntities.forEach(e => {
      const fmt = e.creative_format;
      if (!formatPerformance[fmt]) formatPerformance[fmt] = { spend: 0, revenue: 0, count: 0, clicks: 0, impressions: 0 };
      formatPerformance[fmt].spend += e.spend;
      formatPerformance[fmt].revenue += e.revenue;
      formatPerformance[fmt].count++;
      formatPerformance[fmt].clicks += e.clicks;
      formatPerformance[fmt].impressions += e.impressions;
    });
    
    const formatLines = Object.entries(formatPerformance)
      .sort(([, a], [, b]) => b.spend - a.spend)
      .map(([fmt, stats]) => {
        const fmtROAS = stats.spend > 0 ? stats.revenue / stats.spend : 0;
        const fmtCTR = stats.impressions > 0 ? (stats.clicks / stats.impressions * 100) : 0;
        return `- ${fmt}: ${stats.count} entities, €${stats.spend.toFixed(0)} spend, ${fmtROAS.toFixed(2)}x ROAS, ${fmtCTR.toFixed(2)}% CTR`;
      }).join('\n');

    // Aggregate by persona if any
    const personaPerformance: Record<string, { spend: number; revenue: number; count: number; clicks: number; impressions: number }> = {};
    enrichedEntities.filter(e => e.persona).forEach(e => {
      const p = e.persona!;
      if (!personaPerformance[p]) personaPerformance[p] = { spend: 0, revenue: 0, count: 0, clicks: 0, impressions: 0 };
      personaPerformance[p].spend += e.spend;
      personaPerformance[p].revenue += e.revenue;
      personaPerformance[p].count++;
      personaPerformance[p].clicks += e.clicks;
      personaPerformance[p].impressions += e.impressions;
    });
    
    const personaLines = Object.entries(personaPerformance).length > 0
      ? '\n### BY PERSONA\n' + Object.entries(personaPerformance)
          .sort(([, a], [, b]) => b.spend - a.spend)
          .map(([persona, stats]) => {
            const pROAS = stats.spend > 0 ? stats.revenue / stats.spend : 0;
            const pCTR = stats.impressions > 0 ? (stats.clicks / stats.impressions * 100) : 0;
            return `- ${persona}: ${stats.count} creatives, €${stats.spend.toFixed(0)} spend, ${pROAS.toFixed(2)}x ROAS, ${pCTR.toFixed(2)}% CTR`;
          }).join('\n')
      : '';

    // Count ad groups per campaign for single-ad-group detection
    const campaignAdGroupCounts: Record<string, Set<string>> = {};
    enrichedEntities.forEach(e => {
      if (e.entity_type === 'ad_group' && e.campaign_id) {
        if (!campaignAdGroupCounts[e.campaign_id]) campaignAdGroupCounts[e.campaign_id] = new Set();
        campaignAdGroupCounts[e.campaign_id].add(e.id);
      }
    });
    const singleAdGroupCampaigns = Object.entries(campaignAdGroupCounts)
      .filter(([, adGroups]) => adGroups.size === 1)
      .map(([campaignId]) => campaignId);
    
    const singleAdGroupNote = singleAdGroupCampaigns.length > 0
      ? `\n⚠️ NOTE: ${singleAdGroupCampaigns.length} campaign(s) have only ONE ad group - ad group insights redundant with campaign level for these.`
      : '';

    return `## ENTITY BREAKDOWN (${enrichedEntities.length} entities)
${concentrationWarning}${singleAdGroupNote}

### BY CREATIVE CATEGORY (IMPORTANT - Analyze this!)
${categoryLines}

### BY FORMAT (Static vs Video - IMPORTANT!)
${formatLines}
${personaLines}

### INDIVIDUAL ENTITIES (top 15 by spend)
${entityLines}`;
  };

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

${buildEntitySection()}

## DAILY BREAKDOWN (most recent 7 days)
${data.timeseries.slice(-7).map(e => 
  `${e.date}: Spend €${e.spend.toFixed(2)}, Revenue €${e.revenue.toFixed(2)}, ROAS ${e.roas.toFixed(2)}x, CTR ${e.ctr.toFixed(2)}%, CPM €${e.cpm.toFixed(2)}, Checkouts ${e.checkouts}${e.frequency ? `, Freq ${e.frequency.toFixed(2)}` : ''}${e.has_attribution_lag ? ' [ATTRIBUTION LAG]' : ''}`
).join('\n')}

Provide your analysis as a JSON object with "insights" array and "summary" string.
IMPORTANT: Include specific recommendations for individual ads/creatives when entity data is provided. Identify which specific ads to kill, scale, or test based on their relative performance.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
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
    
    // Normalize insight levels to expected values (fix AI variations like "Account", "Ad Group", etc.)
    const normalizeLevel = (level: string): "account" | "campaign" | "ad_group" | "ad" => {
      const l = (level || "").toLowerCase().trim();
      if (l === "account" || l === "total" || l === "overall") return "account";
      if (l === "campaign" || l === "campaigns") return "campaign";
      if (l === "ad_group" || l === "adgroup" || l === "ad group" || l === "ad groups" || l === "ad_groups") return "ad_group";
      if (l === "ad" || l === "ads" || l === "creative" || l === "creatives" || l === "pin" || l === "pin_promotion") return "ad";
      // Default to campaign if truly unknown
      console.warn(`[ads-decision-insights] Unknown level "${level}", defaulting to campaign`);
      return "campaign";
    };
    
    const normalizedInsights = (parsed.insights || []).map((insight: any) => ({
      ...insight,
      level: normalizeLevel(insight.level),
    }));
    
    return {
      insights: normalizedInsights,
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
  // Create a simple hash based on key metrics including entity count
  const entitySummary = data.entities?.length 
    ? { count: data.entities.length, topSpend: data.entities[0]?.spend || 0 }
    : null;
    
  const hashInput = JSON.stringify({
    spend: data.totals.spend,
    revenue: data.totals.revenue,
    checkouts: data.totals.checkouts,
    days: data.timeseries.length,
    entities: entitySummary,
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
