import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isAfter, startOfToday } from "date-fns";

interface SleepHistoryWeekNavigatorProps {
  currentWeekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export const SleepHistoryWeekNavigator = ({
  currentWeekStart,
  onWeekChange,
}: SleepHistoryWeekNavigatorProps) => {
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const today = startOfToday();
  const nextWeekStart = addWeeks(currentWeekStart, 1);
  const isNextDisabled = isAfter(nextWeekStart, today);

  const handlePrevious = () => {
    onWeekChange(subWeeks(currentWeekStart, 1));
  };

  const handleNext = () => {
    if (!isNextDisabled) {
      onWeekChange(nextWeekStart);
    }
  };

  const handleToday = () => {
    onWeekChange(startOfWeek(today, { weekStartsOn: 1 }));
  };

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        className="h-8 w-8"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {format(currentWeekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToday}
          className="text-xs h-8"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isNextDisabled}
          className="h-8 w-8"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
