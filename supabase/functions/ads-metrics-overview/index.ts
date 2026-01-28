import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants
const TINY = 0.0001; // For safe division
const CACHE_TTL_HOURS = 6;
const CACHE_VERSION = "v1";

// Default thresholds
const DEFAULT_MIN_SPEND_THRESHOLD = 200; // EUR
const DEFAULT_ATTRIBUTION_LAG_DAYS = 2;

// Platform benchmarks (Pinterest norms)
const BENCHMARKS = {
  ctr: { healthy: 0.8, watch: 0.5 }, // >= 0.8% healthy, 0.5-0.79% watch, < 0.5% critical
  cpm: { healthy: 12, watch: 18 }, // <= 12 healthy, 12-18 watch, > 18 critical
  cpc: { healthy: 0.8, watch: 1.2 }, // <= 0.80 healthy, 0.81-1.20 watch, > 1.20 critical
  frequency: { healthy: 2.5, watch: 4.0 }, // < 2.5 healthy, 2.5-4.0 watch, > 4.0 critical
  conversionRate: { healthy: 2.0, watch: 1.0 }, // >= 2% healthy, 1-1.99% watch, < 1% critical
  atcRate: { healthy: 3.0, watch: 2.0 }, // >= 3% healthy, 2-2.99% watch, < 2% critical
};

interface Totals {
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  checkouts: number;
  add_to_carts: number;
  add_to_cart_rate: number;
  conversion_rate: number;
}

interface TimeseriesEntry {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  checkouts: number;
  add_to_carts: number;
  add_to_cart_rate: number;
  conversion_rate: number;
  has_attribution_lag?: boolean;
}

interface RequestBody {
  totals: Totals;
  timeseries: TimeseriesEntry[];
  breakEvenRoas: number;
  minSpendThreshold?: number;
  attributionLagDays?: number;
}

interface MetricResult {
  metric: string;
  value: number | string;
  trend: "up" | "down" | "flat";
  status: "healthy" | "watch" | "critical";
  confidence: "high" | "medium" | "low";
  explanation: string;
}

interface OverviewResponse {
  isLearningPhase: boolean;
  warnings: string[];
  metrics: MetricResult[];
  generatedAt: string;
  fromCache: boolean;
}

// Conversion-based metrics that need lag exclusion
const CONVERSION_METRICS = ["revenue", "roas", "cpa", "conversionRate", "checkouts", "atcRate"];

function log(level: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
}

function generateCacheKey(body: RequestBody): string {
  const hash = JSON.stringify({
    totals: body.totals,
    timeseriesLength: body.timeseries.length,
    timeseriesHash: body.timeseries.slice(0, 3).map(t => `${t.date}:${t.spend}`).join(","),
    breakEvenRoas: body.breakEvenRoas,
    minSpendThreshold: body.minSpendThreshold,
    attributionLagDays: body.attributionLagDays,
  });
  
  // Simple hash
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = ((hashValue << 5) - hashValue) + char;
    hashValue = hashValue & hashValue;
  }
  
  return `${CACHE_VERSION}_${Math.abs(hashValue).toString(36)}`;
}

function computeTrend(
  values: number[],
  attributionLagDays: number,
  isConversionMetric: boolean
): { trend: "up" | "down" | "flat"; canCompute: boolean } {
  // Exclude attribution lag days for conversion metrics
  const effectiveValues = isConversionMetric 
    ? values.slice(0, -attributionLagDays || values.length)
    : values;
  
  if (effectiveValues.length < 6) {
    return { trend: "flat", canCompute: false };
  }
  
  // Last 3 complete days vs prior 3 days
  const recentWindow = effectiveValues.slice(-3);
  const priorWindow = effectiveValues.slice(-6, -3);
  
  const recentAvg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;
  const priorAvg = priorWindow.reduce((a, b) => a + b, 0) / priorWindow.length;
  
  const pctChange = (recentAvg - priorAvg) / Math.max(priorAvg, TINY);
  
  if (pctChange > 0.10) return { trend: "up", canCompute: true };
  if (pctChange < -0.10) return { trend: "down", canCompute: true };
  return { trend: "flat", canCompute: true };
}

