/**
 * Check Plan Refresh Edge Function
 * 
 * Lightweight endpoint to check if a user's sleep plan should be regenerated.
 * Called by the dashboard on load to determine if auto-refresh is needed.
 * 
 * Returns:
 * - shouldRegenerate: boolean
 * - reason: string (why regeneration is needed)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  authenticateRequest,
  createAuthErrorResponse,
} from "../_shared/auth.ts";

interface LogsSnapshot {
  nights_logged: number;
  avg_sleep_quality: number;
  avg_morning_pain: number;
  trend: 'improving' | 'stable' | 'worsening';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Unauthorized', authResult.status);
    }

    const email = authResult.user.email;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch latest plan and profile
    const [planResult, profileResult, logsResult] = await Promise.all([
      supabase
        .from('coach_plans')
        .select('id, generated_at, valid_until, trend_at_generation, logs_snapshot, profile_snapshot')
        .eq('email', email)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sleep_profiles')
        .select('quiz_completed_at, products_owned')
        .eq('email', email)
        .maybeSingle(),
      supabase
        .from('sleep_logs')
        .select('date, sleep_quality, pain_level_morning')
        .eq('email', email)
        .order('date', { ascending: false })
        .limit(14),
    ]);

    const plan = planResult.data;
    const profile = profileResult.data;
    const logs = logsResult.data || [];

    // Check regeneration conditions
    const result = shouldRegeneratePlan(plan, profile, logs);

    console.log(`[check-plan-refresh] ${email}: shouldRegenerate=${result.shouldRegenerate}, reason=${result.reason}`);

    return createSuccessResponse(result);
  } catch (error: any) {
    console.error('[check-plan-refresh] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});

function shouldRegeneratePlan(
  plan: any,
  profile: any,
  logs: any[]
): { shouldRegenerate: boolean; reason: string } {
  // 1. No plan exists
  if (!plan) {
    return { shouldRegenerate: true, reason: 'no_plan' };
  }

  const now = new Date();
  const planGeneratedAt = new Date(plan.generated_at);
  const validUntil = plan.valid_until ? new Date(plan.valid_until) : null;

  // 2. Plan expired
  if (validUntil && validUntil < now) {
    return { shouldRegenerate: true, reason: 'expired' };
  }

  // 3. Quiz retaken after plan generation
  if (profile?.quiz_completed_at) {
    const quizAt = new Date(profile.quiz_completed_at);
    if (quizAt > planGeneratedAt) {
      return { shouldRegenerate: true, reason: 'quiz_updated' };
    }
  }

  // 4. New products added after plan generation
  const currentProducts = profile?.products_owned || [];
  const snapshotProducts = plan.profile_snapshot?.products_owned || [];
  const newProducts = currentProducts.filter((p: string) => !snapshotProducts.includes(p));
  if (newProducts.length > 0) {
    return { shouldRegenerate: true, reason: 'product_changed' };
  }

  // 5. Significant quality decline in last 7 days
  if (logs.length >= 3) {
    const recent7Days = logs.slice(0, 7);
    const avgQuality = recent7Days.reduce((sum, l) => sum + l.sleep_quality, 0) / recent7Days.length;
    const snapshotAvg = plan.logs_snapshot?.avg_sleep_quality || 5;
    
    // Quality dropped significantly
    if (avgQuality < 5 && snapshotAvg >= 5) {
      return { shouldRegenerate: true, reason: 'quality_declined' };
    }
    
    // Pain increased significantly
    const avgPain = recent7Days.reduce((sum, l) => sum + l.pain_level_morning, 0) / recent7Days.length;
    const snapshotPain = plan.logs_snapshot?.avg_morning_pain || 5;
    if (avgPain >= 6 && snapshotPain < 5) {
      return { shouldRegenerate: true, reason: 'pain_increased' };
    }

    // Trend flipped to worsening
    const previousTrend = plan.trend_at_generation;
    if (previousTrend !== 'worsening') {
      // Check if trend is now worsening
      const older7Days = logs.slice(7, 14);
      if (older7Days.length >= 3) {
        const recentAvg = recent7Days.reduce((s, l) => s + l.sleep_quality, 0) / recent7Days.length;
        const olderAvg = older7Days.reduce((s, l) => s + l.sleep_quality, 0) / older7Days.length;
        if (olderAvg - recentAvg > 1) {
          return { shouldRegenerate: true, reason: 'trend_worsening' };
        }
      }
    }
  }

  // 6. Plan is older than 7 days (even if not expired)
  const planAgeDays = (now.getTime() - planGeneratedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (planAgeDays > 7) {
    return { shouldRegenerate: true, reason: 'stale' };
  }

  return { shouldRegenerate: false, reason: 'up_to_date' };
}