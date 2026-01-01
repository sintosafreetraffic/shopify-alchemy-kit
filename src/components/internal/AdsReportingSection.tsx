import { useState } from "react";
import { useAdsReporting, Granularity, EntityMetrics, Level } from "@/hooks/useAdsReporting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye,
  ShoppingCart,
  Target,
  RefreshCw,
  Clock,
  AlertCircle,
  Info,
  BarChart3,
  Percent,
  Zap,
  AlertTriangle,
  Filter,
  Mail,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AdsDecisionInsights } from "./AdsDecisionInsights";
import { EntityPerformanceTable } from "./EntityPerformanceTable";
import { GenerateCreativesDialog } from "./GenerateCreativesDialog";


// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  format?: "currency" | "percent" | "number" | "multiplier";
  tooltip?: string;
  highlight?: "good" | "warning" | "bad" | "neutral";
}

function KPICard({ label, value, icon: Icon, format = "number", tooltip, highlight = "neutral" }: KPICardProps) {
  const formattedValue = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "percent":
        return `${value.toFixed(2)}%`;
      case "multiplier":
        return `${value.toFixed(2)}x`;
      default:
        return value.toLocaleString();
    }
  })();

  const highlightClasses = {
    good: "text-green-500",
    warning: "text-yellow-500",
    bad: "text-red-500",
    neutral: "text-foreground",
  };

  const card = (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("text-2xl font-bold", highlightClasses[highlight])}>{formattedValue}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
    );
  }

  return card;
}

// ============================================================================
// ROAS HIGHLIGHT HELPER
// ============================================================================

