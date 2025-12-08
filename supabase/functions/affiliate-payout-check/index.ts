/**
 * Affiliate Payout Check Edge Function
 * 
 * CRON Schedule: Daily at 02:15 UTC (after tier recalculation at 02:00)
 * Endpoint: POST /functions/v1/affiliate-payout-check
 * Authorization: Bearer CRON_SECRET
 * 
 * Purpose:
 * - Calculate pending payout amounts for all active affiliates
 * - Trigger RBN_Affiliate_Payout_Ready Klaviyo event when threshold is met
 * - Does NOT process actual payouts (manual for now)
 * 
 * To modify schedule: Update the pg_cron entry in Supabase SQL editor
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // Validate CRON_SECRET
    const authHeader = req.headers.get("Authorization");
    if (!validateCronSecret(authHeader)) {
      console.error("[affiliate-payout-check] Invalid or missing CRON_SECRET");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[affiliate-payout-check] Starting payout check...");

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

      // Calculate pending payout amount (eligible commissions)
      const { data: commissions, error: commError } = await supabase
        .from("commissions")
        .select("amount")
        .eq("affiliate_id", affiliate.id)
        .in("status", ["pending", "approved"])
        .eq("fraud_flag", false);

      if (commError) {
        console.error(`[affiliate-payout-check] Error fetching commissions for ${affiliate.id}:`, commError);
        continue;
      }

      const pendingAmount = commissions?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
      const threshold = Number(affiliate.payout_threshold) || 50;

      // Update pending_payout_amount in affiliates table
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
          // Send Klaviyo event
          await sendKlaviyoPayoutReadyEvent({
            email,
            affiliate_code: affiliate.referral_code,
            tier: affiliate.tier || "bronze",
            pending_payout_amount: pendingAmount,
            payout_threshold: threshold,
            total_commissions: Number(affiliate.total_commissions) || 0,
            monthly_sales_count: affiliate.monthly_sales_count || 0,
            monthly_revenue_generated: Number(affiliate.monthly_revenue_generated) || 0,
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

async function sendKlaviyoPayoutReadyEvent(data: {
  email: string;
  affiliate_code: string;
  tier: string;
  pending_payout_amount: number;
  payout_threshold: number;
  total_commissions: number;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
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
