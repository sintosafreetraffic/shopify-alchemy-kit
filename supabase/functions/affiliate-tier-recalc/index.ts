/**
 * Affiliate Tier Recalculation Edge Function
 * 
 * @description Recalculates all affiliate tiers based on 30-day rolling performance.
 *              Updates tier status and sends Klaviyo events for any tier changes.
 * 
 * @schedule Daily CRON job at 02:00 UTC via pg_cron
 * @endpoint POST /functions/v1/affiliate-tier-recalc
 * 
 * @auth Accepts either:
 *       - Authorization: Bearer <CRON_SECRET> header
 *       - Internal pg_cron calls identified by X-Supabase-Internal: true or pg_net User-Agent
 * 
 * @env SUPABASE_URL - Supabase project URL
 * @env SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations
 * @env KLAVIYO_PRIVATE_API_KEY - (Optional) For sending tier change events
 * @env CRON_SECRET - Secret for validating external CRON calls
 * 
 * @tierStructure
 *   - Bronze: 10% (default, 0-9 sales)
 *   - Silver: 15% (10-24 sales in last 30 days)
 *   - Gold: 20% (25-49 sales in last 30 days)
 *   - Platinum: 25% (50+ sales in last 30 days)
 *   - Diamond: 25% (invite-only, manually assigned)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsHeaders, 
  requireEnvVar,
  getEnvVar,
  validateCronSecret,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

interface TierInfo {
  tier: string;
  commissionRate: number;
}

/**
 * Calculate affiliate tier based on 30-day direct sales performance
 * Diamond status is preserved if manually set (invite-only tier)
 */
function calculateTier(directSalesLast30Days: number, isDiamond: boolean): TierInfo {
  if (isDiamond) return { tier: 'diamond', commissionRate: 25 };
  if (directSalesLast30Days >= 50) return { tier: 'platinum', commissionRate: 25 };
  if (directSalesLast30Days >= 25) return { tier: 'gold', commissionRate: 20 };
  if (directSalesLast30Days >= 10) return { tier: 'silver', commissionRate: 15 };
  return { tier: 'bronze', commissionRate: 10 };
}

/**
 * Send event to Klaviyo for affiliate tier changes
 */
