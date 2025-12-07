/**
 * Coach Sleep Plan Edge Function
 * 
 * Retrieves the user's sleep plan, profile, and recent logs.
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

    // Use authenticated user's email - ignore any email in query params
    const email = authResult.user.email;
    const userId = authResult.user.id;

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check Sleep Coach access
    const accessResult = await hasSleepCoachAccess(supabase, email, userId);
    if (!accessResult.hasAccess) {
      return createAccessDeniedResponse();
    }

    console.log(`[coach-sleep-plan] Fetching for authenticated user: ${email}`);

    // Fetch latest plan using authenticated email only
    const { data: plan, error: planError } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('email', email)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error('[coach-sleep-plan] Error fetching plan:', planError);
      throw planError;
    }

    // Fetch profile using authenticated email only
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Fetch recent logs using authenticated email only
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(7);

    console.log(`[coach-sleep-plan] Found: plan=${!!plan}, profile=${!!profile}, logs=${logs?.length || 0}`);

    return createSuccessResponse({
      plan,
      profile,
      recentLogs: logs || [],
      hasPlan: !!plan,
    });
  } catch (error: any) {
    console.error('[coach-sleep-plan] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});
