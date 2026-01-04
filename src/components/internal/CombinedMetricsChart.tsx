import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const METRICS: MetricConfig[] = [
  { key: "Spend", label: "Spend", color: "hsl(0, 70%, 50%)", format: "currency", yAxisId: "left", defaultEnabled: true },
  { key: "Revenue", label: "Revenue", color: "hsl(142, 70%, 45%)", format: "currency", yAxisId: "left", defaultEnabled: true },
  { key: "ROAS", label: "ROAS", color: "hsl(217, 90%, 60%)", format: "multiplier", yAxisId: "right", defaultEnabled: false },
  { key: "Impressions", label: "Impressions", color: "hsl(200, 70%, 50%)", format: "number", yAxisId: "right", defaultEnabled: false },
  { key: "Clicks", label: "Clicks", color: "hsl(280, 60%, 55%)", format: "number", yAxisId: "right", defaultEnabled: false },
  { key: "CTR", label: "CTR", color: "hsl(142, 60%, 45%)", format: "percent", yAxisId: "right", defaultEnabled: false },
  { key: "CPM", label: "CPM", color: "hsl(280, 60%, 55%)", format: "currency", yAxisId: "left", defaultEnabled: false },
  { key: "CPC", label: "CPC", color: "hsl(35, 80%, 50%)", format: "currency", yAxisId: "left", defaultEnabled: false },
  { key: "Checkouts", label: "Checkouts", color: "hsl(260, 70%, 60%)", format: "number", yAxisId: "right", defaultEnabled: false },
];

interface CombinedMetricsChartProps {
  chartData: ChartDataEntry[];
}

export default function CombinedMetricsChart({ chartData }: CombinedMetricsChartProps) {
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(
    new Set(METRICS.filter(m => m.defaultEnabled).map(m => m.key))
  );

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
              className="cursor-pointer text-xs px-2 py-0.5 transition-all"
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
