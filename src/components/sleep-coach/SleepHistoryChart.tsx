import { SleepLog } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

interface SleepHistoryChartProps {
  logs: SleepLog[];
}

export const SleepHistoryChart = ({ logs }: SleepHistoryChartProps) => {
  // Prepare data for chart (reverse to show oldest to newest)
  const chartData = [...logs]
    .reverse()
    .slice(-14) // Last 14 days
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      quality: log.sleep_quality,
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

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Sleep Trends (Last 14 Days)
        </CardTitle>
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
                yAxisId="left" 
                domain={[0, 5]} 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{ value: 'Quality', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 10]} 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{ value: 'Pain', angle: 90, position: 'insideRight', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="quality"
                name="Sleep Quality"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pain"
                name="Pain Level"
                stroke="hsl(0 84% 60%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(0 84% 60%)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};