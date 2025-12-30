import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RevenueStats {
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  orderCount: number;
  refundedOrderCount: number;
  currency: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { days = 7 } = await req.json();
    
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    if (!shopifyAdminToken) {
      throw new Error("SHOPIFY_ADMIN_API_TOKEN not configured");
    }

    const shopDomain = "lovable-project-swlbs.myshopify.com";
    const apiVersion = "2024-10";
    
    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[ShopifyRevenue] Fetching orders from ${startDate.toISOString()} (${days} days)`);

    let allOrders: any[] = [];
    let sinceId = "0";
    let hasMorePages = true;
    let pageCount = 0;

    // Fetch all orders in date range
    while (hasMorePages && pageCount < 20) { // Safety limit
      pageCount++;
      const ordersUrl = new URL(`https://${shopDomain}/admin/api/${apiVersion}/orders.json`);
      ordersUrl.searchParams.set("status", "any");
      ordersUrl.searchParams.set("created_at_min", startDate.toISOString());
      ordersUrl.searchParams.set("limit", "250");
      ordersUrl.searchParams.set("since_id", sinceId);
      ordersUrl.searchParams.set("fields", "id,total_price,total_refunded_set,refunds,currency,financial_status,created_at");

      const ordersResponse = await fetch(ordersUrl.toString(), {
        headers: {
          "X-Shopify-Access-Token": shopifyAdminToken,
          "Content-Type": "application/json",
        },
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error(`[ShopifyRevenue] API error: ${ordersResponse.status}`, errorText);
        throw new Error(`Shopify API error: ${ordersResponse.status}`);
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];

      if (orders.length === 0) {
        hasMorePages = false;
        break;
      }

      allOrders = [...allOrders, ...orders];
      sinceId = orders[orders.length - 1].id.toString();

      if (orders.length < 250) {
        hasMorePages = false;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[ShopifyRevenue] Found ${allOrders.length} orders in ${pageCount} pages`);

    // Calculate revenue stats
    let grossRevenue = 0;
    let totalRefunds = 0;
    let refundedOrderCount = 0;
    let currency = "USD";

    for (const order of allOrders) {
      const orderTotal = parseFloat(order.total_price) || 0;
      grossRevenue += orderTotal;
      
      if (order.currency) {
        currency = order.currency;
      }

      // Calculate refund amount from refunds array
      if (order.refunds && order.refunds.length > 0) {
        refundedOrderCount++;
        for (const refund of order.refunds) {
          // Sum up refund line items
          if (refund.refund_line_items) {
            for (const item of refund.refund_line_items) {
              totalRefunds += parseFloat(item.subtotal) || 0;
            }
          }
          // Also include any transactions (for shipping refunds, adjustments)
          if (refund.transactions) {
            for (const tx of refund.transactions) {
              if (tx.kind === "refund" && tx.status === "success") {
                // Use this as the source of truth if available
                // But avoid double counting with line items
              }
            }
          }
        }
      }

      // Alternative: use total_refunded_set if available (newer API)
      if (order.total_refunded_set?.shop_money?.amount) {
        const refundedAmount = parseFloat(order.total_refunded_set.shop_money.amount) || 0;
        // Use this if we haven't already counted from refunds array
        if ((!order.refunds || order.refunds.length === 0) && refundedAmount > 0) {
          totalRefunds += refundedAmount;
          refundedOrderCount++;
        }
      }
    }

    const netRevenue = grossRevenue - totalRefunds;

    const stats: RevenueStats = {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      orderCount: allOrders.length,
      refundedOrderCount,
      currency,
    };

    console.log(`[ShopifyRevenue] Stats:`, stats);

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ShopifyRevenue] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
