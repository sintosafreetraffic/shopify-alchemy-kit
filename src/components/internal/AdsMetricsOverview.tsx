/**
 * AdsMetricsOverview - AI-Powered Diagnostic Metrics Health Analysis
 * 
 * Provides per-metric health status, trend, and confidence without prescriptive actions.
 * Attribution lag aware, learning phase safe, and low-volume tolerant.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { AdsReportingData } from "@/hooks/useAdsReporting";
import { toast } from "sonner";

const BREAK_EVEN_ROAS_STORAGE_KEY = "risebynight:break_even_roas:v1";

function getStoredBreakEvenRoas(): number {
  try {
    const stored = localStorage.getItem(BREAK_EVEN_ROAS_STORAGE_KEY);
    if (stored) {
      const val = parseFloat(stored);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {}
  return 1.54;
}

interface AdsMetricsOverviewProps {
  data: AdsReportingData;
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

function getTrendIcon(trend: "up" | "down" | "flat") {
  switch (trend) {
    case "up":
      return TrendingUp;
    case "down":
      return TrendingDown;
    case "flat":
    default:
      return Minus;
  }
}

function getTrendColor(trend: "up" | "down" | "flat", metricKey: string) {
  // For most metrics, up is good. For CPM, CPC, CPA - down is good
  const invertedMetrics = ["CPM", "CPC", "CPA"];
  const isInverted = invertedMetrics.includes(metricKey);
  
  if (trend === "flat") return "text-muted-foreground";
  
  if (isInverted) {
    return trend === "down" ? "text-emerald-500" : "text-amber-500";
  }
  return trend === "up" ? "text-emerald-500" : "text-amber-500";
}

function getStatusColor(status: "healthy" | "watch" | "critical") {
  switch (status) {
    case "healthy":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    case "watch":
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case "critical":
      return "bg-red-500/10 text-red-500 border-red-500/30";
  }
}

function getStatusIcon(status: "healthy" | "watch" | "critical") {
  switch (status) {
    case "healthy":
      return CheckCircle;
    case "watch":
      return Clock;
    case "critical":
      return AlertTriangle;
  }
}

function getConfidenceBadge(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return { label: "High", className: "bg-emerald-500/20 text-emerald-500" };
    case "medium":
      return { label: "Med", className: "bg-amber-500/20 text-amber-500" };
    case "low":
      return { label: "Low", className: "bg-muted text-muted-foreground" };
  }
}

function formatValue(metric: string, value: number | string): string {
  if (typeof value === "string") return value;
  
  switch (metric) {
    case "ROAS":
      return `${value.toFixed(2)}x`;
    case "CPA":
    case "CPM":
    case "CPC":
      return `€${value.toFixed(2)}`;
    case "CTR":
    case "Conversion Rate":
    case "Add-to-Cart Rate":
      return `${value.toFixed(2)}%`;
    default:
      return value.toFixed(2);
  }
}

export function AdsMetricsOverview({ data }: AdsMetricsOverviewProps) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDataHash, setLastDataHash] = useState<string>("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const breakEvenRoas = getStoredBreakEvenRoas();

  // Simple hash for change detection
  const dataHash = JSON.stringify({
    spend: data.totals.spend,
    revenue: data.totals.revenue,
    checkouts: data.totals.checkouts,
    days: data.timeseries.length,
    breakEvenRoas,
  });

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        "ads-metrics-overview",
        {
          body: {
            totals: data.totals,
            timeseries: data.timeseries,
            breakEvenRoas,
            minSpendThreshold: 200,
            attributionLagDays: 2,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setOverview(responseData as OverviewResponse);
      setLastDataHash(dataHash);
      setInitialLoadDone(true);

      if (responseData.fromCache) {
        console.log("[AdsMetricsOverview] Loaded from cache");
      }
    } catch (err) {
      console.error("Failed to fetch metrics overview:", err);
      const message = err instanceof Error ? err.message : "Failed to generate overview";
      setError(message);

      if (message.includes("rate limit") || message.includes("429")) {
        toast.error("Rate limit exceeded. Please wait a moment.");
      } else if (message.includes("402") || message.includes("credits")) {
        toast.error("AI credits exhausted.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [data, dataHash, breakEvenRoas]);

  // Auto-load on mount
  useEffect(() => {
    if (data.totals.spend > 0 && !initialLoadDone && !isLoading) {
      fetchOverview();
    }
  }, [data.totals.spend, initialLoadDone, isLoading, fetchOverview]);

  const isStale = overview && dataHash !== lastDataHash;

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            Analyzing Metrics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state with retry
  if (error && !overview) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Metrics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <span className="text-sm text-muted-foreground">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchOverview}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data yet
  if (!overview) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Metrics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">
              {data.totals.spend === 0
                ? "No spend data available"
                : "Click to analyze metric health"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOverview}
              disabled={data.totals.spend === 0}
            >
              <Activity className="h-4 w-4 mr-1" />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Metrics Overview
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              Diagnostic
            </Badge>
            {overview.isLearningPhase && (
              <Badge variant="outline" className="ml-1 text-xs font-normal bg-amber-500/10 text-amber-600 border-amber-500/30">
                Learning Phase
              </Badge>
            )}
            {isStale && (
              <Badge variant="outline" className="ml-1 text-xs font-normal bg-amber-500/10 text-amber-600 border-amber-500/30">
                Data changed
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchOverview} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banners */}
        {overview.warnings.map((warning, idx) => (
          <Alert key={idx} className="bg-amber-500/5 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs text-amber-600">
              {warning}
            </AlertDescription>
          </Alert>
        ))}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {overview.metrics.map((metric) => {
            const TrendIcon = getTrendIcon(metric.trend);
            const StatusIcon = getStatusIcon(metric.status);
            const trendColor = getTrendColor(metric.trend, metric.metric);
            const statusColor = getStatusColor(metric.status);
            const confidenceBadge = getConfidenceBadge(metric.confidence);

            return (
              <div
                key={metric.metric}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  statusColor
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                    {metric.metric}
                  </span>
                  <StatusIcon className="h-3 w-3" />
                </div>

                <div className="flex items-center gap-1 mb-1">
                  <span className="text-lg font-bold">
                    {formatValue(metric.metric, metric.value)}
                  </span>
                  <TrendIcon className={cn("h-4 w-4", trendColor)} />
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <Badge variant="outline" className={cn("text-[10px] px-1 py-0", confidenceBadge.className)}>
                    {confidenceBadge.label}
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {metric.explanation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-right">
          Analyzed {new Date(overview.generatedAt).toLocaleTimeString()}
          {overview.fromCache && " (cached)"}
        </p>
      </CardContent>
    </Card>
  );
}
