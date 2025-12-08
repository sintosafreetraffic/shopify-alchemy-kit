/**
 * Affiliate API Edge Function
 * 
 * Handles affiliate operations: get, become, check-invite, track-referral, record-commission.
 * Enhanced with tiered commissions, fraud protection, and Klaviyo integration.
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
    'record-commission',
    'get-leaderboard',
    'get-analytics',
    'process-payout',
    'get-goals',
    'set-goal',
    'get-resources'
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
  customerEmail: z.string().email().optional(),
  customerIp: z.string().max(45).optional(),
});

// =====================================================
// NEW TIER SYSTEM: 10% base, 15% silver, 20% gold, 25% platinum
// =====================================================
interface TierInfo {
  tier: string;
  commissionRate: number;
  nextTier: string | null;
  salesNeeded: number;
}

function calculateTier(directSalesLast30Days: number, isDiamond: boolean): TierInfo {
  if (isDiamond) {
    return { tier: 'diamond', commissionRate: 25, nextTier: null, salesNeeded: 0 };
  }
  if (directSalesLast30Days >= 50) {
    return { tier: 'platinum', commissionRate: 25, nextTier: 'diamond (invite only)', salesNeeded: 0 };
  }
  if (directSalesLast30Days >= 25) {
    return { tier: 'gold', commissionRate: 20, nextTier: 'platinum', salesNeeded: 50 - directSalesLast30Days };
  }
  if (directSalesLast30Days >= 10) {
    return { tier: 'silver', commissionRate: 15, nextTier: 'gold', salesNeeded: 25 - directSalesLast30Days };
  }
  return { tier: 'bronze', commissionRate: 10, nextTier: 'silver', salesNeeded: 10 - directSalesLast30Days };
}

// =====================================================
// FRAUD PROTECTION HELPERS
// =====================================================
interface FraudCheckResult {
  isFraudulent: boolean;
  reason: string | null;
}

async function checkForFraud(
  supabaseAdmin: any,
  affiliateId: string,
  affiliateUserId: string,
  customerEmail: string | undefined,
  customerIp: string | undefined,
  orderId: string
): Promise<FraudCheckResult> {
  // Get affiliate's user email
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const affiliateUser = authUsers?.users?.find((u: any) => u.id === affiliateUserId);
  const affiliateEmail = affiliateUser?.email?.toLowerCase();

  // 1. Block self-referrals (same email)
  if (customerEmail && affiliateEmail && customerEmail.toLowerCase() === affiliateEmail) {
    return { isFraudulent: true, reason: 'self_referral_email' };
  }

  // 2. Check for repeated purchases within 6 hours with same affiliate code
  if (customerEmail || customerIp) {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: recentCommissions } = await supabaseAdmin
      .from('commissions')
      .select('id, customer_email, customer_ip, created_at')
      .eq('affiliate_id', affiliateId)
      .eq('level', 1)
      .gte('created_at', sixHoursAgo.toISOString())
      .neq('order_id', orderId);

    if (recentCommissions && recentCommissions.length > 0) {
      for (const comm of recentCommissions) {
        // Same email AND same IP = likely fraud
        if (customerEmail && customerIp && 
            comm.customer_email === customerEmail.toLowerCase() && 
            comm.customer_ip === customerIp) {
          return { isFraudulent: true, reason: 'repeated_purchase_same_identity' };
        }
      }
    }
  }

  return { isFraudulent: false, reason: null };
}

// =====================================================
// KLAVIYO EVENT HELPERS
// =====================================================
async function sendKlaviyoEvent(
  apiKey: string,
  email: string,
  eventName: string,
  properties: Record<string, unknown>
) {
  try {
    await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            metric: { data: { type: 'metric', attributes: { name: eventName } } },
            profile: { data: { type: 'profile', attributes: { email } } },
            properties,
            time: new Date().toISOString(),
          },
        },
      }),
    });
    console.log(`[Klaviyo] Event ${eventName} sent to ${email}`);
  } catch (error) {
    console.error(`[Klaviyo] Error sending ${eventName}:`, error);
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================
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
        let monthlyStats = { sales: 0, revenue: 0 };
        let topProducts: Record<string, number> = {};

        if (affiliate) {
          // Fetch all commissions (excluding flagged fraud)
          const { data: commissionsData, error: commError } = await supabaseAdmin
            .from('commissions')
            .select('*')
            .eq('affiliate_id', affiliate.id)
            .eq('fraud_flag', false)
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
            .select('id, order_amount')
            .eq('affiliate_id', affiliate.id)
            .eq('level', 1)
            .eq('fraud_flag', false)
            .gte('created_at', thirtyDaysAgo.toISOString());

          if (!salesError && directSalesData) {
            directSalesLast30Days = directSalesData.length;
            monthlyStats.sales = directSalesData.length;
            monthlyStats.revenue = directSalesData.reduce((sum, c) => sum + (Number(c.order_amount) || 0), 0);
          }

          const isDiamond = affiliate.tier === 'diamond' || affiliate.status === 'diamond';
          tierInfo = calculateTier(directSalesLast30Days, isDiamond);

          // Fetch sub-affiliates
          const { data: subAffiliatesData, error: subError } = await supabaseAdmin
            .from('affiliates')
            .select('id, referral_code, total_referrals, total_commissions, created_at, status, tier')
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

          // Calculate commission breakdown by level
          const level1Commissions = commissions.filter(c => c.level === 1);
          const level2Commissions = commissions.filter(c => c.level === 2);
          const pendingCommissions = commissions.filter(c => c.status === 'pending');
          const paidCommissions = commissions.filter(c => c.status === 'paid');

          const commissionBreakdown = {
            level1: {
              count: level1Commissions.length,
              total: level1Commissions.reduce((sum, c) => sum + Number(c.amount), 0)
            },
            level2: {
              count: level2Commissions.length,
              total: level2Commissions.reduce((sum, c) => sum + Number(c.amount), 0)
            },
            pending: {
              count: pendingCommissions.length,
              total: pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0)
            },
            paid: {
              count: paidCommissions.length,
              total: paidCommissions.reduce((sum, c) => sum + Number(c.amount), 0)
            }
          };

          return createSuccessResponse({ 
            affiliate, 
            commissions, 
            tierInfo,
            directSalesLast30Days,
            subAffiliates,
            monthlyStats,
            commissionBreakdown,
            topProducts: [] // Could be populated from order data if available
          });
        }

        return createSuccessResponse({ 
          affiliate: null, 
          commissions: [], 
          tierInfo,
          directSalesLast30Days: 0,
          subAffiliates: [],
          monthlyStats: { sales: 0, revenue: 0 },
          commissionBreakdown: {
            level1: { count: 0, total: 0 },
            level2: { count: 0, total: 0 },
            pending: { count: 0, total: 0 },
            paid: { count: 0, total: 0 }
          },
          topProducts: []
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
            tier: 'bronze',
            monthly_sales_count: 0,
            monthly_revenue_generated: 0,
            parent_affiliate_id: parentAffiliateId
          })
          .select()
          .single();

        if (error) {
          console.error('[affiliate-api] Error creating affiliate:', error);
          throw error;
        }

        // Send Klaviyo events
        if (KLAVIYO_PRIVATE_API_KEY && user.email) {
          // RBN_Affiliate_Joined event
          await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, user.email, 'RBN_Affiliate_Joined', {
            affiliate_code: referralCode,
            tier: 'bronze',
            earnings: 0,
            monthly_performance: { sales: 0, revenue: 0 },
            referral_link: `https://www.risebynight.com?ref=${referralCode}`,
            invite_link: `https://www.risebynight.com/affiliate-dashboard?invite=${referralCode}`,
            joined_at: new Date().toISOString(),
          });

          // Notify parent affiliate
          if (parentAffiliateId) {
            const { data: parentAffiliateData } = await supabaseAdmin
              .from('affiliates')
              .select('user_id')
              .eq('id', parentAffiliateId)
              .single();

            if (parentAffiliateData) {
              const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
              const parentUser = authUsers?.users?.find((u: any) => u.id === parentAffiliateData.user_id);
              
              if (parentUser?.email) {
                await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, parentUser.email, 'RBN_SubAffiliate_Joined', {
                  new_affiliate_email: user.email,
                  new_affiliate_referral_code: referralCode,
                  joined_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        const tierInfo = calculateTier(0, false);
        return createSuccessResponse({ 
          affiliate, 
          tierInfo, 
          directSalesLast30Days: 0, 
          subAffiliates: [],
          monthlyStats: { sales: 0, revenue: 0 },
          commissionBreakdown: {
            level1: { count: 0, total: 0 },
            level2: { count: 0, total: 0 },
            pending: { count: 0, total: 0 },
            paid: { count: 0, total: 0 }
          }
        });
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
        const { affiliateId, orderId, amount, level, customerEmail, customerIp } = validatedData.data;

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

        // Get affiliate for tier calculation and fraud check
        const { data: affiliate, error: affError } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('id', affiliateId)
          .single();

        if (affError || !affiliate) {
          return createErrorResponse('Affiliate not found', 404);
        }

        // FRAUD PROTECTION CHECK
        const fraudCheck = await checkForFraud(
          supabaseAdmin,
          affiliateId,
          affiliate.user_id,
          customerEmail,
          customerIp,
          orderId
        );

        // Calculate tier-based commission rate
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: directSalesData } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('level', 1)
          .eq('fraud_flag', false)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const directSalesLast30Days = directSalesData?.length || 0;
        const isDiamond = affiliate.tier === 'diamond' || affiliate.status === 'diamond';
        const tierInfo = calculateTier(directSalesLast30Days, isDiamond);
        
        // Apply tier rate for level 1, fixed 5% for level 2
        const commissionRate = level === 1 ? tierInfo.commissionRate : 5;
        const commissionAmount = (amount * commissionRate) / 100;

        // Record commission (with fraud flag if detected)
        const { error: commError } = await supabaseAdmin
          .from('commissions')
          .insert({
            affiliate_id: affiliateId,
            order_id: orderId,
            amount: commissionAmount,
            order_amount: amount,
            level,
            status: fraudCheck.isFraudulent ? 'flagged' : 'pending',
            fraud_flag: fraudCheck.isFraudulent,
            fraud_reason: fraudCheck.reason,
            customer_email: customerEmail?.toLowerCase(),
            customer_ip: customerIp
          });

        if (commError) {
          console.error('[affiliate-api] Error recording commission:', commError);
          throw commError;
        }

        // Only update totals if not fraudulent
        if (!fraudCheck.isFraudulent) {
          await supabaseAdmin
            .from('affiliates')
            .update({
              total_commissions: (affiliate.total_commissions || 0) + commissionAmount,
              total_referrals: level === 1 ? (affiliate.total_referrals || 0) + 1 : affiliate.total_referrals,
              monthly_sales_count: (affiliate.monthly_sales_count || 0) + (level === 1 ? 1 : 0),
              monthly_revenue_generated: (affiliate.monthly_revenue_generated || 0) + (level === 1 ? amount : 0)
            })
            .eq('id', affiliateId);

          // Send Klaviyo event for first sale
          if (KLAVIYO_PRIVATE_API_KEY && level === 1) {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const affiliateUser = authUsers?.users?.find((u: any) => u.id === affiliate.user_id);
            
            if (affiliateUser?.email) {
              // Check if this is first sale
              const { data: allCommissions } = await supabaseAdmin
                .from('commissions')
                .select('id')
                .eq('affiliate_id', affiliateId)
                .eq('level', 1)
                .eq('fraud_flag', false);

              if (allCommissions && allCommissions.length === 1) {
                await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, affiliateUser.email, 'RBN_Affiliate_First_Sale', {
                  affiliate_code: affiliate.referral_code,
                  tier: tierInfo.tier,
                  earnings: commissionAmount,
                  order_amount: amount,
                  monthly_performance: { 
                    sales: directSalesLast30Days + 1, 
                    revenue: (affiliate.monthly_revenue_generated || 0) + amount 
                  },
                  first_sale_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        // Process level 2 commission for parent affiliate
        if (level === 1 && affiliate.parent_affiliate_id && !fraudCheck.isFraudulent) {
          const level2Amount = (amount * 5) / 100;
          await supabaseAdmin.from('commissions').insert({
            affiliate_id: affiliate.parent_affiliate_id,
            order_id: orderId,
            amount: level2Amount,
            order_amount: amount,
            level: 2,
            status: 'pending',
            fraud_flag: false,
            customer_email: customerEmail?.toLowerCase(),
            customer_ip: customerIp
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

        return createSuccessResponse({ 
          success: true, 
          commissionAmount, 
          tier: tierInfo.tier,
          fraudFlagged: fraudCheck.isFraudulent,
          fraudReason: fraudCheck.reason
        });
      }

      case 'get-leaderboard': {
        // Get current user's affiliate record (if any)
        const { data: currentAffiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id, referral_code')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!currentAffiliate) {
          // User is not an affiliate
          return createSuccessResponse({
            is_affiliate: false,
            leaderboard: [],
            message: 'Join the affiliate program to appear on the leaderboard.'
          });
        }

        // Get top 10 affiliates by monthly_revenue_generated
        const { data: topAffiliates, error: leaderboardError } = await supabaseAdmin
          .from('affiliates')
          .select('id, referral_code, tier, monthly_sales_count, monthly_revenue_generated, total_commissions')
          .eq('status', 'active')
          .order('monthly_revenue_generated', { ascending: false })
          .limit(10);

        if (leaderboardError) {
          console.error('[affiliate-api] Error fetching leaderboard:', leaderboardError);
          throw leaderboardError;
        }

        // Build privacy-safe leaderboard
        const leaderboard = (topAffiliates || []).map((affiliate, index) => {
          const isCurrentUser = affiliate.id === currentAffiliate.id;
          // Create anonymized display label using last 4 chars of referral code
          const codeSnippet = affiliate.referral_code.slice(-4).toUpperCase();
          
          return {
            rank: index + 1,
            display_label: isCurrentUser ? 'You' : `Partner #${codeSnippet}`,
            tier: affiliate.tier || 'bronze',
            monthly_sales_count: affiliate.monthly_sales_count || 0,
            monthly_revenue_generated: affiliate.monthly_revenue_generated || 0,
            total_commissions: affiliate.total_commissions || 0,
            is_current_user: isCurrentUser
          };
        });

        return createSuccessResponse({
          is_affiliate: true,
          leaderboard,
          current_user_referral_code: currentAffiliate.referral_code
        });
      }

      case 'get-analytics': {
        // Get current user's affiliate record
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!affiliate) {
          return createSuccessResponse({
            analytics: {
              daily: [],
              totals: { total_30d_sales: 0, total_30d_commissions: 0 }
            }
          });
        }

        // Get commissions for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: commissions, error: commError } = await supabaseAdmin
          .from('commissions')
          .select('amount, created_at, level')
          .eq('affiliate_id', affiliate.id)
          .eq('level', 1)
          .eq('fraud_flag', false)
          .in('status', ['pending', 'approved', 'paid'])
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (commError) {
          console.error('[affiliate-api] Error fetching analytics:', commError);
          throw commError;
        }

        // Group by day
        const dailyMap: Record<string, { sales_count: number; commission_amount: number }> = {};
        
        // Initialize all 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap[dateStr] = { sales_count: 0, commission_amount: 0 };
        }

        // Aggregate commissions
        let total30dSales = 0;
        let total30dCommissions = 0;

        for (const comm of commissions || []) {
          const dateStr = new Date(comm.created_at).toISOString().split('T')[0];
          if (dailyMap[dateStr]) {
            dailyMap[dateStr].sales_count += 1;
            dailyMap[dateStr].commission_amount += Number(comm.amount) || 0;
          }
          total30dSales += 1;
          total30dCommissions += Number(comm.amount) || 0;
        }

        const daily = Object.entries(dailyMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return createSuccessResponse({
          analytics: {
            daily,
            totals: {
              total_30d_sales: total30dSales,
              total_30d_commissions: total30dCommissions
            }
          }
        });
      }

      case 'process-payout': {
        // This action requires admin privileges
        const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return createErrorResponse('Admin privileges required', 403);
        }

        const affiliateId = (data as any)?.affiliateId;
        if (!affiliateId) {
          return createErrorResponse('affiliateId required', 400);
        }

        // Get affiliate data
        const { data: affiliate, error: affError } = await supabaseAdmin
          .from('affiliates')
          .select('*')
          .eq('id', affiliateId)
          .single();

        if (affError || !affiliate) {
          return createErrorResponse('Affiliate not found', 404);
        }

        const payoutAmount = affiliate.pending_payout_amount || 0;
        if (payoutAmount <= 0) {
          return createErrorResponse('No pending payout amount', 400);
        }

        // Step A: Select eligible commissions
        const { data: eligibleCommissions, error: fetchError } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('fraud_flag', false)
          .in('status', ['pending', 'approved']);

        if (fetchError) {
          throw new Error(`Failed to fetch commissions: ${fetchError.message}`);
        }

        // Step B: Mark those commissions as paid
        if (eligibleCommissions && eligibleCommissions.length > 0) {
          const commissionIds = eligibleCommissions.map((c) => c.id);
          const { error: updateCommError } = await supabaseAdmin
            .from('commissions')
            .update({ status: 'paid' })
            .in('id', commissionIds);

          if (updateCommError) {
            throw new Error(`Failed to update commissions: ${updateCommError.message}`);
          }
        }

        const processedAt = new Date().toISOString();

        // Step C: Insert payout record
        const { error: payoutInsertError } = await supabaseAdmin
          .from('affiliate_payouts')
          .insert({
            affiliate_id: affiliateId,
            amount: payoutAmount,
            currency: 'USD',
            processed_at: processedAt,
            processed_by_user_id: user.id,
            method: 'manual_review',
            note: null
          });

        if (payoutInsertError) {
          console.error('[affiliate-api] Error inserting payout record:', payoutInsertError);
          // Continue even if payout record fails - the commission updates are more important
        }

        // Step D: Update affiliate row - reset pending, set last_payout_at
        const { error: updateAffError } = await supabaseAdmin
          .from('affiliates')
          .update({
            pending_payout_amount: 0,
            last_payout_at: processedAt,
          })
          .eq('id', affiliateId);

        if (updateAffError) {
          throw new Error(`Failed to update affiliate: ${updateAffError.message}`);
        }

        // Step E: Send Klaviyo event
        if (KLAVIYO_PRIVATE_API_KEY) {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          const affiliateUser = authUsers?.users?.find((u: any) => u.id === affiliate.user_id);
          
          if (affiliateUser?.email) {
            await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, affiliateUser.email, 'RBN_Affiliate_Payout_Processed', {
              affiliate_code: affiliate.referral_code,
              tier: affiliate.tier || 'bronze',
              payout_amount: payoutAmount,
              total_commissions: (affiliate.total_commissions || 0),
              pending_payout_amount: 0,
              payout_threshold: affiliate.payout_threshold || 50,
              monthly_performance: {
                sales_count: affiliate.monthly_sales_count || 0,
                revenue_generated: affiliate.monthly_revenue_generated || 0
              },
              processed_at: processedAt,
              processed_by_admin: {
                admin_user_id: user.id
              },
              payout_mode: 'manual',
              payout_method: 'manual_review'
            });
          }
        }

        return createSuccessResponse({ 
          success: true, 
          payout_amount: payoutAmount,
          processed_at: processedAt
        });
      }

      case 'get-goals': {
        // Get current user's affiliate record
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!affiliate) {
          return createSuccessResponse({ goals: [] });
        }

        const today = new Date().toISOString().split('T')[0];

        // Get active goals (where today is within period)
        const { data: goals, error: goalsError } = await supabaseAdmin
          .from('affiliate_goals')
          .select('*')
          .eq('affiliate_id', affiliate.id)
          .lte('period_start', today)
          .gte('period_end', today)
          .order('created_at', { ascending: false });

        if (goalsError) {
          console.error('[affiliate-api] Error fetching goals:', goalsError);
          throw goalsError;
        }

        // Get 30-day analytics for progress calculation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: commissions } = await supabaseAdmin
          .from('commissions')
          .select('amount, order_amount')
          .eq('affiliate_id', affiliate.id)
          .eq('level', 1)
          .eq('fraud_flag', false)
          .in('status', ['pending', 'approved', 'paid'])
          .gte('created_at', thirtyDaysAgo.toISOString());

        const total30dCommissions = (commissions || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const total30dRevenue = (commissions || []).reduce((sum, c) => sum + (Number(c.order_amount) || 0), 0);

        // Add progress to each goal
        const goalsWithProgress = (goals || []).map(goal => {
          let currentProgress = 0;
          if (goal.goal_type === '30d_commission') {
            currentProgress = total30dCommissions;
          } else if (goal.goal_type === '30d_revenue') {
            currentProgress = total30dRevenue;
          }
          return {
            ...goal,
            current_progress: currentProgress,
            progress_percentage: goal.target_amount > 0 
              ? Math.min(100, (currentProgress / goal.target_amount) * 100) 
              : 0
          };
        });

        return createSuccessResponse({ goals: goalsWithProgress });
      }

      case 'set-goal': {
        // Get current user's affiliate record
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!affiliate) {
          return createErrorResponse('Not an affiliate', 403);
        }

        const goalType = (data as any)?.goal_type || '30d_commission';
        const targetAmount = Number((data as any)?.target_amount) || 0;

        if (targetAmount <= 0) {
          return createErrorResponse('Target amount must be positive', 400);
        }

        // Define period: rolling 30-day window from today
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        const periodStartStr = periodStart.toISOString().split('T')[0];
        const periodEndStr = periodEnd.toISOString().split('T')[0];

        // Check if a goal of this type already exists for overlapping period
        const { data: existingGoals } = await supabaseAdmin
          .from('affiliate_goals')
          .select('id')
          .eq('affiliate_id', affiliate.id)
          .eq('goal_type', goalType)
          .gte('period_end', periodStartStr)
          .lte('period_start', periodEndStr);

        if (existingGoals && existingGoals.length > 0) {
          // Update existing goal
          const { data: updatedGoal, error: updateError } = await supabaseAdmin
            .from('affiliate_goals')
            .update({
              target_amount: targetAmount,
              period_start: periodStartStr,
              period_end: periodEndStr,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingGoals[0].id)
            .select()
            .single();

          if (updateError) {
            console.error('[affiliate-api] Error updating goal:', updateError);
            throw updateError;
          }

          return createSuccessResponse({ goal: updatedGoal, action: 'updated' });
        } else {
          // Create new goal
          const { data: newGoal, error: insertError } = await supabaseAdmin
            .from('affiliate_goals')
            .insert({
              affiliate_id: affiliate.id,
              goal_type: goalType,
              target_amount: targetAmount,
              currency: 'USD',
              period_start: periodStartStr,
              period_end: periodEndStr
            })
            .select()
            .single();

          if (insertError) {
            console.error('[affiliate-api] Error creating goal:', insertError);
            throw insertError;
          }

          return createSuccessResponse({ goal: newGoal, action: 'created' });
        }
      }

      case 'get-resources': {
        // Fetch all active affiliate resources
        const { data: resources, error: resourcesError } = await supabaseAdmin
          .from('affiliate_resources')
          .select('id, category, title, description, link_label, link_url, badge, sort_order')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (resourcesError) {
          console.error('[affiliate-api] Error fetching resources:', resourcesError);
          throw resourcesError;
        }

        return createSuccessResponse({ resources: resources || [] });
      }

      default:
        return createErrorResponse('Unknown action', 400);
    }
  } catch (error: any) {
    console.error('[affiliate-api] Error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
});
