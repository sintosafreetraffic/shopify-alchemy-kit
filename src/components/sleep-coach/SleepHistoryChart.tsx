import { SleepLog } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

interface SleepHistoryChartProps {
  logs: SleepLog[];
}

export const SleepHistoryChart = ({ logs }: SleepHistoryChartProps) => {
  // Prepare data for chart (reverse to show oldest to newest)
  // Normalize quality from 1-5 to 0-10 scale for comparison with pain (0-10)
  const chartData = [...logs]
    .reverse()
    .slice(-14) // Last 14 days
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      quality: log.sleep_quality * 2, // Normalize 1-5 to 2-10
      qualityOriginal: log.sleep_quality,
      pain: log.pain_level_morning,
      wakeUps: log.wake_ups_per_night || 0,
    }));

  if (logs.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No sleep data to display yet. Start logging your sleep!</p>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip to show original values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'Sleep Quality' 
                ? `Sleep Quality: ${entry.payload.qualityOriginal}/5`
                : `Pain Level: ${entry.value}/10`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Sleep Trends (Last 14 Days)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Quality scaled to 0-10 for comparison • Higher quality is better, lower pain is better
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                className="fill-muted-foreground"
              />
              <YAxis 
                domain={[0, 10]} 
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{ value: 'Score (0-10)', angle: -90, position: 'insideLeft', fontSize: 11, offset: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="quality"
                name="Sleep Quality"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="pain"
                name="Pain Level"
                stroke="hsl(0 84% 60%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(0 84% 60%)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
