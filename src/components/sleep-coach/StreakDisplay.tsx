import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Star, Award, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  streak: number;
  className?: string;
}

const MILESTONES = [
  { days: 7, label: "Week Warrior", icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  { days: 14, label: "Fortnight Fighter", icon: Zap, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { days: 30, label: "Monthly Master", icon: Trophy, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { days: 60, label: "Sleep Champion", icon: Award, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { days: 90, label: "Sleep Legend", icon: Crown, color: "text-amber-400", bgColor: "bg-amber-400/10" },
];

export const StreakDisplay = ({ streak, className }: StreakDisplayProps) => {
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Get highest achieved milestone
  const achievedMilestones = MILESTONES.filter(m => streak >= m.days);
  const currentMilestone = achievedMilestones[achievedMilestones.length - 1];
  const nextMilestone = MILESTONES.find(m => streak < m.days);
  const progress = nextMilestone 
    ? ((streak - (currentMilestone?.days || 0)) / (nextMilestone.days - (currentMilestone?.days || 0))) * 100
    : 100;

  // Check if user just hit a milestone
  useEffect(() => {
    const isExactMilestone = MILESTONES.some(m => m.days === streak);
    if (isExactMilestone && streak > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Celebration effect */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 animate-pulse" />
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            >
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            </div>
          ))}
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className={cn("h-5 w-5", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          Logging Streak
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Streak Display */}
        <div className="text-center py-4">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 transition-all",
            streak > 0 
              ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 ring-2 ring-orange-500/30"
              : "bg-muted"
          )}>
            <span className={cn(
              "text-4xl font-bold",
              streak > 0 ? "text-orange-500" : "text-muted-foreground"
            )}>
              {streak}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {streak === 0 ? "Start logging to build your streak!" : 
             streak === 1 ? "day streak - Keep it up!" :
             `day streak - You're on fire!`}
          </p>
        </div>

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {nextMilestone.days - streak} days to {nextMilestone.label}
              </span>
              <nextMilestone.icon className={cn("h-4 w-4", nextMilestone.color)} />
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Milestone badges */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Achievements</p>
          <div className="flex flex-wrap gap-2">
            {MILESTONES.map((milestone) => {
              const isAchieved = streak >= milestone.days;
              const Icon = milestone.icon;
              
              return (
                <Badge
                  key={milestone.days}
                  variant={isAchieved ? "default" : "outline"}
                  className={cn(
                    "gap-1 transition-all",
                    isAchieved 
                      ? cn(milestone.bgColor, milestone.color, "border-0")
                      : "opacity-50"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {milestone.days}d
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Current title */}
        {currentMilestone && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            currentMilestone.bgColor
          )}>
            <currentMilestone.icon className={cn("h-5 w-5", currentMilestone.color)} />
            <div>
              <p className={cn("font-semibold text-sm", currentMilestone.color)}>
                {currentMilestone.label}
              </p>
              <p className="text-xs text-muted-foreground">Current rank</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
