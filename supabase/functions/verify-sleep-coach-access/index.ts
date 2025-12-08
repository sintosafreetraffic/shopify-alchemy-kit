/**
 * Verify Sleep Coach Access Edge Function
 * 
 * Checks if the authenticated user has access to Sleep Coach features.
 * 
 * Access is granted if:
 * - User has purchase_count > 0 in sleep_profiles
 * - User is an affiliate with 3+ sales
 * - User has an existing sleep profile (fallback)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  authenticateRequest,
  hasSleepCoachAccess,
  createAuthErrorResponse,
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
    const SHOPIFY_ACCESS_TOKEN = getEnvVar('SHOPIFY_ACCESS_TOKEN');

    // Authenticate user using centralized auth helper
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Unauthorized', authResult.status);
    }

    // Use authenticated user's email and ID
    const email = authResult.user.email;
    const userId = authResult.user.id;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let hasAccess = false;
    let accessReason = '';
    let affiliateSales = 0;
    let hasPurchased = false;
    let quizCompleted = false;

    console.log(`[verify-sleep-coach-access] Checking for authenticated user: ${email}`);

    // Check 1: Is user an affiliate with 3+ sales?
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('total_referrals, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (affiliate && affiliate.total_referrals >= 3) {
      hasAccess = true;
      accessReason = 'affiliate';
      affiliateSales = affiliate.total_referrals;
      console.log(`[Auth] User is affiliate with ${affiliateSales} sales`);
    }

    // Check 2: Has user purchased from Shopify?
    if (!hasAccess && SHOPIFY_ACCESS_TOKEN) {
      console.log(`[verify-sleep-coach-access] Checking Shopify orders for: ${email}`);
      
      const shopifyDomain = 'lovable-project-swlbs.myshopify.com';
      const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(email)}&status=any&limit=1`;
      
      try {
        const ordersResponse = await fetch(ordersUrl, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          
          if (ordersData.orders && ordersData.orders.length > 0) {
            const validOrder = ordersData.orders.find((order: any) => 
              order.financial_status === 'paid' || 
              order.financial_status === 'partially_paid' ||
              order.fulfillment_status === 'fulfilled'
            );

            if (validOrder) {
              hasAccess = true;
              accessReason = 'purchase';
              hasPurchased = true;
              console.log(`[Auth] User has valid Shopify order: ${validOrder.id}`);
            }
          }
        } else {
          console.error('[verify-sleep-coach-access] Shopify API error:', ordersResponse.status);
        }
      } catch (shopifyError) {
        console.error('[verify-sleep-coach-access] Error checking Shopify orders:', shopifyError);
      }
    }

    // Check 3: Does user have an existing sleep profile with quiz completed?
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('email, quiz_completed, quiz_completed_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profile) {
      quizCompleted = profile.quiz_completed === true;
      console.log(`[Auth] User has existing sleep profile, quiz_completed=${quizCompleted}`);
      
      // Only grant access via profile if they have no other qualifying reason
      // AND they've completed the quiz
      if (!hasAccess && quizCompleted) {
        hasAccess = true;
        accessReason = 'profile_exists';
      }
    }

    // Final access check: user must have qualifying reason AND completed quiz
    // If they have a qualifying reason but haven't completed quiz, deny access
    if (hasAccess && !quizCompleted) {
      console.log(`[verify-sleep-coach-access] User qualifies but quiz not completed`);
      hasAccess = false;
      accessReason = 'quiz_required';
    }

    console.log(`[verify-sleep-coach-access] Complete: hasAccess=${hasAccess}, reason=${accessReason}, quizCompleted=${quizCompleted}`);

    return createSuccessResponse({
      hasAccess,
      accessReason,
      affiliateSales,
      hasPurchased,
      quizCompleted,
    });
  } catch (error: any) {
    console.error('[verify-sleep-coach-access] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});
