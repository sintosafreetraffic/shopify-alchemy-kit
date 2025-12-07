/**
 * Engagement Evaluate Edge Function
 * 
 * Evaluates user engagement metrics and updates engagement_meta.
 * 
 * Access is gated via hasSleepCoachAccess.
 * All queries use the authenticated user's email.
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
  hasSleepCoachAccess,
  createAuthErrorResponse,
  createAccessDeniedResponse,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load environment variables using centralized helper
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');

    // Authenticate user using centralized auth helper
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Unauthorized', authResult.status);
    }

    // Use authenticated user's email - ignore any email in request body
    const email = authResult.user.email;
    const userId = authResult.user.id;

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check Sleep Coach access
    const accessResult = await hasSleepCoachAccess(supabase, email, userId);
    if (!accessResult.hasAccess) {
      return createAccessDeniedResponse();
    }

    console.log(`[engagement-evaluate] Evaluating for authenticated user: ${email}`);

    // Get recent logs using authenticated email only
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(14);

    // Get engagement meta
    const { data: meta } = await supabase
      .from('engagement_meta')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Calculate metrics
    const now = new Date();
    const lastLog = logs?.[0];
    const daysSinceLastLog = lastLog 
      ? Math.floor((now.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const inactivityDetected = daysSinceLastLog >= 3;
    
    // Calculate streak based on unique days the user actually logged (created_at), not sleep dates
    let streak = 0;
    if (logs && logs.length > 0) {
      const loggingDays = new Set<string>();
      logs.forEach(log => {
        const createdAt = new Date(log.created_at);
        const dayKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
        loggingDays.add(dayKey);
      });
      
      const sortedLoggingDays = Array.from(loggingDays)
        .map(key => {
          const [year, month, day] = key.split('-').map(Number);
          return new Date(year, month, day);
        })
        .sort((a, b) => b.getTime() - a.getTime());
      
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (const logDate of sortedLoggingDays) {
        logDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streak++;
          currentDate = logDate;
        } else {
          break;
        }
      }
    }

    // Analyze trends
    const recentLogs = logs?.slice(0, 7) || [];
    const olderLogs = logs?.slice(7, 14) || [];
    
    let declineDetected = false;
    let improvementDetected = false;
    
    if (recentLogs.length >= 3 && olderLogs.length >= 3) {
      const recentAvg = recentLogs.reduce((s, l) => s + l.sleep_quality, 0) / recentLogs.length;
      const olderAvg = olderLogs.reduce((s, l) => s + l.sleep_quality, 0) / olderLogs.length;
      
      if (olderAvg - recentAvg > 0.5) declineDetected = true;
      if (recentAvg - olderAvg > 0.5) improvementDetected = true;
    }

    // Update engagement meta using authenticated email
    const { error: upsertError } = await supabase
      .from('engagement_meta')
      .upsert({
        email,
        last_evaluation_at: now.toISOString(),
        total_streak_days: streak,
        inactivity_detected: inactivityDetected,
        decline_detected: declineDetected,
        improvement_detected: improvementDetected,
        updated_at: now.toISOString(),
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error('[engagement-evaluate] Upsert error:', upsertError);
    }

    console.log(`[engagement-evaluate] Complete: streak=${streak}, inactive=${inactivityDetected}, decline=${declineDetected}`);

    return createSuccessResponse({
      email,
      streak,
      daysSinceLastLog,
      inactivityDetected,
      declineDetected,
      improvementDetected,
      logsCount: logs?.length || 0,
    });
  } catch (error: any) {
    console.error('[engagement-evaluate] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});
