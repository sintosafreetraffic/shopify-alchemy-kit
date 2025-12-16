/**
 * Sleep Plan Completion API
 * 
 * Handles action completions, reflections, and adherence metrics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireEnv,
  corsHeaders,
  createSuccessResponse,
  createErrorResponse,
} from "../_shared/env.ts";
import { authenticateRequest } from "../_shared/auth.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = requireEnv([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
    ]);

    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || "Unauthorized", authResult.status);
    }

    const email = authResult.user.email;
    // Use 'any' to avoid complex generic type issues with Supabase client
    const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action } = body;

    // Route to appropriate handler
    switch (action) {
      case "toggle_action":
        return await handleToggleAction(supabase, email, body);
      case "save_reflection":
        return await handleSaveReflection(supabase, email, body);
      case "get_completion_state":
        return await handleGetCompletionState(supabase, email, body);
      case "get_adherence":
        return await handleGetAdherence(supabase, email);
      default:
        return createErrorResponse("Unknown action", 400);
    }
  } catch (error) {
    console.error("Sleep plan completion error:", error);
    return createErrorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

/**
 * Toggle an action completion
 */
async function handleToggleAction(
  supabase: any,
  email: string,
  body: { planId: string; dayName: string; actionId: string; completed: boolean }
) {
  const { planId, dayName, actionId, completed } = body;

  if (!planId || !dayName || !actionId) {
    return createErrorResponse("Missing required fields", 400);
  }

  // Upsert the completion record
  const { error } = await supabase
    .from("sleep_plan_completions")
    .upsert(
      {
        email,
        plan_id: planId,
        day_name: dayName,
        action_id: actionId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email,plan_id,day_name,action_id" }
    );

  if (error) {
    console.error("Error toggling action:", error);
    return createErrorResponse("Failed to update completion", 500);
  }

  // Recalculate adherence metrics
  await recalculateAdherence(supabase, email, planId);

  return createSuccessResponse({ success: true, completed });
}

/**
 * Save a reflection for a day
 */
async function handleSaveReflection(
  supabase: any,
  email: string,
  body: { planId: string; dayName: string; reflectionText: string }
) {
  const { planId, dayName, reflectionText } = body;

  if (!planId || !dayName || !reflectionText) {
    return createErrorResponse("Missing required fields", 400);
  }

  // Upsert the reflection
  const { error } = await supabase
    .from("sleep_plan_reflections")
    .upsert(
      {
        email,
        plan_id: planId,
        day_name: dayName,
        reflection_text: reflectionText,
      },
      { onConflict: "email,plan_id,day_name" }
    );

  if (error) {
    console.error("Error saving reflection:", error);
    return createErrorResponse("Failed to save reflection", 500);
  }

  return createSuccessResponse({ success: true });
}

/**
 * Get completion state for a plan
 */
async function handleGetCompletionState(
  supabase: any,
  email: string,
  body: { planId: string }
) {
  const { planId } = body;

  if (!planId) {
    return createErrorResponse("Missing planId", 400);
  }

  // Get completions
  const { data: completions, error: completionsError } = await supabase
    .from("sleep_plan_completions")
    .select("day_name, action_id, completed, completed_at")
    .eq("email", email)
    .eq("plan_id", planId);

  if (completionsError) {
    console.error("Error fetching completions:", completionsError);
    return createErrorResponse("Failed to fetch completions", 500);
  }

  // Get reflections
  const { data: reflections, error: reflectionsError } = await supabase
    .from("sleep_plan_reflections")
    .select("day_name, reflection_text, created_at")
    .eq("email", email)
    .eq("plan_id", planId);

  if (reflectionsError) {
    console.error("Error fetching reflections:", reflectionsError);
    return createErrorResponse("Failed to fetch reflections", 500);
  }

  // Get adherence
  const { data: adherence } = await supabase
    .from("sleep_plan_adherence")
    .select("*")
    .eq("email", email)
    .single();

  // Transform completions to a map
  const completedActions: string[] = [];
  const dayCompletion: Record<string, "not_started" | "in_progress" | "completed"> = {};
  const dayActions: Record<string, { completed: number; total: number }> = {};

  completions?.forEach((c: any) => {
    if (c.completed) {
      completedActions.push(`${c.day_name}-${c.action_id}`);
    }
    
    if (!dayActions[c.day_name]) {
      dayActions[c.day_name] = { completed: 0, total: 0 };
    }
    dayActions[c.day_name].total++;
    if (c.completed) {
      dayActions[c.day_name].completed++;
    }
  });

  // Determine day status
  Object.entries(dayActions).forEach(([day, stats]) => {
    if (stats.completed === 0) {
      dayCompletion[day] = "not_started";
    } else if (stats.completed >= stats.total) {
      dayCompletion[day] = "completed";
    } else {
      dayCompletion[day] = "in_progress";
    }
  });

  const reflectionMap = reflections?.reduce((acc: Record<string, string>, r: any) => {
    acc[r.day_name] = r.reflection_text;
    return acc;
  }, {}) || {};

  return createSuccessResponse({
    completedActions,
    dayCompletion,
    reflections: reflectionMap,
    adherence: adherence || null,
  });
}

/**
 * Get adherence metrics for a user
 */
async function handleGetAdherence(supabase: any, email: string) {
  const { data, error } = await supabase
    .from("sleep_plan_adherence")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows
    console.error("Error fetching adherence:", error);
    return createErrorResponse("Failed to fetch adherence", 500);
  }

  return createSuccessResponse({
    adherence: data || {
      week_number: 1,
      adherence_rate: 0,
      streak_days: 0,
      total_actions_completed: 0,
      total_actions_available: 0,
    },
  });
}

/**
 * Recalculate adherence metrics after a completion change
 */
async function recalculateAdherence(
  supabase: any,
  email: string,
  planId: string
) {
  try {
    // Get all completions for this plan
    const { data: completions } = await supabase
      .from("sleep_plan_completions")
      .select("completed, completed_at, day_name")
      .eq("email", email)
      .eq("plan_id", planId);

    if (!completions) return;

    const totalActions = completions.length;
    const completedActions = completions.filter((c: any) => c.completed).length;
    const adherenceRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // Calculate streak (consecutive days with at least one completion)
    const completionDates: string[] = completions
      .filter((c: any) => c.completed && c.completed_at)
      .map((c: any) => new Date(c.completed_at).toDateString());
    
    const uniqueDates: string[] = Array.from(new Set(completionDates)).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      if (uniqueDates.includes(checkDate.toDateString())) {
        streakDays++;
      } else {
        break;
      }
    }

    // Get or create adherence record
    const { data: existing } = await supabase
      .from("sleep_plan_adherence")
      .select("*")
      .eq("email", email)
      .single();

    const adherenceData = {
      email,
      current_plan_id: planId,
      adherence_rate: adherenceRate,
      streak_days: streakDays,
      total_actions_completed: completedActions,
      total_actions_available: totalActions,
      last_completion_date: completedActions > 0 ? new Date().toISOString().split("T")[0] : null,
      last_updated: new Date().toISOString(),
      week_number: existing?.week_number || 1,
    };

    if (existing) {
      await supabase
        .from("sleep_plan_adherence")
        .update(adherenceData)
        .eq("email", email);
    } else {
      await supabase
        .from("sleep_plan_adherence")
        .insert(adherenceData);
    }

    console.log(`Adherence updated for ${email}: ${adherenceRate}%, streak: ${streakDays}`);
  } catch (error) {
    console.error("Error recalculating adherence:", error);
  }
}
