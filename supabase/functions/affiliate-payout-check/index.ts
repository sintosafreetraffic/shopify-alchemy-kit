/**
 * Affiliate Payout Check Edge Function
 * 
 * @description Calculates pending payout amounts for all active affiliates and
 *              triggers RBN_Affiliate_Payout_Ready Klaviyo event when threshold is met.
 *              Does NOT process actual payouts - manual payout processing only for now.
 * 
 * @schedule Daily CRON job at 02:15 UTC via pg_cron (after tier recalc at 02:00)
 * @endpoint POST /functions/v1/affiliate-payout-check
 * 
 * @auth Accepts either:
 *       - Authorization: Bearer <CRON_SECRET> header
 *       - Internal pg_cron calls identified by X-Supabase-Internal: true or pg_net User-Agent
 * 
 * @env SUPABASE_URL - Supabase project URL
 * @env SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations
 * @env KLAVIYO_PRIVATE_API_KEY - (Optional) For sending payout ready events
 * @env CRON_SECRET - Secret for validating external CRON calls
 * 
 * @payoutLogic
 *   - Only counts commissions where fraud_flag = false AND status IN ('pending', 'approved')
 *   - Explicitly excludes status IN ('rejected', 'flagged')
 *   - Overwrites pending_payout_amount with fresh calculation (not incremental)
 *   - Does NOT touch last_payout_at (reserved for manual payout processing)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validate CRON_SECRET from Authorization header
 */
function validateCronSecret(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  const cronSecret = Deno.env.get("CRON_SECRET");
  return cronSecret ? token === cronSecret : false;
}

interface AffiliatePayoutInfo {
  id: string;
  user_id: string;
  referral_code: string;
  tier: string;
  payout_threshold: number;
  pending_payout_amount: number;
  total_commissions: number;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
  email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const authHeader = req.headers.get("Authorization");
    const isInternalCron = req.headers.get("X-Supabase-Internal") === "true" || 
                           (req.headers.get("User-Agent") || "").includes("pg_net");
    
    if (!isInternalCron && !validateCronSecret(authHeader)) {
      console.error("[affiliate-payout-check] Unauthorized: Invalid or missing CRON_SECRET");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[affiliate-payout-check] Auth OK - Starting payout check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active affiliates
    const { data: affiliates, error: affError } = await supabase
      .from("affiliates")
      .select("id, user_id, referral_code, tier, payout_threshold, pending_payout_amount, total_commissions, monthly_sales_count, monthly_revenue_generated")
      .eq("status", "active");

    if (affError) {
      console.error("[affiliate-payout-check] Error fetching affiliates:", affError);
      throw affError;
    }

    console.log(`[affiliate-payout-check] Checking ${affiliates?.length || 0} affiliates`);

    let affiliatesChecked = 0;
    let payoutReadyCount = 0;
    const results: { affiliate_id: string; pending_amount: number; ready: boolean }[] = [];

    for (const affiliate of affiliates || []) {
      affiliatesChecked++;

      // ============================================================
      // PAYOUT CALCULATION: Only count eligible commissions
      // - fraud_flag = false (not flagged for fraud)
      // - status IN ('pending', 'approved') (excludes 'rejected', 'flagged')
      // ============================================================
      const { data: commissions, error: commError } = await supabase
        .from("commissions")
        .select("amount, status")
        .eq("affiliate_id", affiliate.id)
        .eq("fraud_flag", false)
        .in("status", ["pending", "approved"]);

      if (commError) {
        console.error(`[affiliate-payout-check] Error fetching commissions for ${affiliate.id}:`, commError);
        continue;
      }

      // Calculate fresh pending amount (overwrites, not incremental)
      const pendingAmount = commissions?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
      const threshold = Number(affiliate.payout_threshold) || 50;

      // Update pending_payout_amount in affiliates table (always overwrite with fresh sum)
      // Note: last_payout_at is NOT touched here - reserved for manual payout processing
      const { error: updateError } = await supabase
        .from("affiliates")
        .update({ pending_payout_amount: pendingAmount })
        .eq("id", affiliate.id);

      if (updateError) {
        console.error(`[affiliate-payout-check] Error updating pending amount for ${affiliate.id}:`, updateError);
      }

      const isReady = pendingAmount >= threshold;
      results.push({
        affiliate_id: affiliate.id,
        pending_amount: pendingAmount,
        ready: isReady,
      });

      if (isReady) {
        payoutReadyCount++;

        // Get affiliate email from auth.users
        const { data: userData } = await supabase.auth.admin.getUserById(affiliate.user_id);
        const email = userData?.user?.email;

        if (email) {
          // Send Klaviyo RBN_Affiliate_Payout_Ready event with full payload
          await sendKlaviyoPayoutReadyEvent({
            email,
            affiliate_code: affiliate.referral_code,
            tier: affiliate.tier || "bronze",
            pending_payout_amount: pendingAmount,
            payout_threshold: threshold,
            total_commissions: Number(affiliate.total_commissions) || 0,
            monthly_sales_count: affiliate.monthly_sales_count || 0,
            monthly_revenue_generated: Number(affiliate.monthly_revenue_generated) || 0,
            is_above_threshold: true,
            payout_mode: "manual",
          });
        }
      }
    }

    const summary = {
      success: true,
      affiliates_checked: affiliatesChecked,
      payout_ready_count: payoutReadyCount,
      timestamp: new Date().toISOString(),
    };

    console.log("[affiliate-payout-check] Completed:", summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[affiliate-payout-check] Error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Send RBN_Affiliate_Payout_Ready event to Klaviyo
 * Includes full payout context for email automation
 */
async function sendKlaviyoPayoutReadyEvent(data: {
  email: string;
  affiliate_code: string;
  tier: string;
  pending_payout_amount: number;
  payout_threshold: number;
  total_commissions: number;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
  is_above_threshold: boolean;
  payout_mode: string;
}) {
  const klaviyoKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
  if (!klaviyoKey) {
    console.warn("[affiliate-payout-check] KLAVIYO_PRIVATE_API_KEY not set, skipping event");
    return;
  }

  try {
    const response = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${klaviyoKey}`,
        "Content-Type": "application/json",
        "revision": "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: { data: { type: "metric", attributes: { name: "RBN_Affiliate_Payout_Ready" } } },
            profile: { data: { type: "profile", attributes: { email: data.email } } },
            properties: {
              affiliate_code: data.affiliate_code,
              tier: data.tier,
              pending_payout_amount: data.pending_payout_amount,
              payout_threshold: data.payout_threshold,
              total_commissions: data.total_commissions,
              monthly_performance: {
                sales_count: data.monthly_sales_count,
                revenue_generated: data.monthly_revenue_generated,
              },
              is_above_threshold: data.is_above_threshold,
              payout_mode: data.payout_mode,
              ready_at: new Date().toISOString(),
            },
            time: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[affiliate-payout-check] Klaviyo event failed:", errorText);
    } else {
      console.log(`[affiliate-payout-check] Sent RBN_Affiliate_Payout_Ready for ${data.email}`);
    }
  } catch (error) {
    console.error("[affiliate-payout-check] Klaviyo error:", error);
  }
}