function getRoasHighlight(roas: number): "good" | "warning" | "bad" | "neutral" {
  if (roas >= 2) return "good";
  if (roas >= 1) return "warning";
  if (roas > 0) return "bad";
  return "neutral";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdsReportingSection() {
  const [sendingReport, setSendingReport] = useState(false);
  const [syncingAllLevels, setSyncingAllLevels] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateMode, setGenerateMode] = useState<"single" | "all">("all");
  const [selectedEntityForGenerate, setSelectedEntityForGenerate] = useState<EntityMetrics | undefined>();
  
  const {
    data,
    loading,
    error,
    refetch,
    forceRefresh,
    selectedPreset,
    setSelectedPreset,
    granularity,
    setGranularity,
    level,
    setLevel,
    datePresets,
    isStale,
    isCached,
    cachedAt,
    hasAttributionLagEntries,
    dataQualityPercent,
    apiLatencyMs,
    currency,
    activeOnlyCampaigns,
    setActiveOnlyCampaigns,
    activeOnlyAds,
    setActiveOnlyAds,
  } = useAdsReporting();

  // Send weekly report email
  const sendWeeklyReport = async () => {
    setSendingReport(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        "weekly-ads-report",
        { body: {} }
      );
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      toast.success("Weekly report sent to info.optiseek@gmail.com");
    } catch (err) {
      console.error("Failed to send report:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send report");
    } finally {
      setSendingReport(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = activeOnlyCampaigns || activeOnlyAds;

  const getRangeUTC = () => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - Math.max(selectedPreset.days - 1, 0));
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  };

  // Force-refresh ALL levels to the same "snapshot" so tab switching doesn't compare different cached payloads.
  // (Cache is per-level on the backend, so comparing cached values can yield small differences.)
  const syncAllLevels = async () => {
    if (syncingAllLevels) return;

    setSyncingAllLevels(true);
    try {
      const { start, end } = getRangeUTC();
      const levels: Level[] = ["ACCOUNT", "CAMPAIGN", "AD_GROUP", "PIN_PROMOTION"];
      const otherLevels = levels.filter((l) => l !== level);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const baseParams = {
        start_date: start,
        end_date: end,
        granularity,
        click_window_days: "30",
        view_window_days: "1",
        active_only_campaigns: activeOnlyCampaigns ? "true" : "false",
        active_only_ads: activeOnlyAds ? "true" : "false",
        force_refresh: "true",
      } as const;

      const warm = (lvl: Level) => {
        const params = new URLSearchParams({ ...baseParams, level: lvl });
        const url = `https://${projectId}.supabase.co/functions/v1/pinterest-ads-reporting?${params}`;
        return fetch(url, {
          headers: {
            "Content-Type": "application/json",
            apikey,
          },
        }).then(async (r) => {
          if (!r.ok) {
            const text = await r.text().catch(() => "");
            throw new Error(`Sync failed for ${lvl}: HTTP ${r.status} ${text}`);
          }
        });
      };

      // 1) Refresh current level (updates UI)
      // 2) Warm caches for the other levels in parallel (so switching tabs stays consistent)
      await Promise.all([forceRefresh(), ...otherLevels.map(warm)]);

      toast.success("Synced all levels (fresh snapshot)");
    } catch (err) {
      console.error("[AdsReportingSection] syncAllLevels failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to sync all levels");
    } finally {
      setSyncingAllLevels(false);
    }
  };

  // Format chart data
  const chartData = data?.timeseries.map((entry) => ({
    date: entry.date.slice(5), // MM-DD format
    fullDate: entry.date,
    Spend: entry.spend,
    Revenue: entry.revenue,
    ROAS: entry.roas,
    Checkouts: entry.checkouts,
    Clicks: entry.clicks,
    hasLag: entry.has_attribution_lag,
  })) || [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Ads Reporting</CardTitle>
              <CardDescription className="text-xs">
                Pinterest Ads performance • 30-day click / 1-day view • {currency}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Attribution Lag Badge - only show when there ARE entries with lag */}
            {data && hasAttributionLagEntries && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Last 2 days pending
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm font-medium mb-1">Attribution Lag (24-48h)</p>
                    <p className="text-xs text-muted-foreground">
                      Conversion data for the last 2 days may be incomplete due to Pinterest's attribution window. 
                      Use trends rather than recent absolutes for decisions.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}

            {/* Cache/Performance Info */}
            {cachedAt && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(cachedAt, { addSuffix: true })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm space-y-1">
                      <p>Cached: {cachedAt.toLocaleString()}</p>
                      {apiLatencyMs && <p>API latency: {apiLatencyMs}ms</p>}
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}

            {/* Generate Creatives for Winners Button */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGenerateMode("all");
                      setSelectedEntityForGenerate(undefined);
                      setGenerateDialogOpen(true);
                    }}
                    disabled={!data?.entities?.length}
                    className="h-8 w-8 p-0"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Generate creative briefs for winning entities</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>

            {/* Send Weekly Report Button */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendWeeklyReport}
                    disabled={sendingReport}
                    className="h-8 w-8 p-0"
                  >
                    {sendingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Send weekly report email</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>

            {/* Sync-all Levels Button */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={syncAllLevels}
                    disabled={loading || syncingAllLevels}
                    className="h-8 w-8 p-0"
                    aria-label="Sync all levels"
                  >
                    <Zap className={cn("h-4 w-4", syncingAllLevels && "animate-pulse")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Sync all levels (bypass cache) to eliminate tiny differences</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>

            {/* Refresh Button */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => forceRefresh()}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Force refresh (bypass cache)</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50 mt-3">
          {/* Date Presets */}
          <Tabs
            value={selectedPreset.days.toString()}
            onValueChange={(v) => {
              const preset = datePresets.find((p) => p.days.toString() === v);
              if (preset) setSelectedPreset(preset);
            }}
          >
            <TabsList className="h-8">
              {datePresets.map((preset) => (
                <TabsTrigger key={preset.days} value={preset.days.toString()} className="text-xs px-2 h-6">
                  {preset.label.replace("Last ", "")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Granularity */}
          <Tabs
            value={granularity}
            onValueChange={(v) => setGranularity(v as Granularity)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="DAY" className="text-xs px-2 h-6">Daily</TabsTrigger>
              <TabsTrigger value="WEEK" className="text-xs px-2 h-6">Weekly</TabsTrigger>
              <TabsTrigger value="MONTH" className="text-xs px-2 h-6">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Level */}
          <Tabs
            value={level}
            onValueChange={(v) => setLevel(v as "ACCOUNT" | "CAMPAIGN" | "AD_GROUP" | "PIN_PROMOTION")}
          >
            <TabsList className="h-8">
              <TabsTrigger value="ACCOUNT" className="text-xs px-2 h-6">Account</TabsTrigger>
              <TabsTrigger value="CAMPAIGN" className="text-xs px-2 h-6">Campaign</TabsTrigger>
              <TabsTrigger value="AD_GROUP" className="text-xs px-2 h-6">Ad Group</TabsTrigger>
              <TabsTrigger value="PIN_PROMOTION" className="text-xs px-2 h-6">Ad</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Separator */}
          <div className="h-6 w-px bg-border/50" />

          {/* Active-Only Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="active-campaigns"
                checked={activeOnlyCampaigns}
                onCheckedChange={setActiveOnlyCampaigns}
                className="h-4 w-7"
              />
              <Label htmlFor="active-campaigns" className="text-xs text-muted-foreground cursor-pointer">
                Active campaigns only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-ads"
                checked={activeOnlyAds}
                onCheckedChange={setActiveOnlyAds}
                className="h-4 w-7"
              />
              <Label htmlFor="active-ads" className="text-xs text-muted-foreground cursor-pointer">
                Active ads only
              </Label>
            </div>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Filter className="h-3 w-3" />
                Filtered
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error State */}
        {error && !data && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stale Data Warning */}
        {isStale && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Showing cached data from {cachedAt ? formatDistanceToNow(cachedAt, { addSuffix: true }) : "earlier"}.
              {data?.error && ` Reason: ${data.error}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Attribution Lag Warning */}
        {hasAttributionLagEntries && !isStale && (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              Conversion data for the last 2 days may be incomplete due to attribution lag. 
              Use trends rather than recent absolutes for decisions.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        )}

        {/* Data Display */}
        {data && data.totals && (
          <>
            {/* Filter Active Badge */}
            {hasActiveFilters && (
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Filter className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  Showing {activeOnlyCampaigns && "active campaigns"}{activeOnlyCampaigns && activeOnlyAds && " + "}{activeOnlyAds && "active ads"} only. 
                  Totals are recalculated based on {data.entities?.length ?? 0} entities.
                </AlertDescription>
              </Alert>
            )}

            {/* KPI Cards - Row 1: Profit Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Spend"
                value={data.totals.spend}
                icon={DollarSign}
                format="currency"
                tooltip="Total ad spend in selected period"
              />
              <KPICard
                label="Revenue"
                value={data.totals.revenue}
                icon={TrendingUp}
                format="currency"
                tooltip="Conversion value from Pinterest-attributed purchases"
              />
              <KPICard
                label="ROAS"
                value={data.totals.roas}
                icon={Target}
                format="multiplier"
                tooltip="Return on Ad Spend (Revenue / Spend). Target: 2x+"
                highlight={getRoasHighlight(data.totals.roas)}
              />
              <KPICard
                label="CPA"
                value={data.totals.cpa}
                icon={ShoppingCart}
                format="currency"
                tooltip="Cost per Acquisition (Spend / Checkouts)"
              />
            </div>

            {/* KPI Cards - Row 2: Traffic & Conversion */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Impressions"
                value={data.totals.impressions}
                icon={Eye}
                tooltip="Total ad impressions"
              />
              <KPICard
                label="Clicks"
                value={data.totals.clicks}
                icon={MousePointerClick}
                tooltip="Total link clicks"
              />
              <KPICard
                label="CTR"
                value={data.totals.ctr}
                icon={MousePointerClick}
                format="percent"
                tooltip="Click-through rate (Clicks / Impressions)"
              />
              <KPICard
                label="Checkouts"
                value={data.totals.checkouts}
                icon={ShoppingCart}
                tooltip="Pinterest-attributed checkout conversions"
              />
            </div>

            {/* KPI Cards - Row 3: Conversion Funnel (New) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Add to Carts"
                value={data.totals.add_to_carts}
                icon={ShoppingCart}
                tooltip="Pinterest-attributed add-to-cart events"
              />
              <KPICard
                label="ATC Rate"
                value={data.totals.add_to_cart_rate}
                icon={Percent}
                format="percent"
                tooltip="Add-to-cart rate (Add to Carts / Clicks)"
              />
              <KPICard
                label="Conversion Rate"
                value={data.totals.conversion_rate}
                icon={Zap}
                format="percent"
                tooltip="Checkout rate (Checkouts / Clicks)"
              />
              <KPICard
                label="CPM"
                value={data.totals.cpm}
                icon={Eye}
                format="currency"
                tooltip="Cost per 1,000 impressions"
              />
            </div>

            {/* Decision Insights */}
            <AdsDecisionInsights data={data} />

            {/* Conversion Warning - only if no checkouts AND no insights already cover it */}
            {data.totals.checkouts === 0 && data.totals.add_to_carts > 0 && (
              <Alert className="bg-muted/50 border-muted">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-sm text-muted-foreground">
                  No checkouts in this period. Conversion data may lag 24–48h.
                </AlertDescription>
              </Alert>
            )}

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Spend vs Revenue Chart */}
                <Card className="bg-card/30 border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Spend vs Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => `€${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number, name: string) => [
                            `€${value.toFixed(2)}`, 
                            name
                          ]}
                          labelFormatter={(label, payload) => {
                            const entry = payload?.[0]?.payload;
                            return entry?.hasLag ? `${entry.fullDate} ⚠️` : entry?.fullDate || label;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Spend"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="Revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* ROAS Chart */}
                <Card className="bg-card/30 border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">ROAS Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                          domain={[(dataMin: number) => Math.min(dataMin, 0) - 0.2, (dataMax: number) => Math.max(dataMax * 1.2, 3)]}
                          tickFormatter={(value) => `${value}x`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}x`, "ROAS"]}
                          labelFormatter={(label, payload) => {
                            const entry = payload?.[0]?.payload;
                            return entry?.hasLag ? `${entry.fullDate} ⚠️` : entry?.fullDate || label;
                          }}
                        />
                        <ReferenceLine 
                          y={2} 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          label={{ value: "2x target", position: "right", fontSize: 10 }}
                        />
                        <ReferenceLine 
                          y={1} 
                          stroke="hsl(var(--destructive))" 
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                        />
                        <Line
                          type="monotone"
                          dataKey="ROAS"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Checkouts Bar Chart */}
                <Card className="bg-card/30 border-border/30 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Daily Checkouts</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          stroke="hsl(var(--muted-foreground))"
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          labelFormatter={(label, payload) => {
                            const entry = payload?.[0]?.payload;
                            if (entry?.hasLag) {
                              return `${entry.fullDate} (may be incomplete)`;
                            }
                            return entry?.fullDate || label;
                          }}
                        />
                        <Bar
                          dataKey="Checkouts"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Entity Breakdown Tables */}
            {data.entities && data.entities.length > 0 && (
              <>
                {/* Campaign Performance Table - show when at ACCOUNT or CAMPAIGN level */}
                {(level === "ACCOUNT" || level === "CAMPAIGN") && (
                  <EntityPerformanceTable
                    entities={data.entities.filter(e => e.entity_type === "campaign")}
                    entityType="campaign"
                    showCampaignRef={false}
                    showPersona={true}
                    title="Campaign Performance"
                    onGenerateCreative={(entity) => {
                      setGenerateMode("single");
                      setSelectedEntityForGenerate(entity);
                      setGenerateDialogOpen(true);
                    }}
                  />
                )}

                {/* Ad Group Performance Table */}
                {level === "AD_GROUP" && (
                  <>
                    <EntityPerformanceTable
                      entities={data.entities.filter(e => e.entity_type === "ad_group")}
                      entityType="ad_group"
                      showCampaignRef={true}
                      showPersona={true}
                      title="Ad Group Performance"
                      onGenerateCreative={(entity) => {
                        setGenerateMode("single");
                        setSelectedEntityForGenerate(entity);
                        setGenerateDialogOpen(true);
                      }}
                    />
                  </>
                )}

                {/* Ad Performance Table */}
                {level === "PIN_PROMOTION" && (
                  <EntityPerformanceTable
                    entities={data.entities.filter(e => e.entity_type === "ad")}
                    entityType="ad"
                    showCampaignRef={true}
                    showPersona={true}
                    title="Ad Performance"
                    onGenerateCreative={(entity) => {
                      setGenerateMode("single");
                      setSelectedEntityForGenerate(entity);
                      setGenerateDialogOpen(true);
                    }}
                  />
                )}
              </>
            )}

            {chartData.length > 0 && (
              <Card className="bg-card/30 border-border/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-medium">Date</TableHead>
                          <TableHead className="text-xs font-medium text-right">Spend</TableHead>
                          <TableHead className="text-xs font-medium text-right">Revenue</TableHead>
                          <TableHead className="text-xs font-medium text-right">ROAS</TableHead>
                          <TableHead className="text-xs font-medium text-right">Clicks</TableHead>
                          <TableHead className="text-xs font-medium text-right">CTR</TableHead>
                          <TableHead className="text-xs font-medium text-right">Checkouts</TableHead>
                          <TableHead className="text-xs font-medium text-right">Conv Rate</TableHead>
                          <TableHead className="text-xs font-medium text-right">CPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.timeseries].reverse().map((entry) => (
                          <TableRow 
                            key={entry.date} 
                            className={cn(
                              "hover:bg-muted/20",
                              entry.has_attribution_lag && "bg-yellow-500/5"
                            )}
                          >
                            <TableCell className="text-xs font-medium">
                              <span className="flex items-center gap-1">
                                {entry.date}
                                {entry.has_attribution_lag && (
                                  <TooltipProvider>
                                    <UITooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Data may be incomplete</p>
                                      </TooltipContent>
                                    </UITooltip>
                                  </TooltipProvider>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right">€{entry.spend.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right">€{entry.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={cn(
                                entry.roas >= 2 ? "text-green-500" : 
                                entry.roas >= 1 ? "text-yellow-500" : 
                                entry.roas > 0 ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {entry.roas.toFixed(2)}x
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right">{entry.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-right">{entry.ctr.toFixed(2)}%</TableCell>
                            <TableCell className="text-xs text-right">{entry.checkouts}</TableCell>
                            <TableCell className="text-xs text-right">{entry.conversion_rate.toFixed(2)}%</TableCell>
                            <TableCell className="text-xs text-right">
                              {entry.checkouts > 0 ? `€${entry.cpa.toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>

      {/* Generate Creatives Dialog */}
      <GenerateCreativesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        allEntities={data?.entities || []}
        entityType={level === "PIN_PROMOTION" ? "ad" : level === "AD_GROUP" ? "ad_group" : "campaign"}
        timeframe={`last_${selectedPreset.days}d`}
        accountSummary={data?.totals ? {
          spend: data.totals.spend,
          revenue: data.totals.revenue,
          roas: data.totals.roas,
        } : undefined}
        mode={generateMode}
        selectedEntity={selectedEntityForGenerate}
      />
    </Card>
  );
}
