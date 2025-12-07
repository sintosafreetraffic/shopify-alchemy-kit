/**
 * Affiliate API Edge Function
 * 
 * Handles affiliate operations: get, become, check-invite, track-referral, record-commission.
 * Uses centralized env/auth helpers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { 
  corsHeaders, 
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import { authenticateRequest, createAuthErrorResponse } from "../_shared/auth.ts";

// Input validation schema
const actionSchema = z.object({
  action: z.enum([
    'get-affiliate',
    'become-affiliate',
    'check-invite-code',
    'track-referral',
    'record-commission'
  ]),
  data: z.record(z.unknown()).optional(),
});

// Sub-schemas for each action
const becomeAffiliateDataSchema = z.object({
  inviteCode: z.string().max(50, "Invite code too long").optional(),
});

const checkInviteCodeDataSchema = z.object({
  inviteCode: z.string().min(1, "Invite code required").max(50, "Invite code too long"),
});

const trackReferralDataSchema = z.object({
  referralCode: z.string().min(1, "Referral code required").max(50, "Referral code too long"),
  referredUserId: z.string().uuid("Invalid user ID").optional(),
});

const recordCommissionDataSchema = z.object({
  affiliateId: z.string().uuid("Invalid affiliate ID"),
  orderId: z.string().min(1).max(100, "Order ID too long"),
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount too large"),
  level: z.number().int().min(1).max(2),
});

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load environment variables using centralized helper
    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = requireEnvVar('SUPABASE_ANON_KEY');
    const KLAVIYO_PRIVATE_API_KEY = getEnvVar('KLAVIYO_PRIVATE_API_KEY');
    
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user using centralized auth helper
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, supabaseUrl, supabaseAnonKey);
    
    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Unauthorized', authResult.status);
    }

    const user = authResult.user;
    console.log('[affiliate-api] Authenticated user:', user.id);

    // Validate input
    const rawBody = await req.json();
    const parseResult = actionSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("[affiliate-api] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
    }
    
    const { action, data } = parseResult.data;
    console.log('[affiliate-api] Action:', action);

    switch (action) {
      case 'get-affiliate': {
        const { data: affiliate, error } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[affiliate-api] Error fetching affiliate:', error);
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
            console.error('[affiliate-api] Error fetching commissions:', commError);
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
            .eq('level', 1)
            .gte('created_at', thirtyDaysAgo.toISOString());

          if (!salesError && directSalesData) {
            directSalesLast30Days = directSalesData.length;
          }

          const isDiamond = affiliate.status === 'diamond';
          tierInfo = calculateTier(directSalesLast30Days, isDiamond);

          // Fetch sub-affiliates
          const { data: subAffiliatesData, error: subError } = await supabaseAdmin
            .from('affiliates')
            .select('id, referral_code, total_referrals, total_commissions, created_at, status')
            .eq('parent_affiliate_id', affiliate.id)
            .order('created_at', { ascending: false });

          if (!subError && subAffiliatesData) {
            const subAffiliateIds = subAffiliatesData.map(sa => sa.id);
            
            const { data: subAffiliateUsers } = await supabaseAdmin
              .from('affiliates')
              .select('id, user_id')
              .in('id', subAffiliateIds);

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
        }

        return createSuccessResponse({ 
          affiliate, 
          commissions, 
          tierInfo,
          directSalesLast30Days,
          subAffiliates
        });
      }

      case 'become-affiliate': {
        const validatedData = becomeAffiliateDataSchema.safeParse(data || {});
        const inviteCode = validatedData.success ? validatedData.data.inviteCode : undefined;
        
        // Check if user is already an affiliate
        const { data: existingAffiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingAffiliate) {
          return createErrorResponse('You are already an affiliate', 400);
        }

        // Find parent affiliate if invite code provided
        let parentAffiliateId = null;
        if (inviteCode) {
          const { data: parentAffiliate } = await supabaseAdmin
            .from('affiliates')
            .select('id, user_id')
            .eq('referral_code', inviteCode)
            .maybeSingle();

          if (parentAffiliate && parentAffiliate.user_id !== user.id) {
            parentAffiliateId = parentAffiliate.id;
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
          console.error('[affiliate-api] Error creating affiliate:', error);
          throw error;
        }

        // Send Klaviyo notifications
        if (KLAVIYO_PRIVATE_API_KEY) {
          // Notify parent affiliate
          if (parentAffiliateId) {
            try {
              const { data: parentAffiliateData } = await supabaseAdmin
                .from('affiliates')
                .select('user_id')
                .eq('id', parentAffiliateId)
                .single();

              if (parentAffiliateData) {
                const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
                const parentUser = authUsers?.users?.find((u: any) => u.id === parentAffiliateData.user_id);
                
                if (parentUser?.email) {
                  await fetch('https://a.klaviyo.com/api/events/', {
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
                  console.log('[Klaviyo] Notification sent to parent affiliate');
                }
              }
            } catch (klaviyoError) {
              console.error('[Klaviyo] Error sending notification:', klaviyoError);
            }
          }

          // Welcome email to new affiliate
          if (user.email) {
            try {
              await fetch('https://a.klaviyo.com/api/events/', {
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
              console.log('[Klaviyo] Welcome email sent to new affiliate');
            } catch (welcomeError) {
              console.error('[Klaviyo] Error sending welcome email:', welcomeError);
            }
          }
        }

        const tierInfo = calculateTier(0, false);
        return createSuccessResponse({ affiliate, tierInfo, directSalesLast30Days: 0, subAffiliates: [] });
      }

      case 'check-invite-code': {
        const validatedData = checkInviteCodeDataSchema.safeParse(data);
        if (!validatedData.success) {
          return createSuccessResponse({ valid: false, error: 'No invite code provided' });
        }
        const { inviteCode } = validatedData.data;

        const { data: parentAffiliate, error } = await supabaseAdmin
          .from('affiliates')
          .select('id, referral_code')
          .eq('referral_code', inviteCode)
          .maybeSingle();

        if (error || !parentAffiliate) {
          return createSuccessResponse({ valid: false, error: 'Invalid invite code' });
        }

        return createSuccessResponse({ valid: true });
      }

      case 'track-referral': {
        const validatedData = trackReferralDataSchema.safeParse(data);
        if (!validatedData.success) {
          return createErrorResponse("Invalid input", 400);
        }
        const { referralCode, referredUserId } = validatedData.data;

        const { data: affiliate, error: affError } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('referral_code', referralCode)
          .single();

        if (affError || !affiliate) {
          return createErrorResponse('Invalid referral code', 400);
        }

        const { error: refError } = await supabaseAdmin
          .from('referrals')
          .insert({
            affiliate_id: affiliate.id,
            referred_user_id: referredUserId,
            referral_code: referralCode,
            status: 'pending'
          });

        if (refError) {
          console.error('[affiliate-api] Error creating referral:', refError);
          throw refError;
        }

        await supabaseAdmin
          .from('affiliates')
          .update({ total_referrals: (affiliate.total_referrals || 0) + 1 })
          .eq('id', affiliate.id);

        return createSuccessResponse({ success: true });
      }

      case 'record-commission': {
        const validatedData = recordCommissionDataSchema.safeParse(data);
        if (!validatedData.success) {
          return createErrorResponse("Invalid input", 400);
        }
        const { affiliateId, orderId, amount, level } = validatedData.data;

        // Check for duplicate commission
        const { data: existingCommission } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('order_id', orderId)
          .maybeSingle();

        if (existingCommission) {
          return createErrorResponse('Commission already recorded for this order', 400);
        }

        // Get affiliate for tier calculation
        const { data: affiliate, error: affError } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('id', affiliateId)
          .single();

        if (affError || !affiliate) {
          return createErrorResponse('Affiliate not found', 404);
        }

        // Calculate tier-based commission rate
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: directSalesData } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('level', 1)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const directSalesLast30Days = directSalesData?.length || 0;
        const tierInfo = calculateTier(directSalesLast30Days, affiliate.status === 'diamond');
        
        // Apply tier rate for level 1, fixed 5% for level 2
        const commissionRate = level === 1 ? tierInfo.commissionRate : 5;
        const commissionAmount = (amount * commissionRate) / 100;

        // Record commission
        const { error: commError } = await supabaseAdmin
          .from('commissions')
          .insert({
            affiliate_id: affiliateId,
            order_id: orderId,
            amount: commissionAmount,
            level,
            status: 'pending'
          });

        if (commError) {
          console.error('[affiliate-api] Error recording commission:', commError);
          throw commError;
        }

        // Update affiliate totals
        await supabaseAdmin
          .from('affiliates')
          .update({
            total_commissions: (affiliate.total_commissions || 0) + commissionAmount,
            total_referrals: level === 1 ? (affiliate.total_referrals || 0) + 1 : affiliate.total_referrals
          })
          .eq('id', affiliateId);

        // Process level 2 commission for parent affiliate
        if (level === 1 && affiliate.parent_affiliate_id) {
          const level2Amount = (amount * 5) / 100;
          await supabaseAdmin.from('commissions').insert({
            affiliate_id: affiliate.parent_affiliate_id,
            order_id: orderId,
            amount: level2Amount,
            level: 2,
            status: 'pending'
          });

          const { data: parentAffiliate } = await supabaseAdmin
            .from('affiliates')
            .select('total_commissions')
            .eq('id', affiliate.parent_affiliate_id)
            .single();

          if (parentAffiliate) {
            await supabaseAdmin
              .from('affiliates')
              .update({ total_commissions: (parentAffiliate.total_commissions || 0) + level2Amount })
              .eq('id', affiliate.parent_affiliate_id);
          }
        }

        return createSuccessResponse({ success: true, commissionAmount, tier: tierInfo.tier });
      }

      default:
        return createErrorResponse('Unknown action', 400);
    }
  } catch (error: any) {
    console.error('[affiliate-api] Error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
});
