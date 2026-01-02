import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product SKU/handle mapping to internal slugs - UPDATED with actual Shopify SKUs
const PRODUCT_MAPPING: Record<string, string> = {
  // Actual SKU mappings from Shopify
  "RISEBYNIGHT-PILLOW-001": "ergonomic_sleep_pillow",
  "RBN-KNEE-001": "knee_alignment_pillow",
  "RBN-KNEE-002": "knee_alignment_pillow",
  "RBN-MASK-1": "sleep_mask",
  "RBN-MASK-2": "sleep_mask",
  "RBN-BUNDLE-SINGLE": "side_sleep_bundle",
  "RBN-BUNDLE-DOUBLE": "side_sleep_bundle",
  // Legacy SKU mappings (keep for backwards compatibility)
  "PILLOW-ERGO-001": "ergonomic_sleep_pillow",
  "PILLOW-KNEE-001": "knee_alignment_pillow",
  "BUNDLE-SIDE-001": "side_sleep_bundle",
  "MASK-SILK-001": "sleep_mask",
  // Handle mappings (actual handles from Shopify)
  "risebynight-ergonomic-sleep-pillow": "ergonomic_sleep_pillow",
  "risebynight-ergonomic-knee-pillow": "knee_alignment_pillow",
  "risebynight-silk-sleep-mask": "sleep_mask",
  "rise-by-night™-complete-sleep-bundle": "side_sleep_bundle",
  // Fallback handle mappings
  "ergonomic-sleep-pillow": "ergonomic_sleep_pillow",
  "knee-pillow": "knee_alignment_pillow",
  "complete-sleep-bundle": "side_sleep_bundle",
  "side-sleep-bundle": "side_sleep_bundle",
  "sleep-mask": "sleep_mask",
  "silk-sleep-mask": "sleep_mask",
};

// Title-based mapping as final fallback (case-insensitive)
const TITLE_KEYWORDS: Record<string, string> = {
  "ergonomic sleep pillow": "ergonomic_sleep_pillow",
  "sleep pillow": "ergonomic_sleep_pillow",
  "knee pillow": "knee_alignment_pillow",
  "knee alignment": "knee_alignment_pillow",
  "sleep bundle": "side_sleep_bundle",
  "complete bundle": "side_sleep_bundle",
  "complete sleep bundle": "side_sleep_bundle",
  "sleep mask": "sleep_mask",
  "deep sleep mask": "sleep_mask",
  "silk mask": "sleep_mask",
};

// Map internal slug to display name
const SLUG_TO_DISPLAY_NAME: Record<string, string> = {
  "ergonomic_sleep_pillow": "Ergonomic Sleep Pillow",
  "knee_alignment_pillow": "Knee Pillow",
  "side_sleep_bundle": "Complete Sleep Bundle",
  "sleep_mask": "Sleep Mask",
};

