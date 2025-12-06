import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    // Validate CRON secret for authorization
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized access attempt to affiliate-monthly-summary');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');

    if (!KLAVIYO_PRIVATE_API_KEY) {
      throw new Error('Klaviyo API key not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting monthly affiliate summary job...');

    // Get all active affiliates
    const { data: affiliates, error: affError } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('status', 'active');

    if (affError) {
      console.error('Error fetching affiliates:', affError);
      throw affError;
    }

    if (!affiliates || affiliates.length === 0) {
      console.log('No active affiliates found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active affiliates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        console.log(`No email found for affiliate ${affiliate.id}`);
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
        console.error(`Failed to send summary to ${email}:`, await summaryResponse.text());
      } else {
        summariesSent++;
        console.log(`Monthly summary sent to ${email}`);
      }
    }

    console.log(`Monthly summary job complete. Sent ${summariesSent} summaries.`);

    return new Response(
      JSON.stringify({ success: true, summaries_sent: summariesSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Monthly summary error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
