import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product SKU/handle mapping to internal slugs
const PRODUCT_MAPPING: Record<string, string> = {
  // SKU mappings
  "PILLOW-ERGO-001": "ergonomic_sleep_pillow",
  "PILLOW-KNEE-001": "knee_alignment_pillow",
  "BUNDLE-SIDE-001": "side_sleep_bundle",
  "MASK-SILK-001": "sleep_mask",
  // Handle mappings (fallback)
  "ergonomic-sleep-pillow": "ergonomic_sleep_pillow",
  "knee-pillow": "knee_alignment_pillow",
  "risebynight-ergonomic-sleep-pillow": "ergonomic_sleep_pillow",
  "risebynight-ergonomic-knee-pillow": "knee_alignment_pillow",
  "risebynight-silk-sleep-mask": "sleep_mask",
  "complete-sleep-bundle": "side_sleep_bundle",
  "side-sleep-bundle": "side_sleep_bundle",
  "sleep-mask": "sleep_mask",
  "silk-sleep-mask": "sleep_mask",
};

// Title-based mapping as final fallback
const TITLE_KEYWORDS: Record<string, string> = {
  "ergonomic sleep pillow": "ergonomic_sleep_pillow",
  "knee pillow": "knee_alignment_pillow",
  "sleep bundle": "side_sleep_bundle",
  "sleep mask": "sleep_mask",
};

function mapProductToSlug(sku: string | null, handle: string | null, title: string | null): string | null {
  // Try SKU first
  if (sku && PRODUCT_MAPPING[sku]) {
    return PRODUCT_MAPPING[sku];
  }
  
  // Try handle
  if (handle) {
    const handleLower = handle.toLowerCase();
    if (PRODUCT_MAPPING[handleLower]) {
      return PRODUCT_MAPPING[handleLower];
    }
    // Check partial handle matches
    for (const [key, slug] of Object.entries(PRODUCT_MAPPING)) {
      if (handleLower.includes(key) || key.includes(handleLower)) {
        return slug;
      }
    }
  }
  
  // Try title keywords as fallback
  if (title) {
    const titleLower = title.toLowerCase();
    for (const [keyword, slug] of Object.entries(TITLE_KEYWORDS)) {
      if (titleLower.includes(keyword)) {
        return slug;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const shopifyAccessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyAccessToken) {
      return new Response(
        JSON.stringify({ error: "Shopify access token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const shopifyDomain = "lovable-project-swlbs.myshopify.com";

    console.log(`Syncing Shopify products for email: ${email}`);

    // Step 1: Find customer by email in Shopify
    const customerSearchUrl = `https://${shopifyDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    const customerResponse = await fetch(customerSearchUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!customerResponse.ok) {
      console.log("Customer search response not OK:", customerResponse.status);
      // Customer might not exist - that's fine
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No Shopify customer found for this email",
          synced_products: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerData = await customerResponse.json();
    const customers = customerData.customers || [];
    
    if (customers.length === 0) {
      console.log("No customers found for email:", email);
      
      // Update last sync timestamp anyway
      await supabase
        .from("sleep_profiles")
        .update({ last_shopify_sync: new Date().toISOString() })
        .eq("email", email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No Shopify customer found for this email",
          synced_products: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers[0].id;
    console.log(`Found Shopify customer ID: ${customerId}`);

    // Step 2: Fetch all orders for this customer
    const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/customers/${customerId}/orders.json?status=any`;
    
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!ordersResponse.ok) {
      console.log("Orders fetch failed:", ordersResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];
    
    console.log(`Found ${orders.length} orders for customer`);

    // Step 3: Extract products from fulfilled orders
    const syncedProducts: Array<{
      product_slug: string;
      acquired_at: string;
      shopify_order_id: string;
    }> = [];

    for (const order of orders) {
      // Only process fulfilled or partially fulfilled orders
      const fulfillmentStatus = order.fulfillment_status;
      if (fulfillmentStatus !== "fulfilled" && fulfillmentStatus !== "partial") {
        console.log(`Skipping order ${order.id} with status: ${fulfillmentStatus}`);
        continue;
      }

      const orderDate = order.created_at;
      const orderId = String(order.id);

      for (const lineItem of order.line_items || []) {
        const sku = lineItem.sku;
        const productId = lineItem.product_id;
        const title = lineItem.title;
        
        // Try to get handle from product
        let handle: string | null = null;
        if (productId) {
          try {
            const productUrl = `https://${shopifyDomain}/admin/api/2024-01/products/${productId}.json`;
            const productResponse = await fetch(productUrl, {
              headers: {
                "X-Shopify-Access-Token": shopifyAccessToken,
                "Content-Type": "application/json",
              },
            });
            if (productResponse.ok) {
              const productData = await productResponse.json();
              handle = productData.product?.handle || null;
            }
          } catch (e) {
            console.log(`Could not fetch product ${productId}:`, e);
          }
        }

        const productSlug = mapProductToSlug(sku, handle, title);
        
        if (productSlug) {
          // Check if we already have this product (avoid duplicates)
          const existing = syncedProducts.find(p => p.product_slug === productSlug);
          if (!existing) {
            syncedProducts.push({
              product_slug: productSlug,
              acquired_at: orderDate,
              shopify_order_id: orderId,
            });
            console.log(`Mapped product: ${title} -> ${productSlug}`);
          }
        } else {
          console.log(`Could not map product: SKU=${sku}, Handle=${handle}, Title=${title}`);
        }
      }
    }

    console.log(`Syncing ${syncedProducts.length} products to database`);

    // Step 4: Upsert products to database
    for (const product of syncedProducts) {
      const { error } = await supabase
        .from("user_product_ownership")
        .upsert({
          email,
          product_slug: product.product_slug,
          acquired_at: product.acquired_at,
          shopify_order_id: product.shopify_order_id,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: "email,product_slug",
        });

      if (error) {
        console.error(`Error upserting product ${product.product_slug}:`, error);
      }
    }

    // Step 5: Update products_owned array in sleep_profiles for backward compatibility
    const productNames = syncedProducts.map(p => {
      switch (p.product_slug) {
        case "ergonomic_sleep_pillow": return "Ergonomic Sleep Pillow";
        case "knee_alignment_pillow": return "Knee Pillow";
        case "side_sleep_bundle": return "Complete Sleep Bundle";
        case "sleep_mask": return "Sleep Mask";
        default: return null;
      }
    }).filter(Boolean);

    if (productNames.length > 0) {
      await supabase
        .from("sleep_profiles")
        .update({ 
          products_owned: productNames,
          last_shopify_sync: new Date().toISOString(),
        })
        .eq("email", email);
    } else {
      await supabase
        .from("sleep_profiles")
        .update({ last_shopify_sync: new Date().toISOString() })
        .eq("email", email);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_products: syncedProducts,
        message: `Synced ${syncedProducts.length} products`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in sync-shopify-products:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
