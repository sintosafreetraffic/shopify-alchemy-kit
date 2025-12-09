/**
 * Affiliate Monthly Summary Edge Function
 * 
 * Sends monthly summary emails to all active affiliates.
 * Requires CRON_SECRET for authorization.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsHeaders, 
  requireEnvVar,
  validateCronSecret,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

// Calculate tier based on direct sales in last 30 days
function calculateTier(directSalesLast30Days: number, isDiamond: boolean): { tier: string; commissionRate: number } {
  if (isDiamond) return { tier: 'Diamond', commissionRate: 35 };
  if (directSalesLast30Days >= 50) return { tier: 'Platinum', commissionRate: 30 };
  if (directSalesLast30Days >= 25) return { tier: 'Gold', commissionRate: 25 };
  if (directSalesLast30Days >= 10) return { tier: 'Silver', commissionRate: 20 };
  return { tier: 'Bronze', commissionRate: 15 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================================
    // AUTH BLOCK: Validate request authorization
    // Accepts either:
    //   1. Authorization: Bearer <CRON_SECRET> header (for manual/external calls)
    //   2. Internal pg_cron calls identified by:
    //      - X-Supabase-Internal: true header, OR
    //      - User-Agent containing 'pg_net' (Supabase internal HTTP client)
    // ============================================================
    const authHeader = req.headers.get('Authorization');
    const isInternalCron = req.headers.get('X-Supabase-Internal') === 'true' || 
                           (req.headers.get('User-Agent') || '').includes('pg_net');
    
    if (!isInternalCron && !validateCronSecret(authHeader)) {
      console.warn('[affiliate-monthly-summary] Unauthorized access attempt');
      return createErrorResponse('Unauthorized', 401);
    }

    // Load environment variables using centralized helper
    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar('KLAVIYO_PRIVATE_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[affiliate-monthly-summary] Starting monthly summary job...');

    // Get all active affiliates
    const { data: affiliates, error: affError } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('status', 'active');

    if (affError) {
      console.error('[affiliate-monthly-summary] Error fetching affiliates:', affError);
      throw affError;
    }

    if (!affiliates || affiliates.length === 0) {
      console.log('[affiliate-monthly-summary] No active affiliates found');
      return createSuccessResponse({ success: true, message: 'No active affiliates' });
    }

    // Get all auth users for email lookup
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userEmailMap: Record<string, string> = {};
    authUsers?.users?.forEach((u: any) => {
      userEmailMap[u.id] = u.email || '';
    });

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let summariesSent = 0;

    for (const affiliate of affiliates) {
      const email = userEmailMap[affiliate.user_id];
      if (!email) {
        console.log(`[affiliate-monthly-summary] No email found for affiliate ${affiliate.id}`);
        continue;
      }

      // Get this month's commissions
      const { data: monthCommissions } = await supabaseAdmin
        .from('commissions')
        .select('amount, level, created_at')
        .eq('affiliate_id', affiliate.id)
        .gte('created_at', monthStart.toISOString());

      // Get last month's commissions for comparison
      const { data: lastMonthCommissions } = await supabaseAdmin
        .from('commissions')
        .select('amount')
        .eq('affiliate_id', affiliate.id)
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      // Get direct sales in last 30 days for tier calculation
      const { data: directSalesData } = await supabaseAdmin
        .from('commissions')
        .select('id')
        .eq('affiliate_id', affiliate.id)
        .eq('level', 1)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get sub-affiliates count
      const { data: subAffiliates } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('parent_affiliate_id', affiliate.id);

      // Calculate stats
      const monthlyEarnings = monthCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const lastMonthEarnings = lastMonthCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const directSales = monthCommissions?.filter(c => c.level === 1).length || 0;
      const subAffiliateSales = monthCommissions?.filter(c => c.level === 2).length || 0;
      const directSalesLast30Days = directSalesData?.length || 0;
      const subAffiliateCount = subAffiliates?.length || 0;
      
      const tierInfo = calculateTier(directSalesLast30Days, affiliate.status === 'diamond');
      const earningsChange = lastMonthEarnings > 0 
        ? Math.round(((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100) 
        : 100;

      // Send monthly summary via Klaviyo
      const summaryResponse = await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              metric: { data: { type: 'metric', attributes: { name: 'RBN_Monthly_Affiliate_Summary' } } },
              profile: { data: { type: 'profile', attributes: { email } } },
              properties: {
                month_name: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                monthly_earnings: monthlyEarnings.toFixed(2),
                last_month_earnings: lastMonthEarnings.toFixed(2),
                earnings_change_percent: earningsChange,
                direct_sales_count: directSales,
                sub_affiliate_sales_count: subAffiliateSales,
                total_sales_count: directSales + subAffiliateSales,
                current_tier: tierInfo.tier,
                commission_rate: tierInfo.commissionRate,
                total_lifetime_commissions: affiliate.total_commissions,
                total_referrals: affiliate.total_referrals,
                sub_affiliate_count: subAffiliateCount,
                referral_code: affiliate.referral_code,
                referral_link: `https://www.risebynight.com?ref=${affiliate.referral_code}`,
                invite_link: `https://www.risebynight.com/affiliate-dashboard?invite=${affiliate.referral_code}`,
                generated_at: now.toISOString(),
              },
              time: now.toISOString(),
            },
          },
        }),
      });

      if (!summaryResponse.ok) {
        console.error(`[Klaviyo] Failed to send summary to ${email}:`, await summaryResponse.text());
      } else {
        summariesSent++;
        console.log(`[Klaviyo] Monthly summary sent to ${email}`);
      }
    }

    console.log(`[affiliate-monthly-summary] Completed: ${summariesSent} summaries sent`);

    return createSuccessResponse({ success: true, summaries_sent: summariesSent });
  } catch (error) {
    console.error('[affiliate-monthly-summary] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createErrorResponse(errorMessage, 500);
  }
});
