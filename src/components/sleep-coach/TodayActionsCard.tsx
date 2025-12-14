/**
 * TodayActionsCard - High-contrast today's actions block
 * 
 * Shows 2-3 immediate actions with effort level and estimated time.
 * Designed to be the most prominent call-to-action in the plan.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sun, Moon, Clock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import type { TodayAction, EffortLevel } from "@/types/coach-plan";

interface TodayActionsCardProps {
  actions: TodayAction[];
  onActionsCompleted?: (completed: number, total: number) => void;
}

function getEffortBadge(effort?: EffortLevel) {
  if (effort === "low") {
    return (
      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        <Zap className="h-3 w-3 mr-1" />
        Quick
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
      <Clock className="h-3 w-3 mr-1" />
      {effort === "medium" ? "5-15 min" : "Moderate"}
    </Badge>
  );
}

export function TodayActionsCard({ actions, onActionsCompleted }: TodayActionsCardProps) {
  // Track completed actions in session storage for persistence
  const storageKey = "rbn_coach_today_actions";
  
  const [completedActions, setCompletedActions] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const { date, completed } = JSON.parse(stored);
        // Only restore if same day
        if (date === new Date().toDateString()) {
          return new Set(completed);
        }
      }
    } catch {}
    return new Set();
  });

  // Persist to session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, JSON.stringify({
        date: new Date().toDateString(),
        completed: Array.from(completedActions),
      }));
    }
  }, [completedActions]);

  // Notify parent of completion changes
  useEffect(() => {
    onActionsCompleted?.(completedActions.size, actions.length);
  }, [completedActions, actions.length, onActionsCompleted]);

  const handleToggle = (index: number) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Sort actions: morning first, then evening
  const sortedActions = [...actions].sort((a, b) => {
    if (a.time === "morning" && b.time === "evening") return -1;
    if (a.time === "evening" && b.time === "morning") return 1;
    return 0;
  });

  const allComplete = completedActions.size === actions.length;

  return (
    <Card className={`border-2 ${allComplete ? "border-emerald-500/50 bg-emerald-500/5" : "border-primary/30 bg-primary/5"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-base font-semibold flex items-center gap-2">
            {allComplete ? "✓ " : ""}Today's Focus
          </span>
          <Badge variant={allComplete ? "default" : "secondary"} className="text-xs">
            {completedActions.size}/{actions.length} done
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {sortedActions.map((action, index) => {
            const isComplete = completedActions.has(index);
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isComplete 
                    ? "bg-muted/50 opacity-75" 
                    : "bg-background border border-border/50"
                }`}
              >
                <Checkbox
                  checked={isComplete}
                  onCheckedChange={() => handleToggle(index)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {action.time === "morning" ? (
                      <Sun className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Moon className="h-4 w-4 text-blue-500" />
                    )}
                    <span className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>
                      {action.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {action.duration}
                    </span>
                    {action.effort && getEffortBadge(action.effort)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {allComplete && (
          <div className="mt-4 pt-3 border-t border-emerald-500/30 text-center">
            <p className="text-sm text-emerald-600 font-medium">
              Great job completing today's actions! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
