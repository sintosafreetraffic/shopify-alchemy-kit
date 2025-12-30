import { useAdsReporting, Granularity, DatePreset, ProcessedMetrics } from "@/hooks/useAdsReporting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
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

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  format?: "currency" | "percent" | "number";
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
}

function KPICard({ label, value, icon: Icon, format = "number", tooltip }: KPICardProps) {
  const formattedValue = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "percent":
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  })();

  const card = (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground">{formattedValue}</p>
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
// MAIN COMPONENT
// ============================================================================

export default function AdsReportingSection() {
  const {
    data,
    loading,
    error,
    refetch,
    selectedPreset,
    setSelectedPreset,
    granularity,
    setGranularity,
    level,
    setLevel,
    datePresets,
    isStale,
    cachedAt,
  } = useAdsReporting();

  // Format chart data
  const chartData = data?.timeseries.map((entry) => ({
    date: entry.date.slice(5), // MM-DD format
    fullDate: entry.date,
    Spend: entry.spend,
    Revenue: entry.revenue,
    ROAS: entry.roas,
    Checkouts: entry.checkouts,
    Clicks: entry.clicks,
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
                Pinterest Ads performance • 30-day click / 1-day view attribution
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cachedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(cachedAt, { addSuffix: true })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
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
            onValueChange={(v) => setLevel(v as "ACCOUNT" | "CAMPAIGN" | "AD_GROUP")}
          >
            <TabsList className="h-8">
              <TabsTrigger value="ACCOUNT" className="text-xs px-2 h-6">Account</TabsTrigger>
              <TabsTrigger value="CAMPAIGN" className="text-xs px-2 h-6">Campaign</TabsTrigger>
              <TabsTrigger value="AD_GROUP" className="text-xs px-2 h-6">Ad Group</TabsTrigger>
            </TabsList>
          </Tabs>
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
        {data && (
          <>
            {/* KPI Cards - Row 1: Spend & Revenue */}
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
                format="number"
                tooltip="Return on Ad Spend (Revenue / Spend)"
              />
              <KPICard
                label="CPA"
                value={data.totals.cpa}
                icon={ShoppingCart}
                format="currency"
                tooltip="Cost per Acquisition (Spend / Checkouts)"
              />
            </div>

            {/* KPI Cards - Row 2: Traffic */}
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

            {/* Conversion Warning */}
            {data.totals.checkouts === 0 && (
              <Alert className="bg-muted/50 border-muted">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Conversion data may lag 24–48h. Use trends rather than single-day spikes for insights.
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
                          formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
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
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}x`, "ROAS"]}
                        />
                        <ReferenceLine 
                          y={2} 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          label={{ value: "2x target", position: "right", fontSize: 10 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ROAS"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={false}
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

            {/* Daily Table */}
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
                          <TableHead className="text-xs font-medium text-right">CPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.timeseries].reverse().map((entry) => (
                          <TableRow key={entry.date} className="hover:bg-muted/20">
                            <TableCell className="text-xs font-medium">{entry.date}</TableCell>
                            <TableCell className="text-xs text-right">€{entry.spend.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right">€{entry.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={cn(
                                entry.roas >= 2 ? "text-green-500" : 
                                entry.roas >= 1 ? "text-yellow-500" : 
                                "text-red-500"
                              )}>
                                {entry.roas.toFixed(2)}x
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right">{entry.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-right">{entry.ctr.toFixed(2)}%</TableCell>
                            <TableCell className="text-xs text-right">{entry.checkouts}</TableCell>
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
    </Card>
  );
}
