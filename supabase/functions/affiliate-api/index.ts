import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate tier based on direct sales in last 30 days
function calculateTier(directSalesLast30Days: number, isDiamond: boolean): { tier: string; commissionRate: number; nextTier: string | null; salesNeeded: number } {
  if (isDiamond) {
    return { tier: 'Diamond', commissionRate: 35, nextTier: null, salesNeeded: 0 };
  }
  if (directSalesLast30Days >= 50) {
    return { tier: 'Platinum', commissionRate: 30, nextTier: 'Diamond (invite only)', salesNeeded: 0 };
  }
  if (directSalesLast30Days >= 25) {
    return { tier: 'Gold', commissionRate: 25, nextTier: 'Platinum', salesNeeded: 50 - directSalesLast30Days };
  }
  if (directSalesLast30Days >= 10) {
    return { tier: 'Silver', commissionRate: 20, nextTier: 'Gold', salesNeeded: 25 - directSalesLast30Days };
  }
  return { tier: 'Bronze', commissionRate: 15, nextTier: 'Silver', salesNeeded: 10 - directSalesLast30Days };
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
        let directSalesLast30Days = 0;
        let tierInfo = calculateTier(0, false);
        let subAffiliates: any[] = [];

        if (affiliate) {
          // Fetch all commissions
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

          // Calculate direct sales (level 1) in last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: directSalesData, error: salesError } = await supabaseAdmin
            .from('commissions')
            .select('id')
            .eq('affiliate_id', affiliate.id)
            .eq('level', 1) // Only direct sales
            .gte('created_at', thirtyDaysAgo.toISOString());

          if (!salesError && directSalesData) {
            directSalesLast30Days = directSalesData.length;
          }

          // Check if affiliate is Diamond (invite only - stored in status or level field)
          const isDiamond = affiliate.status === 'diamond';
          tierInfo = calculateTier(directSalesLast30Days, isDiamond);

          // Fetch sub-affiliates (affiliates who have this affiliate as parent)
          const { data: subAffiliatesData, error: subError } = await supabaseAdmin
            .from('affiliates')
            .select('id, referral_code, total_referrals, total_commissions, created_at, status')
            .eq('parent_affiliate_id', affiliate.id)
            .order('created_at', { ascending: false });

          if (!subError && subAffiliatesData) {
            // For each sub-affiliate, get their email from auth.users
            const subAffiliateIds = subAffiliatesData.map(sa => sa.id);
            
            // Get user_ids for sub-affiliates
            const { data: subAffiliateUsers } = await supabaseAdmin
              .from('affiliates')
              .select('id, user_id')
              .in('id', subAffiliateIds);

            // Get emails from auth
            const userIds = subAffiliateUsers?.map(sa => sa.user_id) || [];
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            
            const userEmailMap: Record<string, string> = {};
            authUsers?.users?.forEach((u: any) => {
              if (userIds.includes(u.id)) {
                userEmailMap[u.id] = u.email || 'Unknown';
              }
            });

            subAffiliates = subAffiliatesData.map(sa => {
              const userEntry = subAffiliateUsers?.find(su => su.id === sa.id);
              return {
                ...sa,
                email: userEntry ? userEmailMap[userEntry.user_id] : 'Unknown'
              };
            });
          }

          console.log('Direct sales last 30 days:', directSalesLast30Days, 'Tier:', tierInfo.tier, 'Sub-affiliates:', subAffiliates.length);
        }

        return new Response(
          JSON.stringify({ 
            affiliate, 
            commissions, 
            tierInfo,
            directSalesLast30Days,
            subAffiliates
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'become-affiliate': {
        const { inviteCode } = data || {};
        
        // Check if user is already an affiliate
        const { data: existingAffiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingAffiliate) {
          return new Response(
            JSON.stringify({ error: 'You are already an affiliate' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find parent affiliate if invite code provided
        let parentAffiliateId = null;
        if (inviteCode) {
          const { data: parentAffiliate, error: parentError } = await supabaseAdmin
            .from('affiliates')
            .select('id, user_id')
            .eq('referral_code', inviteCode)
            .maybeSingle();

          if (parentAffiliate) {
            // Ensure user is not trying to be their own parent
            if (parentAffiliate.user_id !== user.id) {
              parentAffiliateId = parentAffiliate.id;
              console.log('Found parent affiliate:', parentAffiliateId);
            }
          }
        }

        // Generate unique referral code
        const referralCode = `REF${user.id.substring(0, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
        
        const { data: affiliate, error } = await supabaseAdmin
          .from('affiliates')
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            total_referrals: 0,
            total_commissions: 0,
            level: parentAffiliateId ? 2 : 1,
            status: 'active',
            parent_affiliate_id: parentAffiliateId
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating affiliate:', error);
          throw error;
        }

        console.log('Created affiliate:', affiliate, 'Parent:', parentAffiliateId);

        // Send Klaviyo notification to parent affiliate when sub-affiliate joins
        if (parentAffiliateId) {
          try {
            // Get parent affiliate's user_id
            const { data: parentAffiliateData } = await supabaseAdmin
              .from('affiliates')
              .select('user_id')
              .eq('id', parentAffiliateId)
              .single();

            if (parentAffiliateData) {
              // Get parent's email from auth
              const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
              const parentUser = authUsers?.users?.find((u: any) => u.id === parentAffiliateData.user_id);
              
              if (parentUser?.email) {
                const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
                
                if (KLAVIYO_PRIVATE_API_KEY) {
                  const klaviyoResponse = await fetch('https://a.klaviyo.com/api/events/', {
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
                          metric: { data: { type: 'metric', attributes: { name: 'RBN_SubAffiliate_Joined' } } },
                          profile: { data: { type: 'profile', attributes: { email: parentUser.email } } },
                          properties: {
                            new_affiliate_email: user.email || 'Unknown',
                            new_affiliate_referral_code: referralCode,
                            joined_at: new Date().toISOString(),
                          },
                          time: new Date().toISOString(),
                        },
                      },
                    }),
                  });

                  if (!klaviyoResponse.ok) {
                    console.error('Klaviyo notification failed:', await klaviyoResponse.text());
                  } else {
                    console.log('Klaviyo notification sent to parent affiliate:', parentUser.email);
                  }
                }
              }
            }
          } catch (klaviyoError) {
            console.error('Error sending Klaviyo notification:', klaviyoError);
            // Don't fail the main operation if Klaviyo fails
          }
        }

        // Send welcome email to new affiliate
        try {
          const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
          
          if (KLAVIYO_PRIVATE_API_KEY && user.email) {
            const welcomeResponse = await fetch('https://a.klaviyo.com/api/events/', {
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
                    metric: { data: { type: 'metric', attributes: { name: 'RBN_Affiliate_Welcome' } } },
                    profile: { data: { type: 'profile', attributes: { email: user.email } } },
                    properties: {
                      referral_code: referralCode,
                      referral_link: `https://www.risebynight.com?ref=${referralCode}`,
                      invite_link: `https://www.risebynight.com/affiliate-dashboard?invite=${referralCode}`,
                      joined_at: new Date().toISOString(),
                    },
                    time: new Date().toISOString(),
                  },
                },
              }),
            });

            if (!welcomeResponse.ok) {
              console.error('Welcome email notification failed:', await welcomeResponse.text());
            } else {
              console.log('Welcome email sent to new affiliate:', user.email);
            }
          }
        } catch (welcomeError) {
          console.error('Error sending welcome email:', welcomeError);
        }

        const tierInfo = calculateTier(0, false);

        return new Response(
          JSON.stringify({ affiliate, tierInfo, directSalesLast30Days: 0, subAffiliates: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-invite-code': {
        const { inviteCode } = data;
        
        if (!inviteCode) {
          return new Response(
            JSON.stringify({ valid: false, error: 'No invite code provided' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: parentAffiliate, error } = await supabaseAdmin
          .from('affiliates')
          .select('id, referral_code')
          .eq('referral_code', inviteCode)
          .maybeSingle();

        if (error || !parentAffiliate) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Invalid invite code' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ valid: true }),
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

        // Update affiliate total commissions and get affiliate details
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('total_commissions, user_id')
          .eq('id', affiliateId)
          .single();

        if (affiliate) {
          await supabaseAdmin
            .from('affiliates')
            .update({ total_commissions: (affiliate.total_commissions || 0) + amount })
            .eq('id', affiliateId);

          // Calculate tier before and after this commission (for milestone detection)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: directSalesData } = await supabaseAdmin
            .from('commissions')
            .select('id')
            .eq('affiliate_id', affiliateId)
            .eq('level', 1)
            .gte('created_at', thirtyDaysAgo.toISOString());

          const currentSales = directSalesData?.length || 0;
          const previousSales = currentSales - (level === 1 ? 1 : 0); // Subtract this sale if it's level 1
          
          const currentTier = calculateTier(currentSales, false);
          const previousTier = calculateTier(previousSales, false);

          // Send commission notification email
          try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const affiliateUser = authUsers?.users?.find((u: any) => u.id === affiliate.user_id);
            
            if (affiliateUser?.email) {
              const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
              
              if (KLAVIYO_PRIVATE_API_KEY) {
                // Send commission notification
                const commissionResponse = await fetch('https://a.klaviyo.com/api/events/', {
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
                        metric: { data: { type: 'metric', attributes: { name: 'RBN_Commission_Earned' } } },
                        profile: { data: { type: 'profile', attributes: { email: affiliateUser.email } } },
                        properties: {
                          commission_amount: amount,
                          order_id: orderId,
                          commission_level: level,
                          commission_type: level === 1 ? 'Direct Sale' : 'Sub-Affiliate Sale',
                          new_total_commissions: (affiliate.total_commissions || 0) + amount,
                          earned_at: new Date().toISOString(),
                        },
                        time: new Date().toISOString(),
                      },
                    },
                  }),
                });

                if (!commissionResponse.ok) {
                  console.error('Commission notification failed:', await commissionResponse.text());
                } else {
                  console.log('Commission notification sent to affiliate:', affiliateUser.email);
                }

                // Check for tier milestone upgrade
                if (currentTier.tier !== previousTier.tier && currentTier.tier !== 'Bronze') {
                  console.log(`Tier upgrade detected: ${previousTier.tier} -> ${currentTier.tier}`);
                  
                  const milestoneResponse = await fetch('https://a.klaviyo.com/api/events/', {
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
                          metric: { data: { type: 'metric', attributes: { name: 'RBN_Tier_Milestone_Reached' } } },
                          profile: { data: { type: 'profile', attributes: { email: affiliateUser.email } } },
                          properties: {
                            previous_tier: previousTier.tier,
                            new_tier: currentTier.tier,
                            new_commission_rate: currentTier.commissionRate,
                            previous_commission_rate: previousTier.commissionRate,
                            direct_sales_count: currentSales,
                            achieved_at: new Date().toISOString(),
                          },
                          time: new Date().toISOString(),
                        },
                      },
                    }),
                  });

                  if (!milestoneResponse.ok) {
                    console.error('Milestone notification failed:', await milestoneResponse.text());
                  } else {
                    console.log('Tier milestone notification sent:', currentTier.tier);
                  }
                }
              }
            }
          } catch (notifyError) {
            console.error('Error sending notifications:', notifyError);
          }
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
