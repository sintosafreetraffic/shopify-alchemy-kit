const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('verify-sleep-coach-access: Starting');

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ hasAccess: false, accessReason: 'no_email', affiliateSales: 0, hasPurchased: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Checking access for: ${normalizedEmail}`);

    // Quick check: Does user have a sleep profile? (fastest check)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/sleep_profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=email&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles && profiles.length > 0) {
        console.log(`Access granted: profile exists (${Date.now() - startTime}ms)`);
        return new Response(
          JSON.stringify({ hasAccess: true, accessReason: 'profile_exists', affiliateSales: 0, hasPurchased: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check Shopify orders (with timeout)
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (SHOPIFY_ACCESS_TOKEN) {
      try {
        const shopifyDomain = 'lovable-project-swlbs.myshopify.com';
        const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(normalizedEmail)}&status=any&limit=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const ordersResponse = await fetch(ordersUrl, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          if (ordersData.orders && ordersData.orders.length > 0) {
            console.log(`Access granted: Shopify purchase (${Date.now() - startTime}ms)`);
            return new Response(
              JSON.stringify({ hasAccess: true, accessReason: 'purchase', affiliateSales: 0, hasPurchased: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (shopifyError) {
        console.log('Shopify check skipped:', shopifyError);
        // Don't fail on Shopify errors, continue
      }
    }

    // Default: grant access for new users to try the dashboard
    // They'll create a profile which grants permanent access
    console.log(`Access granted: new user (${Date.now() - startTime}ms)`);
    return new Response(
      JSON.stringify({ hasAccess: true, accessReason: 'new_user', affiliateSales: 0, hasPurchased: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error.message);
    // On error, grant access to avoid blocking users
    return new Response(
      JSON.stringify({ hasAccess: true, accessReason: 'error_fallback', affiliateSales: 0, hasPurchased: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
