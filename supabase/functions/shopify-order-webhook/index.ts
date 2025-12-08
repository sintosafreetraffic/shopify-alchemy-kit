/**
 * Shopify Order Webhook Edge Function
 * 
 * Handles order creation/payment webhooks and triggers Sleep Sync.
 * Uses centralized env/cors helpers and syncAndStoreAttributes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  fullSleepSync,
} from "../_shared/sleep-sync.ts";
import { SleepSyncSource } from "../_shared/types.ts";

const KLAVIYO_LIST_ID = "UEJzEU";

// Verify Shopify HMAC signature
async function verifyShopifyHmac(body: string, hmacHeader: string | null): Promise<boolean> {
  if (!hmacHeader) {
    console.error("[Shopify] Missing HMAC header");
    return false;
  }

  const secret = getEnvVar("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[Shopify] SHOPIFY_WEBHOOK_SECRET not configured");
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

  const isValid = computedHmac === hmacHeader;
  if (!isValid) {
    console.error("[Shopify] HMAC verification failed");
  }
  return isValid;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body for HMAC verification
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    
    // Verify HMAC signature
    const isValidHmac = await verifyShopifyHmac(rawBody, hmacHeader);
    if (!isValidHmac) {
      console.error("[Shopify] Invalid webhook signature - rejecting request");
      return createErrorResponse("Invalid signature", 401);
    }
    
    console.log("[Shopify] HMAC signature verified successfully");

    const shopifyTopic = req.headers.get("x-shopify-topic");
    console.log("[Shopify] Webhook received, topic:", shopifyTopic);

    // Only process order creation/payment events
    if (shopifyTopic !== "orders/create" && shopifyTopic !== "orders/paid") {
      console.log("[Shopify] Ignoring non-order topic:", shopifyTopic);
      return createSuccessResponse({ success: true, message: "Ignored" });
    }

    // Parse body after HMAC verification
    const order = JSON.parse(rawBody);
    console.log("[Shopify] Order received:", order.id, order.email);

    const email = order.email;
    if (!email) {
      console.log("[Shopify] No email in order, skipping");
      return createSuccessResponse({ success: true, message: "No email" });
    }

    // Use centralized env helpers
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar("KLAVIYO_PRIVATE_API_KEY");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract product names from line items and map to our product categories
    const extractProductsOwned = (lineItems: any[]): string[] => {
      const productsOwned: string[] = [];
      
      for (const item of lineItems || []) {
        const title = (item.title || "").toLowerCase();
        const productName = (item.product_id ? item.name : item.title || "").toLowerCase();
        
        // Map Shopify product titles to our product categories
        if (title.includes("ergonomic") && (title.includes("sleep") || title.includes("pillow")) && !title.includes("knee")) {
          if (!productsOwned.includes("Ergonomic Pillow")) {
            productsOwned.push("Ergonomic Pillow");
          }
        }
        if (title.includes("knee") && title.includes("pillow")) {
          if (!productsOwned.includes("Knee Pillow")) {
            productsOwned.push("Knee Pillow");
          }
        }
        if (title.includes("sleep") && title.includes("mask")) {
          if (!productsOwned.includes("Sleep Mask")) {
            productsOwned.push("Sleep Mask");
          }
        }
        // Also check variant names for bundles
        const variantTitle = (item.variant_title || "").toLowerCase();
        if (variantTitle.includes("bundle") || title.includes("bundle")) {
          // Bundles typically include multiple products
          if (!productsOwned.includes("Ergonomic Pillow")) {
            productsOwned.push("Ergonomic Pillow");
          }
        }
      }
      
      console.log("[Shopify] Extracted products from order:", productsOwned);
      return productsOwned;
    };

    const newProductsFromOrder = extractProductsOwned(order.line_items);

    // Update sleep profile with purchase info
    const { data: existingProfile } = await supabase
      .from('sleep_profiles')
      .select('email, purchase_count, products_owned')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      // Merge existing products with new products (avoid duplicates)
      const existingProducts = existingProfile.products_owned || [];
      const mergedProducts = [...new Set([...existingProducts, ...newProductsFromOrder])];
      
      // Update purchase count and products owned
      await supabase
        .from('sleep_profiles')
        .update({
          purchase_count: (existingProfile.purchase_count || 0) + 1,
          delivery_date: new Date().toISOString().split('T')[0],
          products_owned: mergedProducts,
        })
        .eq('email', email);
      console.log("[Shopify] Updated profile for:", email, "Products owned:", mergedProducts);
    } else {
      // Create new profile if none exists
      await supabase
        .from('sleep_profiles')
        .insert({
          email,
          purchase_count: 1,
          delivery_date: new Date().toISOString().split('T')[0],
          products_owned: newProductsFromOrder,
          sleep_position: 'side', // Default
        });
      console.log("[Shopify] Created new profile for:", email, "Products owned:", newProductsFromOrder);
    }

    // Create or update profile in Klaviyo
    console.log("[Klaviyo] Creating/updating profile for:", email);
    const profileResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
        "revision": "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            first_name: order.customer?.first_name || order.billing_address?.first_name,
            last_name: order.customer?.last_name || order.billing_address?.last_name,
            phone_number: order.customer?.phone || order.billing_address?.phone,
            properties: {
              shopify_customer_id: order.customer?.id,
              total_spent: order.total_price,
              last_order_date: order.created_at,
              last_order_id: order.id,
            },
          },
        },
      }),
    });

    const profileData = await profileResponse.json();
    console.log("[Klaviyo] Profile response status:", profileResponse.status);

    // Get profile ID
    let profileId = profileData.data?.id;
    if (!profileId && profileData.errors) {
      const duplicateError = profileData.errors.find((e: any) => e.code === "duplicate_profile");
      if (duplicateError?.meta?.duplicate_profile_id) {
        profileId = duplicateError.meta.duplicate_profile_id;
        console.log("[Klaviyo] Using existing profile ID:", profileId);
      }
    }

    // Subscribe to list
    if (profileId) {
      console.log("[Klaviyo] Subscribing profile to list:", KLAVIYO_LIST_ID);
      await fetch(`https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`, {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
          "revision": "2024-02-15",
        },
        body: JSON.stringify({
          data: [{ type: "profile", id: profileId }],
        }),
      });
    }

    // Track the order event
    console.log("[Klaviyo] Tracking Placed Order event");
    await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
        "revision": "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            profile: { $email: email },
            metric: { name: "Placed Order" },
            properties: {
              OrderId: order.id,
              OrderNumber: order.order_number,
              Value: parseFloat(order.total_price),
              Currency: order.currency,
              ItemCount: order.line_items?.length || 0,
              Items: order.line_items?.map((item: any) => ({
                ProductID: item.product_id,
                SKU: item.sku,
                ProductName: item.title,
                Quantity: item.quantity,
                ItemPrice: parseFloat(item.price),
                VariantName: item.variant_title,
              })),
            },
            value: parseFloat(order.total_price),
            unique_id: `order_${order.id}`,
          },
        },
      }),
    });

    // TRIGGER FULL SLEEP SYNC - Use fullSleepSync for complete 3-layer sync
    console.log("[Sleep Sync] Triggering fullSleepSync for order:", email);
    try {
      await fullSleepSync(
        supabase,
        email,
        'shopify' as SleepSyncSource,
        KLAVIYO_PRIVATE_API_KEY
      );
      console.log("[Sleep Sync] fullSleepSync completed for:", email);
    } catch (syncError) {
      console.error("[Sleep Sync] Error:", syncError);
      // Non-blocking
    }

    console.log("[Shopify] Successfully processed order webhook");
    return createSuccessResponse({ success: true });
  } catch (error: any) {
    console.error("[Shopify] Webhook error:", error);
    return createErrorResponse(error.message, 500);
  }
});