function mapProductToSlug(sku: string | null, handle: string | null, title: string | null): string | null {
  // Try SKU first (exact match)
  if (sku && PRODUCT_MAPPING[sku]) {
    console.log(`[mapProductToSlug] Matched SKU: ${sku} -> ${PRODUCT_MAPPING[sku]}`);
    return PRODUCT_MAPPING[sku];
  }
  
  // Try handle (exact match first)
  if (handle) {
    const handleLower = handle.toLowerCase();
    if (PRODUCT_MAPPING[handleLower]) {
      console.log(`[mapProductToSlug] Matched handle exactly: ${handleLower} -> ${PRODUCT_MAPPING[handleLower]}`);
      return PRODUCT_MAPPING[handleLower];
    }
    // Check partial handle matches
    for (const [key, slug] of Object.entries(PRODUCT_MAPPING)) {
      if (handleLower.includes(key) || key.includes(handleLower)) {
        console.log(`[mapProductToSlug] Matched handle partial: ${handleLower} contains/in ${key} -> ${slug}`);
        return slug;
      }
    }
  }
  
  // Try title keywords as fallback
  if (title) {
    const titleLower = title.toLowerCase();
    for (const [keyword, slug] of Object.entries(TITLE_KEYWORDS)) {
      if (titleLower.includes(keyword)) {
        console.log(`[mapProductToSlug] Matched title keyword: "${keyword}" in "${titleLower}" -> ${slug}`);
        return slug;
      }
    }
  }
  
  console.log(`[mapProductToSlug] No match found for SKU=${sku}, Handle=${handle}, Title=${title}`);
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

    console.log(`[sync-shopify-products] Syncing for email: ${email}`);

    // Step 1: Find customer by email in Shopify
    const customerSearchUrl = `https://${shopifyDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    console.log(`[sync-shopify-products] Searching for customer...`);
    const customerResponse = await fetch(customerSearchUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!customerResponse.ok) {
      console.log("[sync-shopify-products] Customer search response not OK:", customerResponse.status);
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
      console.log("[sync-shopify-products] No customers found for email:", email);
      
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
    console.log(`[sync-shopify-products] Found Shopify customer ID: ${customerId}`);

    // Step 2: Fetch all orders for this customer
    const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/customers/${customerId}/orders.json?status=any`;
    
    console.log(`[sync-shopify-products] Fetching orders...`);
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!ordersResponse.ok) {
      console.log("[sync-shopify-products] Orders fetch failed:", ordersResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];
    
    console.log(`[sync-shopify-products] Found ${orders.length} orders for customer`);

    // Step 3: Extract products from orders (include all non-cancelled orders)
    const syncedProducts: Array<{
      product_slug: string;
      product_title: string;
      acquired_at: string;
      shopify_order_id: string;
    }> = [];

    for (const order of orders) {
      // Skip cancelled orders
      if (order.cancelled_at) {
        console.log(`[sync-shopify-products] Skipping cancelled order ${order.id}`);
        continue;
      }

      // Include all financial statuses that indicate payment (paid, partially_paid, pending)
      const financialStatus = order.financial_status;
      if (financialStatus === "refunded" || financialStatus === "voided") {
        console.log(`[sync-shopify-products] Skipping order ${order.id} with financial status: ${financialStatus}`);
        continue;
      }

      const orderDate = order.created_at;
      const orderId = String(order.id);
      const fulfillmentStatus = order.fulfillment_status || "unfulfilled";

      console.log(`[sync-shopify-products] Processing order ${order.id} (fulfillment: ${fulfillmentStatus}, financial: ${financialStatus})`);

      for (const lineItem of order.line_items || []) {
        const sku = lineItem.sku;
        const productId = lineItem.product_id;
        const title = lineItem.title;
        
        console.log(`[sync-shopify-products] Processing line item: SKU=${sku}, ProductID=${productId}, Title="${title}"`);
        
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
              console.log(`[sync-shopify-products] Fetched product handle: ${handle}`);
            }
          } catch (e) {
            console.log(`[sync-shopify-products] Could not fetch product ${productId}:`, e);
          }
        }

        const productSlug = mapProductToSlug(sku, handle, title);
        
        if (productSlug) {
          // Check if we already have this product (avoid duplicates)
          const existing = syncedProducts.find(p => p.product_slug === productSlug);
          if (!existing) {
            syncedProducts.push({
              product_slug: productSlug,
              product_title: title,
              acquired_at: orderDate,
              shopify_order_id: orderId,
            });
            console.log(`[sync-shopify-products] ✓ Mapped product: ${title} -> ${productSlug}`);
          } else {
            console.log(`[sync-shopify-products] Skipping duplicate: ${productSlug}`);
          }
        } else {
          console.log(`[sync-shopify-products] ✗ Could not map product: SKU=${sku}, Handle=${handle}, Title=${title}`);
        }
      }
    }

    console.log(`[sync-shopify-products] Syncing ${syncedProducts.length} products to database`);

    // Step 4: Upsert products to user_product_ownership table
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
        console.error(`[sync-shopify-products] Error upserting product ${product.product_slug}:`, error);
      }
    }

    // Step 5: Update products_owned array in sleep_profiles
    // Use the actual product titles from Shopify orders for better display
    const productNames = syncedProducts.map(p => {
      // Use the display name from our mapping, falling back to Shopify title
      return SLUG_TO_DISPLAY_NAME[p.product_slug] || p.product_title;
    }).filter(Boolean);

    console.log(`[sync-shopify-products] Updating sleep_profiles.products_owned with: ${JSON.stringify(productNames)}`);

    if (productNames.length > 0) {
      const { error: updateError } = await supabase
        .from("sleep_profiles")
        .update({ 
          products_owned: productNames,
          last_shopify_sync: new Date().toISOString(),
        })
        .eq("email", email);
      
      if (updateError) {
        console.error(`[sync-shopify-products] Error updating sleep_profiles:`, updateError);
      }
    } else {
      await supabase
        .from("sleep_profiles")
        .update({ last_shopify_sync: new Date().toISOString() })
        .eq("email", email);
    }

    console.log(`[sync-shopify-products] ✓ Sync complete. Products synced: ${syncedProducts.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_products: syncedProducts,
        products_owned: productNames,
        message: syncedProducts.length > 0 
          ? `Synced ${syncedProducts.length} products` 
          : "No products found in your orders",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-shopify-products] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