function computeStatus(
  metricKey: string,
  value: number,
  breakEvenRoas: number,
  aov: number | null,
  isLearningPhase: boolean
): "healthy" | "watch" | "critical" {
  let status: "healthy" | "watch" | "critical";
  
  switch (metricKey) {
    case "roas":
      if (value >= breakEvenRoas * 1.2) status = "healthy";
      else if (value >= breakEvenRoas * 0.9) status = "watch";
      else status = "critical";
      break;
      
    case "cpa":
      if (aov !== null && aov > 0) {
        const targetCPA = aov / breakEvenRoas;
        if (value <= targetCPA * 1.1) status = "healthy";
        else if (value <= targetCPA * 1.3) status = "watch";
        else status = "critical";
      } else {
        status = "watch"; // Can't compute without AOV
      }
      break;
      
    case "ctr":
      if (value >= BENCHMARKS.ctr.healthy) status = "healthy";
      else if (value >= BENCHMARKS.ctr.watch) status = "watch";
      else status = "critical";
      break;
      
    case "cpm":
      if (value <= BENCHMARKS.cpm.healthy) status = "healthy";
      else if (value <= BENCHMARKS.cpm.watch) status = "watch";
      else status = "critical";
      break;
      
    case "cpc":
      if (value <= BENCHMARKS.cpc.healthy) status = "healthy";
      else if (value <= BENCHMARKS.cpc.watch) status = "watch";
      else status = "critical";
      break;
      
    case "frequency":
      if (value < BENCHMARKS.frequency.healthy) status = "healthy";
      else if (value <= BENCHMARKS.frequency.watch) status = "watch";
      else status = "critical";
      break;
      
    case "conversionRate":
      if (value >= BENCHMARKS.conversionRate.healthy) status = "healthy";
      else if (value >= BENCHMARKS.conversionRate.watch) status = "watch";
      else status = "critical";
      break;
      
    case "atcRate":
      if (value >= BENCHMARKS.atcRate.healthy) status = "healthy";
      else if (value >= BENCHMARKS.atcRate.watch) status = "watch";
      else status = "critical";
      break;
      
    default:
      status = "watch";
  }
  
  // Soften during learning phase: downgrade healthy to watch
  if (isLearningPhase && status === "healthy") {
    status = "watch";
  }
  
  return status;
}

function computeConfidence(
  totalSpend: number,
  totalCheckouts: number,
  completeDaysCount: number,
  minSpendThreshold: number,
  isLearningPhase: boolean,
  canComputeTrend: boolean
): "high" | "medium" | "low" {
  // Low if any of these are true
  if (totalSpend < minSpendThreshold || totalCheckouts < 5 || completeDaysCount < 6 || !canComputeTrend) {
    return "low";
  }
  
  // Medium if learning phase or moderate data
  if (completeDaysCount < 10 || totalCheckouts < 15 || isLearningPhase) {
    return "medium";
  }
  
  // High otherwise
  return "high";
}

// Old generateExplanation removed - now using generateEnhancedExplanationWithAI

interface MetricContext {
  key: string;
  displayName: string;
  value: number;
  trend: "up" | "down" | "flat";
  status: "healthy" | "watch" | "critical";
}

async function generateEnhancedExplanationWithAI(
  metric: MetricContext,
  allMetrics: MetricContext[],
  breakEvenRoas: number,
  isLearningPhase: boolean,
  confidence: "high" | "medium" | "low"
): Promise<string> {
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return generateFallbackExplanation(metric, allMetrics, breakEvenRoas, confidence);
    }
    
    // Build context about all metrics for cross-comparison
    const metricsContext = allMetrics.map(m => 
      `${m.displayName}: ${m.value.toFixed(2)} (${m.status}, ${m.trend})`
    ).join("; ");
    
    // Identify related metrics for comparison
    const relatedInsights = getRelatedMetricInsights(metric, allMetrics);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Pinterest Ads performance analyst. Generate a helpful, actionable insight for the given metric.

RULES:
- Write 2-3 sentences (40-60 words)
- First sentence: describe the current state and trend
- Second sentence: compare with related metrics if relevant
- Third sentence: give ONE specific suggestion for improvement (if status is watch/critical)
- Be direct and actionable
- Reference break-even ROAS of ${breakEvenRoas.toFixed(2)}x when relevant
- If confidence is low, mention data is still accumulating
${isLearningPhase ? "- Account is in learning phase, be cautious with conclusions" : ""}

