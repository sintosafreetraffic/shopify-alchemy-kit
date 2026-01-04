import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartDataEntry {
  date: string;
  fullDate: string;
  Spend: number;
  Revenue: number;
  ROAS: number;
  Checkouts: number;
  Clicks: number;
  Impressions: number;
  CTR: number;
  CPM: number;
  CPC: number;
  hasLag: boolean;
}

interface MetricConfig {
  key: keyof Omit<ChartDataEntry, "date" | "fullDate" | "hasLag">;
  label: string;
  color: string;
  format: "currency" | "multiplier" | "percent" | "number";
  yAxisId: "left" | "right";
  defaultEnabled: boolean;
}

// Highly distinguishable color palette
const METRICS: MetricConfig[] = [
  { key: "Spend", label: "Spend", color: "#dc2626", format: "currency", yAxisId: "left", defaultEnabled: true },
  { key: "Revenue", label: "Revenue", color: "#16a34a", format: "currency", yAxisId: "left", defaultEnabled: true },
  { key: "ROAS", label: "ROAS", color: "#eab308", format: "multiplier", yAxisId: "right", defaultEnabled: false },
  { key: "Impressions", label: "Impressions", color: "#2563eb", format: "number", yAxisId: "right", defaultEnabled: false },
  { key: "Clicks", label: "Clicks", color: "#7c3aed", format: "number", yAxisId: "right", defaultEnabled: false },
  { key: "CTR", label: "CTR", color: "#06b6d4", format: "percent", yAxisId: "right", defaultEnabled: false },
  { key: "CPM", label: "CPM", color: "#f97316", format: "currency", yAxisId: "left", defaultEnabled: false },
  { key: "CPC", label: "CPC", color: "#a855f7", format: "currency", yAxisId: "left", defaultEnabled: false },
  { key: "Checkouts", label: "Checkouts", color: "#ec4899", format: "number", yAxisId: "right", defaultEnabled: false },
];

const QUICK_RANGES = [
  { label: "24h", days: 1 },
  { label: "3d", days: 3 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "3m", days: 90 },
  { label: "1y", days: 365 },
];

interface CombinedMetricsChartProps {
  chartData: ChartDataEntry[];
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

export default function CombinedMetricsChart({ chartData, onDateRangeChange }: CombinedMetricsChartProps) {
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(
    new Set(METRICS.filter(m => m.defaultEnabled).map(m => m.key))
  );
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 14));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [activeQuickRange, setActiveQuickRange] = useState<number | null>(14);

  const toggleMetric = (key: string) => {
    setEnabledMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const enableAll = () => {
    setEnabledMetrics(new Set(METRICS.map(m => m.key)));
  };

  const disableAll = () => {
    setEnabledMetrics(new Set());
  };

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = days === 365 ? subYears(end, 1) : days === 90 ? subMonths(end, 3) : subDays(end, days);
    setStartDate(start);
    setEndDate(end);
    setActiveQuickRange(days);
    onDateRangeChange?.(start, end);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setActiveQuickRange(null);
    if (date && endDate) {
      onDateRangeChange?.(date, endDate);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setActiveQuickRange(null);
    if (startDate && date) {
      onDateRangeChange?.(startDate, date);
    }
  };

  const formatValue = (value: number, format: MetricConfig["format"]) => {
    switch (format) {
      case "currency":
        return `€${value.toFixed(2)}`;
      case "multiplier":
        return `${value.toFixed(2)}x`;
      case "percent":
        return `${value.toFixed(2)}%`;
      case "number":
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
    }
  };

  const activeMetrics = METRICS.filter(m => enabledMetrics.has(m.key));
  const hasLeftAxis = activeMetrics.some(m => m.yAxisId === "left");
  const hasRightAxis = activeMetrics.some(m => m.yAxisId === "right");

  return (
    <Card className="bg-card/30 border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium">All Metrics Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={enableAll}>
              All
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={disableAll}>
              None
            </Button>
          </div>
        </div>
        
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {METRICS.map(metric => (
            <Badge
              key={metric.key}
              variant={enabledMetrics.has(metric.key) ? "default" : "outline"}
              className="cursor-pointer text-xs px-2 py-0.5 transition-all font-medium"
              style={{
                backgroundColor: enabledMetrics.has(metric.key) ? metric.color : "transparent",
                borderColor: metric.color,
                color: enabledMetrics.has(metric.key) ? "white" : metric.color,
              }}
              onClick={() => toggleMetric(metric.key)}
            >
              {metric.label}
            </Badge>
          ))}
        </div>

        {/* Date range controls */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {/* Quick range buttons */}
          <div className="flex items-center gap-1">
            {QUICK_RANGES.map(range => (
              <Button
                key={range.days}
                variant={activeQuickRange === range.days ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleQuickRange(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Start date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {startDate ? format(startDate, "MMM d") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground text-xs">to</span>

            {/* End date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {endDate ? format(endDate, "MMM d") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-80">
        {activeMetrics.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Select at least one metric to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
              />
              {hasLeftAxis && (
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `€${v}`}
                />
              )}
              {hasRightAxis && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => {
                  const metric = METRICS.find(m => m.key === name);
                  return [formatValue(value, metric?.format || "number"), name];
                }}
                labelFormatter={(label, payload) => {
                  const entry = payload?.[0]?.payload;
                  return entry?.hasLag ? `${entry.fullDate} ⚠️` : entry?.fullDate || label;
                }}
              />
              <Legend />
              {activeMetrics.map(metric => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  name={metric.label}
                  stroke={metric.color}
                  yAxisId={hasLeftAxis && hasRightAxis ? metric.yAxisId : (hasLeftAxis ? "left" : "right")}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
