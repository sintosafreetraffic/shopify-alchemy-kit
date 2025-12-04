import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let hasAccess = false;
    let accessReason = '';
    let affiliateSales = 0;
    let hasPurchased = false;

    // Check 1: Is user an affiliate with 3+ sales?
    console.log(`Checking affiliate status for: ${email}`);
    
    // First get user_id from auth.users by email
    const { data: authUser } = await supabase
      .from('sleep_profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    // Check affiliates table - we need to match by user email through a different approach
    // Since affiliates link to user_id, we need to check if this user has an affiliate record
    const { data: affiliateData } = await supabase
      .rpc('get_affiliate_by_email', { user_email: email.toLowerCase() })
      .single();

    // If no RPC exists, try direct query approach
    if (!affiliateData) {
      // Check via auth - get user by email first
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && users) {
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (user) {
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('total_referrals, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (affiliate && affiliate.total_referrals >= 3) {
            hasAccess = true;
            accessReason = 'affiliate';
            affiliateSales = affiliate.total_referrals;
            console.log(`User is affiliate with ${affiliateSales} sales`);
          }
        }
      }
    }

    // Check 2: Has user purchased from Shopify?
    if (!hasAccess && SHOPIFY_ACCESS_TOKEN) {
      console.log(`Checking Shopify orders for: ${email}`);
      
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
            // Check if any order is paid/fulfilled
            const validOrder = ordersData.orders.find((order: any) => 
              order.financial_status === 'paid' || 
              order.financial_status === 'partially_paid' ||
              order.fulfillment_status === 'fulfilled'
            );

            if (validOrder) {
              hasAccess = true;
              accessReason = 'purchase';
              hasPurchased = true;
              console.log(`User has valid Shopify order: ${validOrder.id}`);
            }
          }
        } else {
          console.error('Shopify API error:', ordersResponse.status);
        }
      } catch (shopifyError) {
        console.error('Error checking Shopify orders:', shopifyError);
      }
    }

    // Check 3: Does user have an existing sleep profile? (fallback for demo/testing)
    if (!hasAccess) {
      const { data: profile } = await supabase
        .from('sleep_profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (profile) {
        // For now, allow access if they have a profile (from quiz)
        hasAccess = true;
        accessReason = 'profile_exists';
        console.log(`User has existing sleep profile`);
      }
    }

    console.log(`Access check complete: hasAccess=${hasAccess}, reason=${accessReason}`);

    return new Response(
      JSON.stringify({
        hasAccess,
        accessReason,
        affiliateSales,
        hasPurchased,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in verify-sleep-coach-access:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});