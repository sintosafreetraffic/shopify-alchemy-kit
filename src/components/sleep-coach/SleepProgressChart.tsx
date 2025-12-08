import { useState, useMemo } from "react";
import { SleepLog, TrendData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from "recharts";
import { BarChart3, CalendarIcon, Share2 } from "lucide-react";
import { format, subDays, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type TimeRange = "7d" | "30d" | "90d" | "12m" | "custom";

interface SleepProgressChartProps {
  logs: SleepLog[];
  initialRange?: TimeRange;
  onShareClick?: (range: TimeRange) => void;
}

export const SleepProgressChart = ({ logs, initialRange = "30d", onShareClick }: SleepProgressChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    let startDate: Date;
    let endDate = today;

    if (timeRange === "custom" && customRange?.from) {
      startDate = new Date(customRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = customRange.to ? new Date(customRange.to) : new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (timeRange) {
        case "7d":
          startDate = subDays(today, 6); // 7 days including today
          break;
        case "30d":
          startDate = subDays(today, 29); // 30 days including today
          break;
        case "90d":
          startDate = subDays(today, 89); // 90 days including today
          break;
        case "12m":
          startDate = subMonths(today, 12);
          break;
        default:
          startDate = subDays(today, 29);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    return logs.filter((log) => {
      const logDate = startOfDay(parseISO(log.date));
      return isWithinInterval(logDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
    });
  }, [logs, timeRange, customRange]);

  // Generate all dates in the range for the X-axis
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let startDate: Date;
    let endDate = today;

    if (timeRange === "custom" && customRange?.from) {
      startDate = new Date(customRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = customRange.to ? new Date(customRange.to) : new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (timeRange) {
        case "7d":
          startDate = subDays(today, 6);
          break;
        case "30d":
          startDate = subDays(today, 29);
          break;
        case "90d":
          startDate = subDays(today, 89);
          break;
        case "12m":
          startDate = subMonths(today, 12);
          break;
        default:
          startDate = subDays(today, 29);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    // Create a map of existing logs by date
    const logsByDate = new Map<string, SleepLog>();
    logs.forEach((log) => {
      logsByDate.set(log.date, log);
    });

    // Generate all dates in the range
    const allDates: { date: string; fullDate: string; quality: number | null; pain: number | null; feltHot: boolean; feltStressed: boolean }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const log = logsByDate.get(dateStr);
      
      // Adjust label format based on range for readability
      let displayFormat = "MMM d";
      if (timeRange === "12m") {
        // For 12 months, only show month labels for the 1st of each month
        displayFormat = currentDate.getDate() === 1 ? "MMM" : "";
      } else if (timeRange === "90d") {
        // For 90 days, show every ~7th day
        displayFormat = "M/d";
      }
      
      allDates.push({
        date: displayFormat ? format(currentDate, displayFormat) : "",
        fullDate: dateStr,
        quality: log ? log.sleep_quality : null,
        pain: log ? log.pain_level_morning : null,
        feltHot: log?.felt_hot || false,
        feltStressed: log?.felt_stressed || false,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
  }, [logs, timeRange, customRange]);

  const stats = useMemo(() => {
    if (filteredLogs.length === 0) {
      return { avgQuality: 0, avgPain: 0, hotNights: 0, stressedNights: 0 };
    }
    const avgQuality = filteredLogs.reduce((sum, l) => sum + l.sleep_quality, 0) / filteredLogs.length;
    const avgPain = filteredLogs.reduce((sum, l) => sum + l.pain_level_morning, 0) / filteredLogs.length;
    const hotNights = filteredLogs.filter((l) => l.felt_hot).length;
    const stressedNights = filteredLogs.filter((l) => l.felt_stressed).length;
    return { avgQuality, avgPain, hotNights, stressedNights };
  }, [filteredLogs]);

  const rangeOptions: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "12m", label: "12 Months" },
    { value: "custom", label: "Custom" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}/10
            </p>
          ))}
          {data?.feltHot && (
            <p className="text-xs text-orange-600 mt-1">🌡️ Felt hot</p>
          )}
          {data?.feltStressed && (
            <p className="text-xs text-purple-600">😰 Felt stressed</p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setIsCalendarOpen(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Sleep Progress
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            {rangeOptions.map((option) => (
              option.value === "custom" ? (
                <Popover key={option.value} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={timeRange === "custom" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setTimeRange("custom")}
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {timeRange === "custom" && customRange?.from
                        ? `${format(customRange.from, "MMM d")}${
                            customRange.to ? ` - ${format(customRange.to, "MMM d")}` : ""
                          }`
                        : "Custom"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={customRange}
                      onSelect={handleCustomRangeSelect}
                      numberOfMonths={1}
                      disabled={(date) => date > new Date()}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  key={option.value}
                  variant={timeRange === option.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </Button>
              )
            ))}
            
            {onShareClick && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onShareClick(timeRange)}
              >
                <Share2 className="h-3 w-3" />
                Share
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Mini Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-primary">
              {stats.avgQuality > 0 ? stats.avgQuality.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Avg Quality</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-500">
              {stats.avgPain > 0 ? stats.avgPain.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Avg Pain</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-500">{stats.hotNights}</div>
            <div className="text-xs text-muted-foreground">Hot Nights</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-500">{stats.stressedNights}</div>
            <div className="text-xs text-muted-foreground">Stressed</div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No logs in this period yet.</p>
              <p className="text-sm">Start logging to see your progress here.</p>
            </div>
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval={timeRange === "12m" ? 30 : timeRange === "90d" ? 7 : timeRange === "30d" ? 3 : 0}
                  tickFormatter={(value) => value || ""}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 5, 10]}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  width={30}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  formatter={(value) => value !== null ? value : "No data"}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="quality"
                  name="Sleep Quality"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={(props: any) => {
                    if (props.payload.quality === null) return null;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={3}
                        fill="hsl(var(--primary))"
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="pain"
                  name="Pain Level"
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={2}
                  dot={(props: any) => {
                    if (props.payload.pain === null) return null;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={3}
                        fill="hsl(0 84% 60%)"
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Higher sleep quality is better • Lower morning pain is better
        </p>
      </CardContent>
    </Card>
  );
};

export { type TimeRange as ChartTimeRange };
