import { useState, useMemo } from "react";
import { SleepLog, TrendData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, Minus, Flame, Brain } from "lucide-react";
import { startOfWeek, parseISO, isWithinInterval, endOfWeek, addDays } from "date-fns";
import { SleepHistoryWeekNavigator } from "./SleepHistoryWeekNavigator";
import { SleepHistoryWeekTable } from "./SleepHistoryWeekTable";

interface SleepHistorySectionProps {
  logs: SleepLog[];
  trends: TrendData;
  onUpdateLog?: (id: string, log: Partial<SleepLog>) => Promise<boolean>;
  onDeleteLog?: (id: string) => Promise<boolean>;
}

export const SleepHistorySection = ({ logs, trends, onUpdateLog, onDeleteLog }: SleepHistorySectionProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Filter logs for the current week
  const weekLogs = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return logs.filter((log) => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: currentWeekStart, end: addDays(weekEnd, 1) });
    });
  }, [logs, currentWeekStart]);

  // Calculate stats for the current week
  const weekStats = useMemo(() => {
    if (weekLogs.length === 0) {
      return { avgQuality: 0, avgPain: 0, hotNights: 0, stressedNights: 0, logCount: 0 };
    }
    return {
      avgQuality: weekLogs.reduce((sum, l) => sum + l.sleep_quality, 0) / weekLogs.length,
      avgPain: weekLogs.reduce((sum, l) => sum + l.pain_level_morning, 0) / weekLogs.length,
      hotNights: weekLogs.filter((l) => l.felt_hot).length,
      stressedNights: weekLogs.filter((l) => l.felt_stressed).length,
      logCount: weekLogs.length,
    };
  }, [weekLogs]);

  const getTrendIcon = () => {
    switch (trends.trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "worsening":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Sleep History
          </span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <span className="text-muted-foreground">Overall:</span>
            {getTrendIcon()}
            <span
              className={
                trends.trend === "improving"
                  ? "text-green-600"
                  : trends.trend === "worsening"
                  ? "text-red-600"
                  : "text-muted-foreground"
              }
            >
              {trends.trend.charAt(0).toUpperCase() + trends.trend.slice(1)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week Navigator */}
        <SleepHistoryWeekNavigator
          currentWeekStart={currentWeekStart}
          onWeekChange={setCurrentWeekStart}
        />

        {/* Week Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-primary">
              {weekStats.avgQuality > 0 ? weekStats.avgQuality.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Week Avg Quality</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-500">
              {weekStats.avgPain > 0 ? weekStats.avgPain.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Week Avg Pain</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">{weekStats.logCount}</div>
            <div className="text-xs text-muted-foreground">Days Logged</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center flex flex-col items-center justify-center">
            <div className="flex gap-2">
              {weekStats.hotNights > 0 && (
                <span className="flex items-center gap-0.5 text-orange-600 text-sm">
                  <Flame className="h-3 w-3" />
                  {weekStats.hotNights}
                </span>
              )}
              {weekStats.stressedNights > 0 && (
                <span className="flex items-center gap-0.5 text-purple-600 text-sm">
                  <Brain className="h-3 w-3" />
                  {weekStats.stressedNights}
                </span>
              )}
              {weekStats.hotNights === 0 && weekStats.stressedNights === 0 && (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Hot / Stressed</div>
          </div>
        </div>

        {/* Week Table */}
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sleep logs yet. Start tracking your sleep above!
          </div>
        ) : (
          <SleepHistoryWeekTable 
            logs={weekLogs} 
            weekStart={currentWeekStart}
            onUpdateLog={onUpdateLog}
            onDeleteLog={onDeleteLog}
          />
        )}
      </CardContent>
    </Card>
  );
};
