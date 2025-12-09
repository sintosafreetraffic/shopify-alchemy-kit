// Performance: Extracted chart component for lazy loading in ShareProgressModal
// Uses Recharts - loaded on demand to reduce initial bundle size
import { memo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

type ShareMetric = "both" | "quality" | "pain";

interface ChartDataPoint {
  date: string;
  quality: number;
  pain: number;
}

interface ShareProgressChartProps {
  data: ChartDataPoint[];
  metric: ShareMetric;
}

const ShareProgressChart = memo(function ShareProgressChart({ 
  data, 
  metric 
}: ShareProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
          tickLine={false}
        />
        {(metric === "both" || metric === "quality") && (
          <Line
            type="monotone"
            dataKey="quality"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
        {(metric === "both" || metric === "pain") && (
          <Line
            type="monotone"
            dataKey="pain"
            stroke="#f87171"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});

export default ShareProgressChart;
