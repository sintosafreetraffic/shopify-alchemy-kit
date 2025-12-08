import { useState } from "react";
import { SleepLog } from "@/hooks/useSleepApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Flame, Brain, ChevronDown, FileText } from "lucide-react";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface SleepHistoryWeekTableProps {
  logs: SleepLog[];
  weekStart: Date;
}

export const SleepHistoryWeekTable = ({ logs, weekStart }: SleepHistoryWeekTableProps) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const toggleNote = (id: string) => {
    const newSet = new Set(expandedNotes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedNotes(newSet);
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 7) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (quality >= 5) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getPainColor = (pain: number) => {
    if (pain <= 2) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (pain <= 5) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getLogForDay = (day: Date): SleepLog | undefined => {
    return logs.find((log) => {
      const logDate = parseISO(log.date);
      return isSameDay(logDate, day);
    });
  };

  const today = new Date();

  return (
    <div className="space-y-2">
      {daysInWeek.map((day) => {
        const log = getLogForDay(day);
        const isFuture = day > today;
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className={`rounded-lg border p-3 transition-colors ${
              isToday
                ? "border-primary/50 bg-primary/5"
                : isFuture
                ? "border-border/30 bg-muted/30 opacity-50"
                : "border-border/50 bg-card/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium w-20">
                  {format(day, "EEE, MMM d")}
                  {isToday && (
                    <span className="ml-1 text-xs text-primary">(Today)</span>
                  )}
                </div>

                {log ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getQualityColor(log.sleep_quality)}>
                      Quality: {log.sleep_quality}/10
                    </Badge>
                    <Badge variant="outline" className={getPainColor(log.pain_level_morning)}>
                      Pain: {log.pain_level_morning}/10
                    </Badge>
                    {log.felt_hot && (
                      <span className="flex items-center gap-0.5 text-xs text-orange-600">
                        <Flame className="h-3 w-3" />
                        Hot
                      </span>
                    )}
                    {log.felt_stressed && (
                      <span className="flex items-center gap-0.5 text-xs text-purple-600">
                        <Brain className="h-3 w-3" />
                        Stressed
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {isFuture ? "—" : "No log"}
                  </span>
                )}
              </div>

              {log?.notes && (
                <Collapsible open={expandedNotes.has(log.id)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNote(log.id)}
                      className="h-7 gap-1 text-xs"
                    >
                      <FileText className="h-3 w-3" />
                      Note
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${
                          expandedNotes.has(log.id) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {log?.notes && expandedNotes.has(log.id) && (
              <Collapsible open={expandedNotes.has(log.id)}>
                <CollapsibleContent>
                  <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                    {log.notes}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        );
      })}
    </div>
  );
};
