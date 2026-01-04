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

function generateExplanation(
  metricKey: string,
  displayName: string,
  value: number | string,
  trend: "up" | "down" | "flat",
  status: "healthy" | "watch" | "critical",
  confidence: "high" | "medium" | "low",
  isConversionMetric: boolean,
  breakEvenRoas: number
): string {
  const trendWord = trend === "up" ? "rising" : trend === "down" ? "declining" : "stable";
  const confidenceNote = confidence === "low" ? " (low data volume)" : "";
  const lagNote = isConversionMetric && confidence !== "high" ? " Attribution lag may affect recent data." : "";
  
  switch (metricKey) {
    case "roas":
      if (status === "healthy") {
        return `ROAS ${trendWord} above break-even (${breakEvenRoas.toFixed(2)}x).${confidenceNote}`;
      } else if (status === "watch") {
        return `ROAS ${trendWord} near break-even threshold.${lagNote}${confidenceNote}`;
      } else {
        return `ROAS below break-even (${breakEvenRoas.toFixed(2)}x). ${trendWord}.${lagNote}${confidenceNote}`;
      }
      
    case "cpa":
      if (status === "healthy") {
        return `CPA ${trendWord}, within target range.${confidenceNote}`;
      } else if (status === "watch") {
        return `CPA ${trendWord}, approaching efficiency threshold.${lagNote}${confidenceNote}`;
      } else {
        return `CPA elevated, exceeds target threshold.${lagNote}${confidenceNote}`;
      }
      
    case "ctr":
      if (status === "healthy") {
        return `CTR ${trendWord} at ${typeof value === "number" ? value.toFixed(2) : value}%, above benchmark.${confidenceNote}`;
      } else if (status === "watch") {
        return `CTR ${trendWord}, slightly below platform average.${confidenceNote}`;
      } else {
        return `CTR needs attention at ${typeof value === "number" ? value.toFixed(2) : value}%, below benchmark.${confidenceNote}`;
      }
      
    case "cpm":
      if (status === "healthy") {
        return `CPM efficient at €${typeof value === "number" ? value.toFixed(2) : value}, ${trendWord}.${confidenceNote}`;
      } else if (status === "watch") {
        return `CPM ${trendWord}, approaching threshold.${confidenceNote}`;
      } else {
        return `CPM elevated, may impact efficiency.${confidenceNote}`;
      }
      
    case "cpc":
      if (status === "healthy") {
        return `CPC efficient at €${typeof value === "number" ? value.toFixed(2) : value}, ${trendWord}.${confidenceNote}`;
      } else if (status === "watch") {
        return `CPC ${trendWord}, near threshold.${confidenceNote}`;
      } else {
        return `CPC elevated, affecting efficiency.${confidenceNote}`;
      }
      
    case "frequency":
      if (status === "healthy") {
        return `Frequency healthy at ${typeof value === "number" ? value.toFixed(1) : value}, no fatigue risk.${confidenceNote}`;
      } else if (status === "watch") {
        return `Frequency ${trendWord}, monitor for ad fatigue.${confidenceNote}`;
      } else {
        return `High frequency may cause ad fatigue.${confidenceNote}`;
      }
      
    case "conversionRate":
      if (status === "healthy") {
        return `Conversion rate ${trendWord} at ${typeof value === "number" ? value.toFixed(2) : value}%.${confidenceNote}`;
      } else if (status === "watch") {
        return `Conversion rate ${trendWord}, slightly below target.${lagNote}${confidenceNote}`;
      } else {
        return `Conversion rate needs improvement.${lagNote}${confidenceNote}`;
      }
      
    case "atcRate":
      if (status === "healthy") {
        return `Add-to-cart rate ${trendWord} at ${typeof value === "number" ? value.toFixed(2) : value}%.${confidenceNote}`;
      } else if (status === "watch") {
        return `Add-to-cart rate ${trendWord}, approaching threshold.${lagNote}${confidenceNote}`;
      } else {
        return `Add-to-cart rate below benchmark.${lagNote}${confidenceNote}`;
      }
      
    default:
      return `${displayName} ${trendWord}.${confidenceNote}`;
  }
}

async function polishExplanationWithAI(explanation: string, metricName: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return explanation; // Fallback to original
    }
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a concise ads metrics analyst. Rewrite the explanation to be clearer and more natural. Keep it under 20 words. Do not recommend actions. Output only the rewritten explanation, nothing else."
          },
          {
            role: "user",
            content: `Metric: ${metricName}\nOriginal: ${explanation}`
          }
        ],
        max_tokens: 60,
      }),
    });
    
    if (!response.ok) {
      log("warn", "AI polish failed", { status: response.status });
      return explanation;
    }
    
    const data = await response.json();
    const polished = data.choices?.[0]?.message?.content?.trim();
    
    return polished && polished.length > 0 && polished.length < 150 ? polished : explanation;
  } catch (err) {
    log("warn", "AI polish error", { error: err instanceof Error ? err.message : String(err) });
    return explanation;
  }
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
    
    // Process each metric
    const metricsResults: MetricResult[] = [];
    
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
        metricsResults.push({
          metric: config.displayName,
          value: "N/A",
          trend: "flat",
          status: "watch",
          confidence: "low",
          explanation: `${config.displayName} data not available or zero.`,
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
      
      const explanation = generateExplanation(
        config.key,
        config.displayName,
        config.value,
        trend,
        status,
        finalConfidence,
        isConversionMetric,
        breakEvenRoas
      );
      
      // Format value for display
      let displayValue: number | string = config.value;
      if (config.format === "currency") {
        displayValue = config.value;
      } else if (config.format === "percent") {
        displayValue = config.value;
      } else if (config.format === "multiplier") {
        displayValue = config.value;
      }
      
      metricsResults.push({
        metric: config.displayName,
        value: displayValue,
        trend,
        status,
        confidence: finalConfidence,
        explanation,
      });
    }
    
    // Polish explanations with AI (batch for efficiency, limit to avoid rate limits)
    const polishPromises = metricsResults.slice(0, 4).map(async (result, idx) => {
      const polished = await polishExplanationWithAI(result.explanation, result.metric);
      metricsResults[idx].explanation = polished;
    });
    
    await Promise.all(polishPromises);
    
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
