/**
 * usePlanCompletion - Hook for Sleep Plan completion tracking
 * 
 * Handles persistence of action completions and reflections
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompletionState {
  completedActions: string[];
  dayCompletion: Record<string, "not_started" | "in_progress" | "completed">;
  reflections: Record<string, string>;
  adherenceRate: number;
  streakDays: number;
  weekNumber: number;
}

interface UsePlanCompletionOptions {
  planId: string | null;
  enabled?: boolean;
}

export function usePlanCompletion({ planId, enabled = true }: UsePlanCompletionOptions) {
  const [state, setState] = useState<CompletionState>({
    completedActions: [],
    dayCompletion: {},
    reflections: {},
    adherenceRate: 0,
    streakDays: 0,
    weekNumber: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch completion state from backend
  const fetchCompletionState = useCallback(async () => {
    if (!planId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("sleep-plan-completion", {
        body: {
          action: "get_completion_state",
          planId,
        },
      });

      if (response.error) {
        console.error("Error fetching completion state:", response.error);
        setError(response.error.message);
        return;
      }

      const data = response.data;
      setState({
        completedActions: data.completedActions || [],
        dayCompletion: data.dayCompletion || {},
        reflections: data.reflections || {},
        adherenceRate: data.adherence?.adherence_rate || 0,
        streakDays: data.adherence?.streak_days || 0,
        weekNumber: data.adherence?.week_number || 1,
      });
    } catch (err) {
      console.error("Error fetching completion state:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [planId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchCompletionState();
  }, [fetchCompletionState]);

  // Toggle action completion
  const toggleAction = useCallback(async (dayName: string, actionId: string, completed: boolean) => {
    if (!planId) return;

    // Optimistic update
    const fullActionId = `${dayName.toLowerCase()}-${actionId}`;
    setState(prev => {
      const newCompletedActions = completed
        ? [...prev.completedActions, fullActionId]
        : prev.completedActions.filter(a => a !== fullActionId);

      return {
        ...prev,
        completedActions: newCompletedActions,
      };
    });

    try {
      const response = await supabase.functions.invoke("sleep-plan-completion", {
        body: {
          action: "toggle_action",
          planId,
          dayName: dayName.toLowerCase(),
          actionId,
          completed,
        },
      });

      if (response.error) {
        // Revert on error
        setState(prev => {
          const revertedActions = completed
            ? prev.completedActions.filter(a => a !== fullActionId)
            : [...prev.completedActions, fullActionId];
          return { ...prev, completedActions: revertedActions };
        });
        toast.error("Could not save your progress");
        return;
      }

      // Refresh to get updated adherence metrics
      setTimeout(() => fetchCompletionState(), 500);
    } catch (err) {
      console.error("Error toggling action:", err);
      toast.error("Could not save your progress");
    }
  }, [planId, fetchCompletionState]);

  // Save reflection
  const saveReflection = useCallback(async (dayName: string, reflectionText: string) => {
    if (!planId) return;

    // Optimistic update
    const dayKey = dayName.toLowerCase();
    setState(prev => ({
      ...prev,
      reflections: { ...prev.reflections, [dayKey]: reflectionText },
    }));

    try {
      const response = await supabase.functions.invoke("sleep-plan-completion", {
        body: {
          action: "save_reflection",
          planId,
          dayName: dayKey,
          reflectionText,
        },
      });

      if (response.error) {
        toast.error("Could not save your reflection");
        return;
      }

      toast.success("Reflection saved");
    } catch (err) {
      console.error("Error saving reflection:", err);
      toast.error("Could not save your reflection");
    }
  }, [planId]);

  return {
    ...state,
    loading,
    error,
    toggleAction,
    saveReflection,
    refresh: fetchCompletionState,
  };
}
