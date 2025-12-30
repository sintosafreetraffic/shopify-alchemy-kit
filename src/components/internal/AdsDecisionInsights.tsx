/**
 * AdsDecisionInsights - Decision-focused insights for Pinterest Ads
 * 
 * Interprets metrics to answer:
 * - What should we scale?
 * - What is silently burning money?
 * - What is improving?
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Rocket, 
  Flame,
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdsReportingData, TimeseriesEntry } from "@/hooks/useAdsReporting";

interface AdsDecisionInsightsProps {
  data: AdsReportingData;
}

interface Insight {
  type: "scale" | "burn" | "improving" | "declining" | "info";
  title: string;
  description: string;
  metric?: string;
  severity: "high" | "medium" | "low";
}

function getInsightIcon(type: Insight["type"]) {
  switch (type) {
    case "scale":
      return Rocket;
    case "burn":
      return Flame;
    case "improving":
      return TrendingUp;
    case "declining":
      return TrendingDown;
    case "info":
    default:
      return Lightbulb;
  }
}

function getInsightColor(type: Insight["type"]) {
  switch (type) {
    case "scale":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    case "burn":
      return "text-red-500 bg-red-500/10 border-red-500/30";
    case "improving":
      return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    case "declining":
      return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    case "info":
    default:
      return "text-muted-foreground bg-muted/50 border-border";
  }
}

function calculateTrend(entries: TimeseriesEntry[], key: keyof TimeseriesEntry): "up" | "down" | "flat" {
  if (entries.length < 3) return "flat";
  
  // Filter out entries with attribution lag for more accurate trends
  const validEntries = entries.filter(e => !e.has_attribution_lag);
  if (validEntries.length < 3) return "flat";
  
  // Compare first half average to second half average
  const midpoint = Math.floor(validEntries.length / 2);
  const firstHalf = validEntries.slice(0, midpoint);
  const secondHalf = validEntries.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, e) => sum + (Number(e[key]) || 0), 0) / secondHalf.length;
  
  const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  
  if (changePercent > 10) return "up";
  if (changePercent < -10) return "down";
  return "flat";
}

function generateInsights(data: AdsReportingData): Insight[] {
  const insights: Insight[] = [];
  const { totals, timeseries } = data;
  
  // Filter out entries with attribution lag for analysis
  const validEntries = timeseries.filter(e => !e.has_attribution_lag);
  
  // ===== SCALE SIGNALS =====
  
  // High ROAS = scale signal
  if (totals.roas >= 2) {
    insights.push({
      type: "scale",
      title: "Strong ROAS - Consider Scaling",
      description: `Your ${totals.roas.toFixed(2)}x ROAS exceeds the 2x target. Consider increasing daily budget by 20-30% to capture more conversions.`,
      metric: `${totals.roas.toFixed(2)}x ROAS`,
      severity: "high",
    });
  } else if (totals.roas >= 1.5) {
    insights.push({
      type: "scale",
      title: "Profitable - Room to Scale",
      description: `${totals.roas.toFixed(2)}x ROAS is profitable. Test increasing budget on your best-performing days (check which weekdays convert best).`,
      metric: `${totals.roas.toFixed(2)}x ROAS`,
      severity: "medium",
    });
  }
  
  // Good ATC to Checkout ratio
  const atcToCheckoutRate = totals.add_to_carts > 0 
    ? (totals.checkouts / totals.add_to_carts) * 100 
    : 0;
  
  if (atcToCheckoutRate > 30 && totals.checkouts >= 3) {
    insights.push({
      type: "scale",
      title: "Strong Checkout Intent",
      description: `${atcToCheckoutRate.toFixed(0)}% of add-to-carts convert to checkout. Your landing page is working well.`,
      metric: `${atcToCheckoutRate.toFixed(0)}% ATC→Checkout`,
      severity: "medium",
    });
  }
  
  // ===== BURN SIGNALS =====
  
  // Low ROAS with significant spend
  if (totals.roas < 1 && totals.spend > 100) {
    insights.push({
      type: "burn",
      title: "Negative ROI - Review Strategy",
      description: `Spending €${totals.spend.toFixed(0)} with only ${totals.roas.toFixed(2)}x ROAS means you're losing money. Consider pausing underperforming campaigns or testing new creatives.`,
      metric: `€${(totals.spend - totals.revenue).toFixed(0)} loss`,
      severity: "high",
    });
  }
  
  // High CPM with low CTR
  if (totals.cpm > 10 && totals.ctr < 0.5) {
    insights.push({
      type: "burn",
      title: "Expensive, Low-Engagement Impressions",
      description: `€${totals.cpm.toFixed(2)} CPM with only ${totals.ctr.toFixed(2)}% CTR suggests creative fatigue or poor audience targeting. Refresh creatives or narrow targeting.`,
      metric: `€${totals.cpm.toFixed(2)} CPM, ${totals.ctr.toFixed(2)}% CTR`,
      severity: "medium",
    });
  }
  
  // High clicks but no conversions
  if (totals.clicks > 100 && totals.checkouts === 0 && totals.add_to_carts < 5) {
    insights.push({
      type: "burn",
      title: "Traffic Without Intent",
      description: `${totals.clicks} clicks but minimal add-to-carts. Traffic may be low-quality or the landing page isn't converting. Check audience and page experience.`,
      metric: `${totals.clicks} clicks, 0 checkouts`,
      severity: "high",
    });
  }
  
  // Low ATC to Checkout ratio
  if (atcToCheckoutRate < 10 && totals.add_to_carts >= 5) {
    insights.push({
      type: "burn",
      title: "Cart Abandonment Issue",
      description: `Only ${atcToCheckoutRate.toFixed(0)}% of add-to-carts complete checkout. Check for checkout friction, shipping costs, or trust signals.`,
      metric: `${atcToCheckoutRate.toFixed(0)}% completion`,
      severity: "medium",
    });
  }
  
  // ===== TREND SIGNALS =====
  
  const roasTrend = calculateTrend(timeseries, "roas");
  const ctrTrend = calculateTrend(timeseries, "ctr");
  const cpaTrend = calculateTrend(timeseries, "cpa");
  
  if (roasTrend === "up") {
    insights.push({
      type: "improving",
      title: "ROAS Trending Up",
      description: "Efficiency is improving over time. Whatever you changed recently is working - keep optimizing in that direction.",
      severity: "medium",
    });
  } else if (roasTrend === "down" && totals.roas < 1.5) {
    insights.push({
      type: "declining",
      title: "ROAS Declining",
      description: "Efficiency is decreasing. Could indicate creative fatigue, seasonal shifts, or increased competition. Review recent changes.",
      severity: "medium",
    });
  }
  
  if (ctrTrend === "up") {
    insights.push({
      type: "improving",
      title: "CTR Improving",
      description: "Click-through rate is increasing, suggesting better creative resonance or improved targeting.",
      severity: "low",
    });
  }
  
  if (cpaTrend === "down" && totals.checkouts > 0) {
    insights.push({
      type: "improving",
      title: "CPA Decreasing",
      description: "Cost per acquisition is going down - you're getting more efficient at driving conversions.",
      severity: "medium",
    });
  } else if (cpaTrend === "up" && totals.cpa > 100) {
    insights.push({
      type: "declining",
      title: "CPA Rising",
      description: `At €${totals.cpa.toFixed(0)} per checkout, acquisition cost is high and trending up. Review audience quality and conversion path.`,
      metric: `€${totals.cpa.toFixed(0)} CPA`,
      severity: "medium",
    });
  }
  
  // ===== CONTEXT SIGNALS =====
  
  // No conversions yet - provide context
  if (totals.checkouts === 0 && totals.add_to_carts === 0) {
    insights.push({
      type: "info",
      title: "Waiting for Conversion Data",
      description: "No conversions yet in this period. Pinterest attribution can lag 24-48h. If spend is recent, check back tomorrow.",
      severity: "low",
    });
  }
  
  // Low sample size warning
  if (validEntries.length < 5) {
    insights.push({
      type: "info",
      title: "Limited Data for Trends",
      description: `Only ${validEntries.length} days of complete data. Extend your date range for more reliable trend analysis.`,
      severity: "low",
    });
  }
  
  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return insights;
}

export function AdsDecisionInsights({ data }: AdsDecisionInsightsProps) {
  const insights = useMemo(() => generateInsights(data), [data]);
  
  if (insights.length === 0) {
    return null;
  }
  
  // Group insights by type
  const scaleInsights = insights.filter(i => i.type === "scale");
  const burnInsights = insights.filter(i => i.type === "burn");
  const trendInsights = insights.filter(i => i.type === "improving" || i.type === "declining");
  const infoInsights = insights.filter(i => i.type === "info");
  
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Decision Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Priority: Scale or Burn first */}
        {scaleInsights.length > 0 && (
          <div className="space-y-2">
            {scaleInsights.map((insight, idx) => (
              <InsightCard key={`scale-${idx}`} insight={insight} />
            ))}
          </div>
        )}
        
        {burnInsights.length > 0 && (
          <div className="space-y-2">
            {burnInsights.map((insight, idx) => (
              <InsightCard key={`burn-${idx}`} insight={insight} />
            ))}
          </div>
        )}
        
        {/* Trends */}
        {trendInsights.length > 0 && (
          <div className="space-y-2">
            {trendInsights.map((insight, idx) => (
              <InsightCard key={`trend-${idx}`} insight={insight} />
            ))}
          </div>
        )}
        
        {/* Info (lowest priority) */}
        {infoInsights.length > 0 && scaleInsights.length === 0 && burnInsights.length === 0 && (
          <div className="space-y-2">
            {infoInsights.map((insight, idx) => (
              <InsightCard key={`info-${idx}`} insight={insight} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = getInsightIcon(insight.type);
  const colorClass = getInsightColor(insight.type);
  
  return (
    <div className={cn(
      "p-3 rounded-lg border flex gap-3",
      colorClass
    )}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{insight.title}</span>
          {insight.metric && (
            <Badge variant="outline" className="text-xs font-mono">
              {insight.metric}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
      </div>
    </div>
  );
}
