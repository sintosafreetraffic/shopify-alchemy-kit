/**
 * Reconciliation Edge Function
 * 
 * Detects Shopify orders that were never successfully tracked in Pinterest.
 * 
 * Phase 1: Detection only - NO automatic recovery.
 * Inserts missing orders into missing_purchase_events for ops visibility.
 * 
 * Auth: Requires CRON_SECRET header (no JWT)
 * 
 * Definition of "MISSING" order:
 * A) NO pinterest_purchase_events row exists
 * B) render_status = 'error_direct_fallback_render' (flag immediately)
 * C) render_status = 'pending' AND created_at < now() - 5 minutes (stale pending)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ReconciliationStats {
  scanned: number;
  missing_detected: number;
  inserted: number;
  already_present: number;
  flagged_missing_no_row: number;
  flagged_error_row: number;
  flagged_stale_pending: number;
  window_start: string;
  window_end: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate CRON_SECRET
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    
    if (!cronSecret || providedSecret !== cronSecret) {
      console.error('[Reconcile] Invalid or missing CRON_SECRET');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for dry_run mode
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === '1';

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Use Admin API token for order reconciliation (separate from Storefront token)
    const shopifyAdminToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Reconcile] Missing Supabase env vars');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shopifyAdminToken) {
      console.error('[Reconcile] Missing SHOPIFY_ADMIN_API_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Shopify Admin API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window: last 48 hours
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 48 * 60 * 60 * 1000);

    const stats: ReconciliationStats = {
      scanned: 0,
      missing_detected: 0,
      inserted: 0,
      already_present: 0,
      flagged_missing_no_row: 0,
      flagged_error_row: 0,
      flagged_stale_pending: 0,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    };

    console.log('[Reconcile] Starting reconciliation:', {
      window_start: stats.window_start,
      window_end: stats.window_end,
      dry_run: dryRun,
    });

    // Fetch orders from Shopify Admin API
    const shopDomain = 'lovable-project-swlbs.myshopify.com';
    const apiVersion = '2024-10';
    let sinceId = '0';
    let hasMorePages = true;

    while (hasMorePages) {
      const ordersUrl = new URL(`https://${shopDomain}/admin/api/${apiVersion}/orders.json`);
      ordersUrl.searchParams.set('status', 'any');
      ordersUrl.searchParams.set('created_at_min', windowStart.toISOString());
      ordersUrl.searchParams.set('limit', '250');
      ordersUrl.searchParams.set('since_id', sinceId);

      const ordersResponse = await fetch(ordersUrl.toString(), {
        headers: {
          'X-Shopify-Access-Token': shopifyAdminToken,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersResponse.ok) {
        console.error('[Reconcile] Shopify API error:', ordersResponse.status);
        return new Response(
          JSON.stringify({ error: 'Shopify API error', status: ordersResponse.status }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];

      if (orders.length === 0) {
        hasMorePages = false;
        break;
      }

      // Process each order
      for (const order of orders) {
        stats.scanned++;
        const orderId = String(order.id);
        const orderCreatedAt = order.created_at;

        // Check if order exists in pinterest_purchase_events
        const { data: trackingRow, error: trackingError } = await supabase
          .from('pinterest_purchase_events')
          .select('order_id, render_status, created_at')
          .eq('order_id', orderId)
          .maybeSingle();

        if (trackingError) {
          console.error('[Reconcile] Error checking tracking row:', trackingError);
          continue;
        }

        let isMissing = false;
        let reason = '';

        if (!trackingRow) {
          // Case A: No row exists at all
          isMissing = true;
          reason = 'no_row';
          stats.flagged_missing_no_row++;
        } else if (trackingRow.render_status === 'error_direct_fallback_render') {
          // Case B: Error status - flag immediately (no grace period)
          isMissing = true;
          reason = 'error_row';
          stats.flagged_error_row++;
        } else if (trackingRow.render_status === 'pending') {
          // Case C: Pending - check if stale (> 5 minutes old)
          const rowCreatedAt = new Date(trackingRow.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (rowCreatedAt < fiveMinutesAgo) {
            isMissing = true;
            reason = 'stale_pending';
            stats.flagged_stale_pending++;
          }
          // If pending but < 5 minutes old, skip (in-flight protection)
        }
        // success_direct and fallback_render are NOT flagged

        if (isMissing) {
          stats.missing_detected++;

          if (!dryRun) {
            // Insert into missing_purchase_events (idempotent via UNIQUE constraint)
            const { error: insertError } = await supabase
              .from('missing_purchase_events')
              .insert({
                order_id: orderId,
                order_created_at: orderCreatedAt,
                window_start: windowStart.toISOString(),
                window_end: windowEnd.toISOString(),
                status: 'detected',
                notes: `Detected via reconciliation. Reason: ${reason}`,
              })
              .select('id')
              .maybeSingle();

            if (insertError) {
              if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
                stats.already_present++;
              } else {
                console.error('[Reconcile] Error inserting missing event:', insertError);
              }
            } else {
              stats.inserted++;
            }
          } else {
            // Dry run - just count
            stats.inserted++;
          }
        }
      }

      // Update sinceId for pagination - use last order's ID (Shopify returns orders sorted by ID)
      // Treat order IDs as strings - do NOT use parseInt comparison
      if (orders.length > 0) {
        sinceId = String(orders[orders.length - 1].id);
      }

      // Check if we got less than limit (no more pages)
      if (orders.length < 250) {
        hasMorePages = false;
      }
    }

    console.log('[Reconcile] Completed:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Reconcile] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
