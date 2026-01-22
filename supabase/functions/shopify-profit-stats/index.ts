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
  productCost: number;
  adSpend: number;
  totalCost: number;
  profit: number;
  orderCount: number;
  productBreakdown: Record<string, { qty: number; revenue: number; cost: number; profit: number }>;
}

interface PinterestAnalyticsRow {
  DATE: string;
  SPEND_IN_MICRO_DOLLAR: string;
  TOTAL_CONVERSIONS: string;
}

// Fetch Pinterest ad spend data
async function fetchPinterestAdSpend(startDate: Date, endDate: Date): Promise<Map<string, number>> {
  const accessToken = Deno.env.get("PINTEREST_ACCESS_TOKEN");
  const adAccountId = Deno.env.get("PINTEREST_AD_ACCOUNT_ID");
  
  const adSpendByDate = new Map<string, number>();
  
  if (!accessToken || !adAccountId) {
    console.log("[ProfitStats] Pinterest credentials not configured, skipping ad spend");
    return adSpendByDate;
  }

  try {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    
    console.log(`[ProfitStats] Fetching Pinterest ad spend from ${startStr} to ${endStr}`);
    
    // Pinterest Analytics API - Get ad account analytics
    const analyticsUrl = new URL(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/analytics`);
    analyticsUrl.searchParams.set("start_date", startStr);
    analyticsUrl.searchParams.set("end_date", endStr);
    analyticsUrl.searchParams.set("columns", "SPEND_IN_MICRO_DOLLAR,TOTAL_CONVERSIONS");
    analyticsUrl.searchParams.set("granularity", "DAY");
    
    const response = await fetch(analyticsUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ProfitStats] Pinterest API error: ${response.status}`, errorText);
      return adSpendByDate;
    }

    const data = await response.json();
    console.log(`[ProfitStats] Pinterest API response:`, JSON.stringify(data).substring(0, 500));
    
    // Pinterest returns array of daily metrics
    if (Array.isArray(data)) {
      for (const row of data as PinterestAnalyticsRow[]) {
        if (row.DATE && row.SPEND_IN_MICRO_DOLLAR) {
          // Pinterest returns spend in micro dollars (1/1,000,000 of a dollar)
          const spendDollars = parseInt(row.SPEND_IN_MICRO_DOLLAR, 10) / 1_000_000;
          adSpendByDate.set(row.DATE, spendDollars);
        }
      }
    }
    
    console.log(`[ProfitStats] Found Pinterest ad spend for ${adSpendByDate.size} days`);
  } catch (error) {
    console.error("[ProfitStats] Error fetching Pinterest analytics:", error);
  }
  
  return adSpendByDate;
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[ProfitStats] Fetching orders from ${startDate.toISOString()} (${days} days)`);

    // Fetch Pinterest ad spend in parallel with Shopify orders
    const pinterestPromise = fetchPinterestAdSpend(startDate, endDate);

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

    // Wait for Pinterest data
    const pinterestAdSpend = await pinterestPromise;

    // Helper to find cost price for a product at a specific date
    const findCostPrice = (productTitle: string, orderDate: Date): CostPrice | null => {
      const normalizedTitle = productTitle.toLowerCase().trim();
      
      // Find all matching cost prices, sorted by most recent first
      const matchingPrices: CostPrice[] = [];
      
      for (const cp of costPricesList) {
        const cpTitle = cp.product_title.toLowerCase().trim();
        const cpHandle = cp.product_handle.toLowerCase().trim();
        
        // Match by title (partial match) or exact handle
        const titleMatch = normalizedTitle.includes(cpTitle) || cpTitle.includes(normalizedTitle);
        const handleMatch = normalizedTitle.replace(/[^a-z0-9]/g, '-').includes(cpHandle) || 
                           cpHandle.includes(normalizedTitle.replace(/[^a-z0-9]/g, '-'));
        
        if (titleMatch || handleMatch) {
          const effectiveFrom = new Date(cp.effective_from);
          const effectiveTo = cp.effective_to ? new Date(cp.effective_to) : null;
          
          if (orderDate >= effectiveFrom && (!effectiveTo || orderDate <= effectiveTo)) {
            matchingPrices.push(cp);
          }
        }
      }
      
      // Return the most recently created matching price
      if (matchingPrices.length > 0) {
        matchingPrices.sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
        return matchingPrices[0];
      }
      
      return null;
    };

    // Process orders and calculate profit by date
    const dailyData: Map<string, DailyProfit> = new Map();

    for (const order of allOrders) {
      if (order.financial_status === "refunded" || order.financial_status === "voided") {
        continue;
      }

      const orderDate = new Date(order.created_at);
      let dateKey: string;

      if (granularity === "weekly") {
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
          productCost: 0,
          adSpend: 0,
          totalCost: 0,
          profit: 0,
          orderCount: 0,
          productBreakdown: {},
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.orderCount++;

      const productQuantities: Map<string, number> = new Map();
      for (const item of order.line_items || []) {
        const key = item.title;
        productQuantities.set(key, (productQuantities.get(key) || 0) + item.quantity);
      }

      for (const item of order.line_items || []) {
        const itemRevenue = parseFloat(item.price) * item.quantity;
        dayData.revenue += itemRevenue;

        const costPrice = findCostPrice(item.title, orderDate);
        let itemCost = 0;

        if (costPrice) {
          const totalQtyInOrder = productQuantities.get(item.title) || item.quantity;
          const unitCost = totalQtyInOrder >= 2 ? costPrice.cost_bulk : costPrice.cost_single;
          itemCost = unitCost * item.quantity;
        }

        dayData.productCost += itemCost;

        if (!dayData.productBreakdown[item.title]) {
          dayData.productBreakdown[item.title] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
        }
        dayData.productBreakdown[item.title].qty += item.quantity;
        dayData.productBreakdown[item.title].revenue += itemRevenue;
        dayData.productBreakdown[item.title].cost += itemCost;
        dayData.productBreakdown[item.title].profit += (itemRevenue - itemCost);
      }
    }

    // Add Pinterest ad spend to each period
    for (const [dateKey, dayData] of dailyData) {
      if (granularity === "daily") {
        dayData.adSpend = pinterestAdSpend.get(dateKey) || 0;
      } else if (granularity === "weekly") {
        // Sum up the week's ad spend
        const weekStart = new Date(dateKey);
        for (let i = 0; i < 7; i++) {
          const dayStr = weekStart.toISOString().split("T")[0];
          dayData.adSpend += pinterestAdSpend.get(dayStr) || 0;
          weekStart.setDate(weekStart.getDate() + 1);
        }
      } else if (granularity === "monthly") {
        // Sum up the month's ad spend
        const monthStart = new Date(dateKey);
        const month = monthStart.getMonth();
        while (monthStart.getMonth() === month) {
          const dayStr = monthStart.toISOString().split("T")[0];
          dayData.adSpend += pinterestAdSpend.get(dayStr) || 0;
          monthStart.setDate(monthStart.getDate() + 1);
        }
      }
      
      dayData.totalCost = dayData.productCost + dayData.adSpend;
      dayData.profit = dayData.revenue - dayData.totalCost;
    }

    // Convert to sorted array
    const profitData = Array.from(dailyData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals
    const totals = profitData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        productCost: acc.productCost + day.productCost,
        adSpend: acc.adSpend + day.adSpend,
        totalCost: acc.totalCost + day.totalCost,
        profit: acc.profit + day.profit,
        orderCount: acc.orderCount + day.orderCount,
      }),
      { revenue: 0, productCost: 0, adSpend: 0, totalCost: 0, profit: 0, orderCount: 0 }
    );

    // Get unique products from all orders
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
        productCost: Math.round(totals.productCost * 100) / 100,
        adSpend: Math.round(totals.adSpend * 100) / 100,
        totalCost: Math.round(totals.totalCost * 100) / 100,
        profit: Math.round(totals.profit * 100) / 100,
        margin: totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 10000) / 100 : 0,
      },
      costPrices: costPricesList,
      products: Array.from(uniqueProducts),
      currency: allOrders[0]?.currency || "EUR",
      granularity,
      days,
      pinterestConnected: !!(Deno.env.get("PINTEREST_ACCESS_TOKEN") && Deno.env.get("PINTEREST_AD_ACCOUNT_ID")),
    };

    console.log(`[ProfitStats] Returning ${profitData.length} periods, total profit: ${totals.profit}, ad spend: ${totals.adSpend}`);

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