async function sendKlaviyoEvent(
  apiKey: string,
  email: string,
  eventName: string,
  properties: Record<string, unknown>
) {
  try {
    const response = await fetch('https://a.klaviyo.com/api/events/', {
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
    if (!response.ok) {
      console.error(`[Klaviyo] Error sending ${eventName}:`, await response.text());
    } else {
      console.log(`[Klaviyo] Event ${eventName} sent to ${email}`);
    }
  } catch (error) {
    console.error(`[Klaviyo] Error sending ${eventName}:`, error);
  }
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
      console.warn('[affiliate-tier-recalc] Unauthorized access attempt');
      return createErrorResponse('Unauthorized', 401);
    }

    console.log('[affiliate-tier-recalc] Auth OK - Starting tier recalculation...');

    // Load environment variables
    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const KLAVIYO_PRIVATE_API_KEY = getEnvVar('KLAVIYO_PRIVATE_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active affiliates
    const { data: affiliates, error: affError } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('status', 'active');

    if (affError) {
      console.error('[affiliate-tier-recalc] Error fetching affiliates:', affError);
      throw affError;
    }

    if (!affiliates || affiliates.length === 0) {
      console.log('[affiliate-tier-recalc] No active affiliates found');
      return createSuccessResponse({ success: true, message: 'No active affiliates', updated: 0 });
    }

    // Get all auth users for email lookup
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userEmailMap: Record<string, string> = {};
    authUsers?.users?.forEach((u: any) => {
      userEmailMap[u.id] = u.email || '';
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let updatedCount = 0;
    let tierChanges: { email: string; oldTier: string; newTier: string }[] = [];

    for (const affiliate of affiliates) {
      const email = userEmailMap[affiliate.user_id];
      
      // Get direct sales in last 30 days (excluding fraud and rejected)
      const { data: directSalesData } = await supabaseAdmin
        .from('commissions')
        .select('id, order_amount')
        .eq('affiliate_id', affiliate.id)
        .eq('level', 1)
        .eq('fraud_flag', false)
        .in('status', ['pending', 'approved'])
        .gte('created_at', thirtyDaysAgo.toISOString());

      const directSalesLast30Days = directSalesData?.length || 0;
      const monthlyRevenue = directSalesData?.reduce((sum, c) => sum + (Number(c.order_amount) || 0), 0) || 0;

      // =====================================================
      // STREAK CALCULATION: Consecutive days with sales
      // =====================================================
      const { data: streakCommissions } = await supabaseAdmin
        .from('commissions')
        .select('created_at')
        .eq('affiliate_id', affiliate.id)
        .eq('level', 1)
        .eq('fraud_flag', false)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Get unique sale dates
      const saleDates = new Set<string>();
      streakCommissions?.forEach((c: any) => {
        const dateStr = new Date(c.created_at).toISOString().split('T')[0];
        saleDates.add(dateStr);
      });

      // Calculate current streak (consecutive days ending today or yesterday)
      let currentStreak = 0;
      const todayStr = now.toISOString().split('T')[0];
      const checkDate = new Date(now);
      
      // Start from today; if no sale today, start from yesterday
      if (!saleDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      // Count consecutive days
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (saleDates.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Track best streak
      const previousBest = affiliate.best_streak_days || 0;
      const newBestStreak = Math.max(previousBest, currentStreak);

      // Last sale date
      const lastSaleDateStr = streakCommissions && streakCommissions.length > 0
        ? streakCommissions[0].created_at.split('T')[0]
        : null;

      // Calculate new tier (preserve diamond status if manually set)
      const isDiamond = affiliate.tier === 'diamond';
      const newTierInfo = calculateTier(directSalesLast30Days, isDiamond);
      const oldTier = affiliate.tier || 'bronze';

      // Calculate tier expiration (30 days from now if maintaining/upgrading)
      const tierExpiresAt = new Date();
      tierExpiresAt.setDate(tierExpiresAt.getDate() + 30);

      // Update affiliate record (including streak data)
      const { error: updateError } = await supabaseAdmin
        .from('affiliates')
        .update({
          tier: newTierInfo.tier,
          tier_expires_at: tierExpiresAt.toISOString(),
          monthly_sales_count: directSalesLast30Days,
          monthly_revenue_generated: monthlyRevenue,
          current_streak_days: currentStreak,
          best_streak_days: newBestStreak,
          last_sale_date: lastSaleDateStr,
        })
        .eq('id', affiliate.id);

      if (updateError) {
        console.error(`[affiliate-tier-recalc] Error updating affiliate ${affiliate.id}:`, updateError);
        continue;
      }

      updatedCount++;

      // Track tier changes for Klaviyo events
      if (oldTier !== newTierInfo.tier) {
        tierChanges.push({ email, oldTier, newTier: newTierInfo.tier });

        // Determine tier direction and context
        const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const oldTierIndex = tierOrder.indexOf(oldTier);
        const newTierIndex = tierOrder.indexOf(newTierInfo.tier);
        const tierDirection = newTierIndex > oldTierIndex ? 'up' : 'down';
        
        // Compute tier_change_context for fine-grained Klaviyo flow branching
        let tierChangeContext = 'unknown';
        if (newTierInfo.tier === 'diamond' && oldTier === 'diamond') {
          tierChangeContext = 'maintained_top_tier';
        } else if (newTierIndex > oldTierIndex) {
          tierChangeContext = 'upgrade_from_lower_tier';
        } else {
          tierChangeContext = 'downgrade_from_higher_tier';
        }

        // Send Klaviyo event for tier change
        if (KLAVIYO_PRIVATE_API_KEY && email) {
          await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_Affiliate_Tier_Updated', {
            affiliate_code: affiliate.referral_code,
            old_tier: oldTier,
            new_tier: newTierInfo.tier,
            tier: newTierInfo.tier,
            commission_rate: newTierInfo.commissionRate,
            earnings: affiliate.total_commissions || 0,
            monthly_performance: {
              sales: directSalesLast30Days,
              revenue: monthlyRevenue
            },
            tier_direction: tierDirection,
            tier_change_context: tierChangeContext,
            updated_at: now.toISOString(),
          });
        }
      }

      console.log(`[affiliate-tier-recalc] Updated ${affiliate.referral_code}: ${oldTier} -> ${newTierInfo.tier} (${directSalesLast30Days} sales)`);
    }

    console.log(`[affiliate-tier-recalc] Completed: ${updatedCount} affiliates updated, ${tierChanges.length} tier changes`);

    return createSuccessResponse({ 
      success: true, 
      updated: updatedCount,
      tierChanges: tierChanges.length,
      details: tierChanges.map(tc => `${tc.oldTier} -> ${tc.newTier}`)
    });
  } catch (error) {
    console.error('[affiliate-tier-recalc] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createErrorResponse(errorMessage, 500);
  }
});
