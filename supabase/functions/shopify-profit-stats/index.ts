import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderLineItem {
  product_id: number;
  variant_id: number;
  title: string;
  name: string;
  quantity: number;
  price: string;
  sku: string | null;
}

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  line_items: OrderLineItem[];
  refunds?: Array<{
    refund_line_items?: Array<{
      line_item_id: number;
      quantity: number;
      subtotal: string;
    }>;
  }>;
}

interface CostPrice {
  product_handle: string;
  product_title: string;
  cost_single: number;
  cost_bulk: number;
  effective_from: string;
  effective_to: string | null;
}

interface DailyProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
  productBreakdown: Record<string, { qty: number; revenue: number; cost: number; profit: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { days = 30, granularity = "daily" } = await req.json();
    
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    if (!shopifyAdminToken) {
      throw new Error("SHOPIFY_ADMIN_API_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const shopDomain = "lovable-project-swlbs.myshopify.com";
    const apiVersion = "2024-10";
    
    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[ProfitStats] Fetching orders from ${startDate.toISOString()} (${days} days)`);

    // Fetch cost prices from Supabase
    const { data: costPrices, error: costError } = await supabase
      .from("product_cost_prices")
      .select("*");

    if (costError) {
      console.error("[ProfitStats] Error fetching cost prices:", costError);
    }

    const costPricesList: CostPrice[] = costPrices || [];
    console.log(`[ProfitStats] Found ${costPricesList.length} cost price entries`);

    // Fetch orders with line items
    let allOrders: ShopifyOrder[] = [];
    let sinceId = "0";
    let hasMorePages = true;
    let pageCount = 0;

    while (hasMorePages && pageCount < 50) {
      pageCount++;
      const ordersUrl = new URL(`https://${shopDomain}/admin/api/${apiVersion}/orders.json`);
      ordersUrl.searchParams.set("status", "any");
      ordersUrl.searchParams.set("created_at_min", startDate.toISOString());
      ordersUrl.searchParams.set("limit", "250");
      ordersUrl.searchParams.set("since_id", sinceId);

      const ordersResponse = await fetch(ordersUrl.toString(), {
        headers: {
          "X-Shopify-Access-Token": shopifyAdminToken,
          "Content-Type": "application/json",
        },
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error(`[ProfitStats] API error: ${ordersResponse.status}`, errorText);
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

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[ProfitStats] Found ${allOrders.length} orders in ${pageCount} pages`);

    // Helper to find cost price for a product at a specific date
    const findCostPrice = (productTitle: string, orderDate: Date): CostPrice | null => {
      // Try to match by product title (normalize)
      const normalizedTitle = productTitle.toLowerCase();
      
      for (const cp of costPricesList) {
        const cpTitle = cp.product_title.toLowerCase();
        if (normalizedTitle.includes(cpTitle) || cpTitle.includes(normalizedTitle)) {
          const effectiveFrom = new Date(cp.effective_from);
          const effectiveTo = cp.effective_to ? new Date(cp.effective_to) : null;
          
          if (orderDate >= effectiveFrom && (!effectiveTo || orderDate <= effectiveTo)) {
            return cp;
          }
        }
      }
      return null;
    };

    // Process orders and calculate profit by date
    const dailyData: Map<string, DailyProfit> = new Map();

    for (const order of allOrders) {
      // Skip cancelled/refunded orders
      if (order.financial_status === "refunded" || order.financial_status === "voided") {
        continue;
      }

      const orderDate = new Date(order.created_at);
      let dateKey: string;

      if (granularity === "weekly") {
        // Get Monday of the week
        const monday = new Date(orderDate);
        monday.setDate(orderDate.getDate() - orderDate.getDay() + 1);
        dateKey = monday.toISOString().split("T")[0];
      } else if (granularity === "monthly") {
        dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-01`;
      } else {
        dateKey = orderDate.toISOString().split("T")[0];
      }

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          revenue: 0,
          cost: 0,
          profit: 0,
          orderCount: 0,
          productBreakdown: {},
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.orderCount++;

      // Count quantities per product in this order (for bulk pricing)
      const productQuantities: Map<string, number> = new Map();
      for (const item of order.line_items || []) {
        const key = item.title;
        productQuantities.set(key, (productQuantities.get(key) || 0) + item.quantity);
      }

      // Calculate costs for each line item
      for (const item of order.line_items || []) {
        const itemRevenue = parseFloat(item.price) * item.quantity;
        dayData.revenue += itemRevenue;

        const costPrice = findCostPrice(item.title, orderDate);
        let itemCost = 0;

        if (costPrice) {
          const totalQtyInOrder = productQuantities.get(item.title) || item.quantity;
          // Use bulk pricing if 2+ of same product in order
          const unitCost = totalQtyInOrder >= 2 ? costPrice.cost_bulk : costPrice.cost_single;
          itemCost = unitCost * item.quantity;
        }

        dayData.cost += itemCost;

        // Track product breakdown
        if (!dayData.productBreakdown[item.title]) {
          dayData.productBreakdown[item.title] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
        }
        dayData.productBreakdown[item.title].qty += item.quantity;
        dayData.productBreakdown[item.title].revenue += itemRevenue;
        dayData.productBreakdown[item.title].cost += itemCost;
        dayData.productBreakdown[item.title].profit += (itemRevenue - itemCost);
      }

      dayData.profit = dayData.revenue - dayData.cost;
    }

    // Convert to sorted array
    const profitData = Array.from(dailyData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals
    const totals = profitData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        cost: acc.cost + day.cost,
        profit: acc.profit + day.profit,
        orderCount: acc.orderCount + day.orderCount,
      }),
      { revenue: 0, cost: 0, profit: 0, orderCount: 0 }
    );

    // Get unique products from all orders for the cost price editor
    const uniqueProducts = new Set<string>();
    for (const order of allOrders) {
      for (const item of order.line_items || []) {
        uniqueProducts.add(item.title);
      }
    }

    const result = {
      profitData,
      totals: {
        ...totals,
        revenue: Math.round(totals.revenue * 100) / 100,
        cost: Math.round(totals.cost * 100) / 100,
        profit: Math.round(totals.profit * 100) / 100,
        margin: totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 10000) / 100 : 0,
      },
      costPrices: costPricesList,
      products: Array.from(uniqueProducts),
      currency: allOrders[0]?.currency || "EUR",
      granularity,
      days,
    };

    console.log(`[ProfitStats] Returning ${profitData.length} periods, total profit: ${totals.profit}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ProfitStats] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
