import { SleepLog, TrendData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Flame, Brain, Calendar } from "lucide-react";

interface SleepLogTableProps {
  logs: SleepLog[];
  trends: TrendData;
}

export const SleepLogTable = ({ logs, trends }: SleepLogTableProps) => {
  const getTrendIcon = () => {
    switch (trends.trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'worsening':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 4) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (quality >= 3) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getPainColor = (pain: number) => {
    if (pain <= 2) return "text-green-600";
    if (pain <= 5) return "text-yellow-600";
    return "text-red-600";
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
            <span className="text-muted-foreground">Trend:</span>
            {getTrendIcon()}
            <span className={
              trends.trend === 'improving' ? 'text-green-600' :
              trends.trend === 'worsening' ? 'text-red-600' : 'text-muted-foreground'
            }>
              {trends.trend.charAt(0).toUpperCase() + trends.trend.slice(1)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{trends.avgSleepQuality.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Quality /5</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{trends.avgPain.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Pain /10</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{trends.goodNights}</div>
            <div className="text-xs text-muted-foreground">Good Nights</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{trends.poorNights}</div>
            <div className="text-xs text-muted-foreground">Poor Nights</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          {trends.hotNights > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Flame className="h-4 w-4" />
              <span>{trends.hotNights} hot nights</span>
            </div>
          )}
          {trends.stressedNights > 0 && (
            <div className="flex items-center gap-1 text-purple-600">
              <Brain className="h-4 w-4" />
              <span>{trends.stressedNights} stressed nights</span>
            </div>
          )}
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sleep logs yet. Start tracking your sleep above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Pain</TableHead>
                  <TableHead className="hidden md:table-cell">Time to Sleep</TableHead>
                  <TableHead className="hidden md:table-cell">Wake-ups</TableHead>
                  <TableHead className="hidden lg:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getQualityColor(log.sleep_quality)}>
                        {log.sleep_quality}/5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getPainColor(log.pain_level_morning)}>
                        {log.pain_level_morning}/10
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {log.time_to_sleep_minutes ? `${log.time_to_sleep_minutes}m` : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {log.wake_ups_per_night ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                      <span className="flex items-center gap-1">
                        {log.felt_hot && <Flame className="h-3 w-3 text-orange-500" />}
                        {log.felt_stressed && <Brain className="h-3 w-3 text-purple-500" />}
                        {log.notes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
