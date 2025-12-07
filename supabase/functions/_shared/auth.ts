/**
 * Authentication Helper
 * 
 * Centralized authentication and authorization for edge functions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
  status: number;
}

/**
 * Extract and validate user from JWT token
 */
export async function authenticateRequest(
  authHeader: string | null,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<AuthResult> {
  if (!authHeader) {
    return {
      user: null,
      error: 'Authorization header required',
      status: 401,
    };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  
  if (authError || !user?.email) {
    console.error('[Auth] Authentication failed:', authError?.message);
    return {
      user: null,
      error: 'Invalid or expired token',
      status: 401,
    };
  }

  return {
    user: { id: user.id, email: user.email },
    error: null,
    status: 200,
  };
}

/**
 * Check if user has Sleep Coach access
 * 
 * Access is granted if:
 * - User has purchase_count > 0 in sleep_profiles
 * - User is an affiliate with 3+ sales
 * - User has an existing sleep profile (fallback)
 */
export async function hasSleepCoachAccess(
  supabase: any,
  email: string,
  userId?: string
): Promise<{ hasAccess: boolean; reason: string }> {
  // Check 1: Sleep profile with purchases
  const { data: profile } = await supabase
    .from('sleep_profiles')
    .select('email, purchase_count')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (profile?.purchase_count && profile.purchase_count > 0) {
    console.log(`[Auth] Access granted via purchase for: ${email}`);
    return { hasAccess: true, reason: 'purchase' };
  }

  // Check 2: Affiliate with 3+ sales
  if (userId) {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('total_referrals, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (affiliate && affiliate.total_referrals >= 3) {
      console.log(`[Auth] Access granted via affiliate for: ${email}`);
      return { hasAccess: true, reason: 'affiliate' };
    }
  }

  // Check 3: Existing profile (fallback for quiz completers)
  if (profile) {
    console.log(`[Auth] Access granted via profile for: ${email}`);
    return { hasAccess: true, reason: 'profile_exists' };
  }

  console.log(`[Auth] Access denied for: ${email}`);
  return { hasAccess: false, reason: 'no_access' };
}

/**
 * Create error response for authentication failures
 */
export function createAuthErrorResponse(
  error: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