Output only the insight text, nothing else.`
          },
          {
            role: "user",
            content: `Metric: ${metric.displayName}
Value: ${metric.value.toFixed(2)}
Status: ${metric.status}
Trend: ${metric.trend}
Confidence: ${confidence}

All metrics context: ${metricsContext}

Related observations: ${relatedInsights}`
          }
        ],
        max_tokens: 150,
      }),
    });
    
    if (!response.ok) {
      log("warn", "AI enhanced explanation failed", { status: response.status });
      return generateFallbackExplanation(metric, allMetrics, breakEvenRoas, confidence);
    }
    
    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();
    
    return enhanced && enhanced.length > 20 && enhanced.length < 300 
      ? enhanced 
      : generateFallbackExplanation(metric, allMetrics, breakEvenRoas, confidence);
  } catch (err) {
    log("warn", "AI enhanced explanation error", { error: err instanceof Error ? err.message : String(err) });
    return generateFallbackExplanation(metric, allMetrics, breakEvenRoas, confidence);
  }
}

function getRelatedMetricInsights(metric: MetricContext, allMetrics: MetricContext[]): string {
  const insights: string[] = [];
  const metricsMap = Object.fromEntries(allMetrics.map(m => [m.key, m]));
  
  // Cross-metric comparisons
  switch (metric.key) {
    case "roas":
      if (metricsMap.cpa?.status === "critical") {
        insights.push("CPA is high which may explain ROAS pressure");
      }
      if (metricsMap.conversionRate?.status === "critical") {
        insights.push("Low conversion rate is impacting ROAS");
      }
      if (metricsMap.ctr?.status === "healthy" && metricsMap.conversionRate?.status !== "healthy") {
        insights.push("Good CTR but conversion drop-off suggests landing page issues");
      }
      break;
      
    case "cpa":
      if (metricsMap.cpc?.trend === "up") {
        insights.push("Rising CPC is pushing up CPA");
      }
      if (metricsMap.conversionRate?.trend === "down") {
        insights.push("Declining conversion rate is inflating CPA");
      }
      break;
      
    case "ctr":
      if (metricsMap.cpm?.status === "healthy" && metric.status !== "healthy") {
        insights.push("Good CPM but low CTR suggests creative fatigue");
      }
      if (metricsMap.frequency?.value > 3) {
        insights.push("High frequency may be causing CTR decline");
      }
      break;
      
    case "cpm":
      if (metricsMap.ctr?.status === "healthy") {
        insights.push("Strong CTR justifies current CPM");
      }
      break;
      
    case "cpc":
      if (metricsMap.ctr?.trend === "down") {
        insights.push("Declining CTR is driving CPC higher");
      }
      if (metricsMap.cpm?.trend === "up" && metricsMap.ctr?.trend === "flat") {
        insights.push("Rising CPM with flat CTR is increasing CPC");
      }
      break;
      
    case "conversionRate":
      if (metricsMap.atcRate?.status === "healthy" && metric.status !== "healthy") {
        insights.push("Good ATC rate but checkout drop-off suggests cart abandonment");
      }
      if (metricsMap.ctr?.status === "healthy") {
        insights.push("Good CTR indicates audience match, conversion issue is post-click");
      }
      break;
      
    case "atcRate":
      if (metricsMap.ctr?.status === "healthy" && metric.status !== "healthy") {
        insights.push("Good CTR but low ATC suggests product page optimization needed");
      }
      if (metricsMap.conversionRate?.status === "critical") {
        insights.push("Both ATC and conversion are weak, review full funnel");
      }
      break;
  }
  
  return insights.length > 0 ? insights.join(". ") : "No specific cross-metric patterns detected";
}

function generateFallbackExplanation(
  metric: MetricContext,
  allMetrics: MetricContext[],
  breakEvenRoas: number,
  confidence: "high" | "medium" | "low"
): string {
  const trendWord = metric.trend === "up" ? "trending up" : metric.trend === "down" ? "trending down" : "stable";
  const confidenceNote = confidence === "low" ? " Data is still accumulating." : "";
  const relatedInsight = getRelatedMetricInsights(metric, allMetrics).split(".")[0];
  
  let base = "";
  let suggestion = "";
  
  switch (metric.key) {
    case "roas":
      base = metric.status === "healthy" 
        ? `ROAS at ${metric.value.toFixed(2)}x is ${trendWord} and above break-even (${breakEvenRoas.toFixed(2)}x).`
        : `ROAS at ${metric.value.toFixed(2)}x is ${trendWord}, ${metric.status === "critical" ? "below" : "near"} break-even (${breakEvenRoas.toFixed(2)}x).`;
      suggestion = metric.status !== "healthy" ? " Consider reviewing underperforming ads or adjusting targeting." : "";
      break;
    case "cpa":
      base = `CPA at €${metric.value.toFixed(2)} is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Try pausing high-CPA ads or narrowing audience." : "";
      break;
    case "ctr":
      base = `CTR at ${metric.value.toFixed(2)}% is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Test new creative variations or refine audience targeting." : "";
      break;
    case "cpm":
      base = `CPM at €${metric.value.toFixed(2)} is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Broaden targeting or review ad relevance." : "";
      break;
    case "cpc":
      base = `CPC at €${metric.value.toFixed(2)} is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Improve CTR with better creatives to lower CPC." : "";
      break;
    case "conversionRate":
      base = `Conversion rate at ${metric.value.toFixed(2)}% is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Review landing page experience and checkout flow." : "";
      break;
    case "atcRate":
      base = `Add-to-cart rate at ${metric.value.toFixed(2)}% is ${trendWord}.`;
      suggestion = metric.status === "critical" ? " Optimize product pages and pricing visibility." : "";
      break;
    default:
      base = `${metric.displayName} at ${metric.value.toFixed(2)} is ${trendWord}.`;
  }
  
  const crossMetricNote = relatedInsight && relatedInsight !== "No specific cross-metric patterns detected" 
    ? ` ${relatedInsight}.` 
    : "";
  
  return `${base}${crossMetricNote}${suggestion}${confidenceNote}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    const body: RequestBody = await req.json();
    const { 
      totals, 
      timeseries, 
      breakEvenRoas,
      minSpendThreshold = DEFAULT_MIN_SPEND_THRESHOLD,
      attributionLagDays = DEFAULT_ATTRIBUTION_LAG_DAYS,
    } = body;
    
    log("info", "ads-metrics-overview request", {
      spend: totals.spend,
      timeseriesDays: timeseries.length,
      breakEvenRoas,
    });
    
    // Initialize Supabase for caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check cache
    const cacheKey = generateCacheKey(body);
    const { data: cached } = await supabase
      .from("ads_decision_insights")
      .select("insights, created_at")
      .eq("data_hash", `metrics_${cacheKey}`)
      .gte("created_at", new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (cached) {
      log("info", "cache hit", { cacheKey });
      const cachedResponse = cached.insights as unknown as OverviewResponse;
      return new Response(JSON.stringify({ ...cachedResponse, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Compute learning phase
    const completeDaysCount = Math.max(0, timeseries.length - attributionLagDays);
    const totalCheckouts = totals.checkouts || 0;
    const isLearningPhase = 
      totals.spend < minSpendThreshold || 
      completeDaysCount < 7 || 
      totalCheckouts < 10;
    
    // Calculate AOV for CPA threshold
    const aov = totalCheckouts > 0 ? totals.revenue / totalCheckouts : null;
    
    // Build warnings
    const warnings: string[] = [];
    if (totals.spend < minSpendThreshold) {
      warnings.push("Learning phase: spend is still low so metric confidence is limited. Let data accumulate before judging.");
    }
    if (attributionLagDays > 0) {
      warnings.push(`Conversion data for the last ${attributionLagDays} days may be incomplete due to attribution lag. Use trends rather than recent absolutes.`);
    }
    
    // Define metrics to analyze
    const metricsConfig = [
      { key: "roas", displayName: "ROAS", value: totals.roas, timeseriesKey: "roas", format: "multiplier" },
      { key: "cpa", displayName: "CPA", value: totals.cpa, timeseriesKey: "cpa", format: "currency" },
      { key: "ctr", displayName: "CTR", value: totals.ctr, timeseriesKey: "ctr", format: "percent" },
      { key: "cpm", displayName: "CPM", value: totals.cpm, timeseriesKey: "cpm", format: "currency" },
      { key: "cpc", displayName: "CPC", value: totals.cpc, timeseriesKey: "cpc", format: "currency" },
      { key: "conversionRate", displayName: "Conversion Rate", value: totals.conversion_rate, timeseriesKey: "conversion_rate", format: "percent" },
      { key: "atcRate", displayName: "Add-to-Cart Rate", value: totals.add_to_cart_rate, timeseriesKey: "add_to_cart_rate", format: "percent" },
    ];
    
    // First pass: compute all metrics with trends and status
    interface ProcessedMetric {
      config: typeof metricsConfig[0];
      trend: "up" | "down" | "flat";
      status: "healthy" | "watch" | "critical";
      confidence: "high" | "medium" | "low";
      value: number;
      isNA: boolean;
    }
    
    const processedMetrics: ProcessedMetric[] = [];
    
    for (const config of metricsConfig) {
      const isConversionMetric = CONVERSION_METRICS.includes(config.key);
      
      // Extract timeseries values for trend calculation
      const tsValues = timeseries.map(t => {
        const val = t[config.timeseriesKey as keyof TimeseriesEntry];
        return typeof val === "number" ? val : 0;
      });
      
      const { trend, canCompute } = computeTrend(tsValues, attributionLagDays, isConversionMetric);
      
      // Handle N/A case
      if (config.value === undefined || config.value === null || (config.value === 0 && config.key !== "cpa")) {
        processedMetrics.push({
          config,
          trend: "flat",
          status: "watch",
          confidence: "low",
          value: 0,
          isNA: true,
        });
        continue;
      }
      
      const status = computeStatus(config.key, config.value, breakEvenRoas, aov, isLearningPhase);
      const confidence = computeConfidence(
        totals.spend,
        totalCheckouts,
        completeDaysCount,
        minSpendThreshold,
        isLearningPhase,
        canCompute
      );
      
      // For conversion metrics, further limit confidence
      const finalConfidence = isConversionMetric && confidence === "high" && attributionLagDays > 0
        ? "medium"
        : confidence;
      
      processedMetrics.push({
        config,
        trend,
        status,
        confidence: finalConfidence,
        value: config.value,
        isNA: false,
      });
    }
    
    // Build context for cross-metric comparisons
    const allMetricsContext: MetricContext[] = processedMetrics
      .filter(p => !p.isNA)
      .map(p => ({
        key: p.config.key,
        displayName: p.config.displayName,
        value: p.value,
        trend: p.trend,
        status: p.status,
      }));
    
    // Second pass: generate enhanced explanations with cross-metric insights
    const metricsResults: MetricResult[] = [];
    
    for (const processed of processedMetrics) {
      if (processed.isNA) {
        metricsResults.push({
          metric: processed.config.displayName,
          value: "N/A",
          trend: "flat",
          status: "watch",
          confidence: "low",
          explanation: `${processed.config.displayName} data not available or zero.`,
        });
        continue;
      }
      
      const metricContext: MetricContext = {
        key: processed.config.key,
        displayName: processed.config.displayName,
        value: processed.value,
        trend: processed.trend,
        status: processed.status,
      };
      
      // Generate enhanced explanation with AI (includes cross-metric insights and suggestions)
      const explanation = await generateEnhancedExplanationWithAI(
        metricContext,
        allMetricsContext,
        breakEvenRoas,
        isLearningPhase,
        processed.confidence
      );
      
      metricsResults.push({
        metric: processed.config.displayName,
        value: processed.value,
        trend: processed.trend,
        status: processed.status,
        confidence: processed.confidence,
        explanation,
      });
    }
    
    const response: OverviewResponse = {
      isLearningPhase,
      warnings,
      metrics: metricsResults,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };
    
    // Cache result
    await supabase.from("ads_decision_insights").insert({
      data_hash: `metrics_${cacheKey}`,
      date_range_start: timeseries[0]?.date || new Date().toISOString().split("T")[0],
      date_range_end: timeseries[timeseries.length - 1]?.date || new Date().toISOString().split("T")[0],
      granularity: "DAY",
      level: "METRICS_OVERVIEW",
      insights: response as unknown as Record<string, unknown>,
      summary: `${metricsResults.filter(m => m.status === "healthy").length} healthy, ${metricsResults.filter(m => m.status === "critical").length} critical`,
    });
    
    log("info", "ads-metrics-overview complete", {
      duration: Date.now() - startTime,
      isLearningPhase,
      metricsCount: metricsResults.length,
    });
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    log("error", "ads-metrics-overview error", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
