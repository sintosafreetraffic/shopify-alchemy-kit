/**
 * StreakTracker Component
 * 
 * Displays the affiliate's current activity streak with premium visual design.
 * Streak = consecutive days with at least 1 sale.
 * 
 * Features:
 * - Visual flame indicator with intensity based on streak length
 * - Streak milestones (3, 7, 14, 30 days)
 * - Motivational messages
 */

import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, TrendingUp, Zap } from "lucide-react";
import { differenceInDays, parseISO, startOfDay, format } from "date-fns";

interface Commission {
  created_at: string;
}

interface StreakTrackerProps {
  commissions: Commission[];
  className?: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSaleDate: string | null;
  isStreakActive: boolean;
}

function calculateStreak(commissions: Commission[]): StreakData {
  if (!commissions || commissions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastSaleDate: null,
      isStreakActive: false,
    };
  }

  // Sort commissions by date descending
  const sortedCommissions = [...commissions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Get unique dates with sales
  const datesWithSales = new Set<string>();
  sortedCommissions.forEach((c) => {
    const date = startOfDay(parseISO(c.created_at));
    datesWithSales.add(date.toISOString());
  });

  const uniqueDates = Array.from(datesWithSales)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastSaleDate: null,
      isStreakActive: false,
    };
  }

  const today = startOfDay(new Date());
  const lastSaleDay = uniqueDates[0];
  const daysSinceLastSale = differenceInDays(today, lastSaleDay);

  // Streak is active if last sale was today or yesterday
  const isStreakActive = daysSinceLastSale <= 1;

  // Calculate current streak
  let currentStreak = 0;
  if (isStreakActive) {
    currentStreak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const diff = differenceInDays(uniqueDates[i], uniqueDates[i + 1]);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const diff = differenceInDays(uniqueDates[i], uniqueDates[i + 1]);
    if (diff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    lastSaleDate: sortedCommissions[0].created_at,
    isStreakActive,
  };
}

function getStreakMessage(streak: number, isActive: boolean): string {
  if (!isActive) {
    return "Get a sale today to start a new streak!";
  }
  if (streak >= 30) return "Legendary! 30+ day streak 🏆";
  if (streak >= 14) return "Unstoppable! Two weeks strong 💪";
  if (streak >= 7) return "Crushing it! Week-long streak 🔥";
  if (streak >= 3) return "Building momentum! Keep it up 🚀";
  return "Streak started! Make it count 💫";
}

function getFlameIntensity(streak: number): {
  color: string;
  bgColor: string;
  pulseClass: string;
} {
  if (streak >= 14) {
    return {
      color: "text-orange-500",
      bgColor: "bg-gradient-to-br from-orange-100 to-red-100",
      pulseClass: "animate-pulse",
    };
  }
  if (streak >= 7) {
    return {
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      pulseClass: "",
    };
  }
  if (streak >= 3) {
    return {
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      pulseClass: "",
    };
  }
  return {
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    pulseClass: "",
  };
}

export function StreakTracker({ commissions, className }: StreakTrackerProps) {
  const streakData = calculateStreak(commissions);
  const intensity = getFlameIntensity(streakData.currentStreak);
  const message = getStreakMessage(streakData.currentStreak, streakData.isStreakActive);

  // Milestone markers
  const milestones = [3, 7, 14, 30];
  const nextMilestone = milestones.find((m) => m > streakData.currentStreak) || null;

  if (!streakData.isStreakActive && streakData.currentStreak === 0 && !streakData.lastSaleDate) {
    // Don't show if no sales at all
    return null;
  }

  return (
    <Card className={`${intensity.bgColor} border-border/50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-background/80 ${intensity.pulseClass}`}>
              <Flame className={`h-5 w-5 ${intensity.color}`} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{streakData.currentStreak}</span>
                <span className="text-sm text-muted-foreground">
                  day{streakData.currentStreak !== 1 ? "s" : ""} streak
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>

          {/* Milestone Progress */}
          <div className="hidden sm:flex items-center gap-2">
            {milestones.map((milestone) => (
              <div
                key={milestone}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  streakData.currentStreak >= milestone
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {milestone}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Best:</span>
            <span className="font-medium">{streakData.longestStreak} days</span>
          </div>
          {streakData.lastSaleDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last sale:</span>
              <span className="font-medium">
                {format(parseISO(streakData.lastSaleDate), "MMM d")}
              </span>
            </div>
          )}
          {nextMilestone && streakData.isStreakActive && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">
                {nextMilestone - streakData.currentStreak} more for {nextMilestone}-day badge
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
