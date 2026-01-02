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
    
    // Try SHOPIFY_ADMIN_API_TOKEN first (has more permissions), fallback to SHOPIFY_ACCESS_TOKEN
    const shopifyAccessToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyAccessToken) {
      console.error("[sync-shopify-products] No Shopify token configured");
      return new Response(
        JSON.stringify({ error: "Shopify access token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const shopifyDomain = "lovable-project-swlbs.myshopify.com";

    console.log(`[sync-shopify-products] Syncing for email: ${email}`);
    console.log(`[sync-shopify-products] Using token: ${shopifyAccessToken ? 'ADMIN_TOKEN' : 'ACCESS_TOKEN'}`);

    // Search orders directly by email (doesn't require customer read access)
    // This approach works even if we don't have read_customers scope
    const ordersSearchUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(email)}&status=any&limit=250`;
    
    console.log(`[sync-shopify-products] Fetching orders by email...`);
    const ordersResponse = await fetch(ordersSearchUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error(`[sync-shopify-products] Orders fetch failed: ${ordersResponse.status}`, errorText);
      
      // If 403, the token doesn't have read_orders permission
      if (ordersResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "Shopify API permission denied. The access token may not have the required 'read_orders' scope.",
            synced_products: [] 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];
    
    console.log(`[sync-shopify-products] Found ${orders.length} orders for email: ${email}`);

    // If no orders found, update sync timestamp and return
    if (orders.length === 0) {
      await supabase
        .from("sleep_profiles")
        .update({ last_shopify_sync: new Date().toISOString() })
        .eq("email", email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No orders found for this email",
          synced_products: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract products from orders (include all non-cancelled, non-refunded orders)
    const syncedProducts: Array<{
      product_slug: string;
      product_title: string;
      acquired_at: string;
      shopify_order_id: string;
    }> = [];

    for (const order of orders) {
      // Skip fully cancelled orders (cancelled_at is set)
      // Note: We're including cancelled orders for now since user wants to test
      // In production, you might want to skip: if (order.cancelled_at) continue;
      
      // Skip refunded orders
      const financialStatus = order.financial_status;
      if (financialStatus === "refunded" || financialStatus === "voided") {
        console.log(`[sync-shopify-products] Skipping order ${order.id} with financial status: ${financialStatus}`);
        continue;
      }

      const orderDate = order.created_at;
      const orderId = String(order.id);
      const fulfillmentStatus = order.fulfillment_status || "unfulfilled";
      const cancelledAt = order.cancelled_at;

      console.log(`[sync-shopify-products] Processing order ${order.id} (fulfillment: ${fulfillmentStatus}, financial: ${financialStatus}, cancelled: ${cancelledAt ? 'yes' : 'no'})`);

      for (const lineItem of order.line_items || []) {
        const sku = lineItem.sku;
        const productId = lineItem.product_id;
        const title = lineItem.title;
        const variantTitle = lineItem.variant_title;
        
        console.log(`[sync-shopify-products] Line item: SKU=${sku}, ProductID=${productId}, Title="${title}", Variant="${variantTitle}"`);
        
        // Try to get handle from product (optional - adds more info but not required)
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
              console.log(`[sync-shopify-products] Product handle: ${handle}`);
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
            console.log(`[sync-shopify-products] ✓ Mapped: "${title}" -> ${productSlug}`);
          } else {
            console.log(`[sync-shopify-products] Duplicate skipped: ${productSlug}`);
          }
        } else {
          console.log(`[sync-shopify-products] ✗ Could not map: SKU=${sku}, Handle=${handle}, Title="${title}"`);
        }
      }
    }

    console.log(`[sync-shopify-products] Total products to sync: ${syncedProducts.length}`);

    // Upsert products to user_product_ownership table
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
        console.error(`[sync-shopify-products] Error upserting ${product.product_slug}:`, error);
      }
    }

    // Update products_owned array in sleep_profiles
    const productNames = syncedProducts.map(p => {
      return SLUG_TO_DISPLAY_NAME[p.product_slug] || p.product_title;
    }).filter(Boolean);

    console.log(`[sync-shopify-products] Updating sleep_profiles.products_owned: ${JSON.stringify(productNames)}`);

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

    console.log(`[sync-shopify-products] ✓ Sync complete. Products: ${syncedProducts.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_products: syncedProducts,
        products_owned: productNames,
        orders_found: orders.length,
        message: syncedProducts.length > 0 
          ? `Found ${syncedProducts.length} product(s) from ${orders.length} order(s)` 
          : `No recognized products found in ${orders.length} order(s)`,
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
