import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { action, data } = await req.json();
    console.log('Action:', action, 'Data:', data);

    switch (action) {
      case 'get-affiliate': {
        const { data: affiliate, error } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching affiliate:', error);
          throw error;
        }

        let commissions: any[] = [];
        if (affiliate) {
          const { data: commissionsData, error: commError } = await supabaseAdmin
            .from('commissions')
            .select('*')
            .eq('affiliate_id', affiliate.id)
            .order('created_at', { ascending: false });

          if (commError) {
            console.error('Error fetching commissions:', commError);
          } else {
            commissions = commissionsData || [];
          }
        }

        return new Response(
          JSON.stringify({ affiliate, commissions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'become-affiliate': {
        // Generate unique referral code
        const referralCode = `REF${user.id.substring(0, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
        
        const { data: affiliate, error } = await supabaseAdmin
          .from('affiliates')
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            total_referrals: 0,
            total_commissions: 0,
            level: 1,
            status: 'active'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating affiliate:', error);
          throw error;
        }

        console.log('Created affiliate:', affiliate);

        return new Response(
          JSON.stringify({ affiliate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'track-referral': {
        const { referralCode, referredUserId } = data;

        // Find the affiliate with this referral code
        const { data: affiliate, error: affError } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('referral_code', referralCode)
          .single();

        if (affError || !affiliate) {
          console.error('Affiliate not found:', affError);
          return new Response(
            JSON.stringify({ error: 'Invalid referral code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create referral record
        const { error: refError } = await supabaseAdmin
          .from('referrals')
          .insert({
            affiliate_id: affiliate.id,
            referred_user_id: referredUserId,
            referral_code: referralCode,
            status: 'pending'
          });

        if (refError) {
          console.error('Error creating referral:', refError);
          throw refError;
        }

        // Update affiliate total referrals
        await supabaseAdmin
          .from('affiliates')
          .update({ total_referrals: (affiliate.total_referrals || 0) + 1 })
          .eq('id', affiliate.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'record-commission': {
        const { affiliateId, orderId, amount, level } = data;

        const { error } = await supabaseAdmin
          .from('commissions')
          .insert({
            affiliate_id: affiliateId,
            order_id: orderId,
            amount,
            level,
            status: 'pending'
          });

        if (error) {
          console.error('Error recording commission:', error);
          throw error;
        }

        // Update affiliate total commissions
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('total_commissions')
          .eq('id', affiliateId)
          .single();

        if (affiliate) {
          await supabaseAdmin
            .from('affiliates')
            .update({ total_commissions: (affiliate.total_commissions || 0) + amount })
            .eq('id', affiliateId);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
