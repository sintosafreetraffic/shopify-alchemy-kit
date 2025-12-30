/**
 * AdsDecisionInsights - AI-Powered Decision Intelligence for Pinterest Ads
 * 
 * Interprets metrics using AI to answer:
 * - What should we scale?
 * - What is silently burning money?
 * - What is improving or declining?
 * - What needs more data?
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Rocket, 
  Flame,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { AdsReportingData } from "@/hooks/useAdsReporting";
import { toast } from "sonner";

interface AdsDecisionInsightsProps {
  data: AdsReportingData;
  eqsScore?: number;
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

function getInsightIcon(type: DecisionInsight["type"]) {
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

function getInsightColor(type: DecisionInsight["type"]) {
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

function getConfidenceBadge(confidence: DecisionInsight["confidence"]) {
  switch (confidence) {
    case "high":
      return { label: "High confidence", className: "bg-emerald-500/20 text-emerald-500" };
    case "medium":
      return { label: "Medium confidence", className: "bg-amber-500/20 text-amber-500" };
    case "low":
      return { label: "Low confidence", className: "bg-muted text-muted-foreground" };
  }
}

export function AdsDecisionInsights({ data, eqsScore }: AdsDecisionInsightsProps) {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDataHash, setLastDataHash] = useState<string>("");

  // Create a simple hash of the data to detect changes
  const dataHash = JSON.stringify({
    spend: data.totals.spend,
    revenue: data.totals.revenue,
    checkouts: data.totals.checkouts,
    days: data.timeseries.length,
  });

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        "ads-decision-insights",
        {
          body: {
            totals: data.totals,
            timeseries: data.timeseries,
            range: data.range,
            level: data.level,
            attribution: data.attribution,
            eqs_score: eqsScore,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setInsights(responseData as AIInsightsResponse);
      setLastDataHash(dataHash);
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
      const message = err instanceof Error ? err.message : "Failed to generate insights";
      setError(message);
      
      if (message.includes("rate limit") || message.includes("429")) {
        toast.error("AI rate limit exceeded. Please wait a moment and try again.");
      } else if (message.includes("402") || message.includes("credits")) {
        toast.error("AI credits exhausted. Please add funds to continue.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [data, dataHash, eqsScore]);

  // Reset insights when data changes significantly (user must click to regenerate)
  useEffect(() => {
    if (dataHash !== lastDataHash && insights) {
      // Data changed, clear old insights so user can regenerate
      setInsights(null);
    }
  }, [dataHash, lastDataHash, insights]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Generating Decision Insights...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !insights) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Decision Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <span className="text-sm text-muted-foreground">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchInsights}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No insights yet
  if (!insights || insights.insights.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Decision Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">
              {data.totals.spend === 0 
                ? "No spend data available for analysis" 
                : "Click to generate AI-powered insights"}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchInsights}
              disabled={data.totals.spend === 0}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group insights by type
  const scaleInsights = insights.insights.filter(i => i.type === "scale");
  const burnInsights = insights.insights.filter(i => i.type === "burn");
  const trendInsights = insights.insights.filter(i => i.type === "improving" || i.type === "declining");
  const infoInsights = insights.insights.filter(i => i.type === "info");

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Decision Insights
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              AI-powered
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        {insights.summary && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {insights.summary}
          </p>
        )}
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
        {infoInsights.length > 0 && (
          <div className="space-y-2">
            {infoInsights.map((insight, idx) => (
              <InsightCard key={`info-${idx}`} insight={insight} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-right pt-2">
          Generated {new Date(insights.generated_at).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: DecisionInsight }) {
  const Icon = getInsightIcon(insight.type);
  const colorClass = getInsightColor(insight.type);
  const confidenceBadge = getConfidenceBadge(insight.confidence);
  
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
          <Badge variant="outline" className={cn("text-xs", confidenceBadge.className)}>
            {confidenceBadge.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{insight.explanation}</p>
        {insight.metric_reference && (
          <Badge variant="outline" className="text-xs font-mono mt-2">
            {insight.metric_reference}
          </Badge>
        )}
        {insight.recommended_action && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <span className="text-xs font-medium">Action: </span>
            <span className="text-xs">{insight.recommended_action}</span>
          </div>
        )}
      </div>
    </div>
  );
}
