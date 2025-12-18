/**
 * useWeeklyProgression - Hook for weekly plan progression detection
 * 
 * Monitors adherence and triggers automatic weekly regeneration
 * Plans can only be regenerated on Sundays (before new week starts)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseWeeklyProgressionOptions {
  adherenceRate: number;
  weekNumber: number;
  planValidUntil?: string;
  onRegeneratePlan: (reason: "week_completed" | "high_adherence" | "expired") => void;
  enabled?: boolean;
}

// Check if today is Sunday (day 0 in JS)
export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

export function useWeeklyProgression({
  adherenceRate,
  weekNumber,
  planValidUntil,
  onRegeneratePlan,
  enabled = true,
}: UseWeeklyProgressionOptions) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showNewWeekToast, setShowNewWeekToast] = useState(false);
  const lastWeekRef = useRef(weekNumber);
  const hasTriggeredHighAdherenceRef = useRef(false);

  // Check if plan is expired
  const isPlanExpired = useCallback(() => {
    if (!planValidUntil) return false;
    return new Date(planValidUntil) < new Date();
  }, [planValidUntil]);

  // Calculate days remaining in current week
  const getDaysRemaining = useCallback(() => {
    if (!planValidUntil) return 7;
    const now = new Date();
    const validUntil = new Date(planValidUntil);
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [planValidUntil]);

  // Check if regeneration is allowed (expired plans always allowed, otherwise only on Sunday)
  const canRegenerate = useCallback(() => {
    if (isPlanExpired()) return true;
    return isSunday();
  }, [isPlanExpired]);

  // Trigger regeneration with toast
  const triggerRegeneration = useCallback(async (reason: "week_completed" | "high_adherence" | "expired") => {
    if (isRegenerating || !enabled) return;
    
    setIsRegenerating(true);
    
    try {
      await onRegeneratePlan(reason);
      
      // Show premium toast
      toast.success("Your plan has refreshed based on your progress", {
        description: "New week, new focus areas tailored to your journey.",
        duration: 5000,
        style: {
          backgroundColor: "#FAFAF8",
          border: "1px solid rgba(60, 131, 246, 0.15)",
          color: "#2D2B29",
        },
      });
      
      setShowNewWeekToast(true);
      setTimeout(() => setShowNewWeekToast(false), 5000);
    } catch (error) {
      console.error("Failed to regenerate plan:", error);
      toast.error("Could not refresh your plan. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  }, [isRegenerating, enabled, onRegeneratePlan]);

  // Monitor for week completion (plan expired)
  useEffect(() => {
    if (!enabled || isRegenerating) return;

    const checkExpiration = () => {
      if (isPlanExpired()) {
        triggerRegeneration("week_completed");
      }
    };

    // Check immediately
    checkExpiration();

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [enabled, isRegenerating, isPlanExpired, triggerRegeneration]);

  // Monitor for high adherence (80%+ before week ends) - only show on Sundays
  useEffect(() => {
    if (!enabled || isRegenerating) return;

    const daysRemaining = getDaysRemaining();
    
    // If adherence >= 80% and it's Sunday, offer early refresh for next week
    if (
      adherenceRate >= 80 &&
      daysRemaining >= 1 &&
      isSunday() &&
      !hasTriggeredHighAdherenceRef.current
    ) {
      hasTriggeredHighAdherenceRef.current = true;
      
      // Show suggestion toast instead of auto-triggering
      toast.info("Great progress this week", {
        description: "Ready for next week's plan?",
        duration: 8000,
        action: {
          label: "Generate next week",
          onClick: () => triggerRegeneration("high_adherence"),
        },
        style: {
          backgroundColor: "#FAFAF8",
          border: "1px solid rgba(60, 131, 246, 0.15)",
          color: "#2D2B29",
        },
      });
    }
  }, [adherenceRate, enabled, isRegenerating, getDaysRemaining, triggerRegeneration]);

  // Reset high adherence trigger on new week
  useEffect(() => {
    if (weekNumber !== lastWeekRef.current) {
      lastWeekRef.current = weekNumber;
      hasTriggeredHighAdherenceRef.current = false;
    }
  }, [weekNumber]);

  return {
    isRegenerating,
    showNewWeekToast,
    daysRemaining: getDaysRemaining(),
    isPlanExpired: isPlanExpired(),
    canRegenerate: canRegenerate(),
    isSunday: isSunday(),
    triggerManualRegeneration: () => triggerRegeneration("week_completed"),
  };
}
