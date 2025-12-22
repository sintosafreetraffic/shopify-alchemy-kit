/**
 * Shopify Order Webhook Edge Function
 * 
 * Handles order creation/payment webhooks and triggers Sleep Sync.
 * Uses centralized env/cors helpers and syncAndStoreAttributes.
 * 
 * HARDENED: Logs all Pinterest purchase events to pinterest_purchase_events table
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

// Verify Shopify HMAC signature - STRICT VERIFICATION
async function verifyShopifyHmac(body: string, hmacHeader: string | null): Promise<boolean> {
  // Fail closed: missing header = invalid
  if (!hmacHeader) {
    console.error("[Shopify] HMAC header missing - REJECTING");
    return false;
  }

  const secret = getEnvVar("SHOPIFY_WEBHOOK_SECRET");
  // Fail closed: missing secret = invalid
  if (!secret) {
    console.error("[Shopify] SHOPIFY_WEBHOOK_SECRET not configured - REJECTING");
    return false;
  }

  try {
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

    // Constant-time comparison would be ideal, but for HMAC this is acceptable
    const isValid = computedHmac === hmacHeader;
    if (!isValid) {
      console.error("[Shopify] HMAC mismatch - REJECTING");
    }
    return isValid;
  } catch (hmacError) {
    console.error("[Shopify] HMAC computation error - REJECTING:", hmacError);
    return false;
  }
}

// Extract attribution data from note_attributes reliably
interface AttributionData {
  pinterest_click_id: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
}

function extractAttributionFromOrder(order: any): AttributionData {
  const noteAttributes = order.note_attributes || [];
  
  // Helper to find attribute by multiple possible keys
  const findAttr = (...keys: string[]): string | null => {
    for (const key of keys) {
      const attr = noteAttributes.find(
        (a: { name: string; value: string }) => 
          a.name === key || a.name === `_${key}` || a.name.toLowerCase() === key.toLowerCase()
      );
      if (attr?.value) return attr.value;
    }
    return null;
  };

  return {
    pinterest_click_id: findAttr('_ep', 'pinterest_click_id', '_pinterest_click_id', 'epik'),
    landing_page: findAttr('pinterest_landing_page', '_pinterest_landing_page', 'landing_page') || order.landing_site,
    utm_source: findAttr('utm_source', '_utm_source'),
    utm_medium: findAttr('utm_medium', '_utm_medium'),
    utm_campaign: findAttr('utm_campaign', '_utm_campaign'),
    utm_content: findAttr('utm_content', '_utm_content'),
    utm_term: findAttr('utm_term', '_utm_term'),
    referrer: findAttr('referrer', '_referrer') || order.referring_site,
  };
}

// Log Pinterest purchase event to database
async function logPinterestPurchaseEvent(
  supabase: any,
  orderId: string,
  value: number,
  currency: string,
  attribution: AttributionData,
  renderStatus: string,
  renderResponse: any = null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('pinterest_purchase_events')
      .insert({
        order_id: orderId,
        value,
        currency,
        epik: attribution.pinterest_click_id,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        landing_page: attribution.landing_page,
        source: 'shopify_webhook',
        render_status: renderStatus,
        render_response: renderResponse,
      });

    if (error) {
      console.error("[Pinterest] Failed to log purchase event:", error);
    } else {
      console.log("[Pinterest] Purchase event logged to DB:", orderId);
    }
  } catch (logError) {
    console.error("[Pinterest] Error logging purchase event (non-blocking):", logError);
  }
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
    
    // STRICT HMAC verification - fail closed
    const isValidHmac = await verifyShopifyHmac(rawBody, hmacHeader);
    if (!isValidHmac) {
      // Return 401 to Shopify - will retry later
      console.error("[Shopify] Invalid webhook signature - REJECTING request");
      return createErrorResponse("Invalid signature", 401);
    }
    
    console.log("[Shopify] ✓ HMAC signature verified");

    const shopifyTopic = req.headers.get("x-shopify-topic");
    console.log("[Shopify] Webhook received, topic:", shopifyTopic);

    // Routing logic based on topic
    // orders/paid: Full processing (profile + Klaviyo + Pinterest tracking)
    // orders/create: Profile update only (no Pinterest - avoid double-tracking)
    // Other topics: Ignore
    const isOrdersPaid = shopifyTopic === "orders/paid";
    const isOrdersCreate = shopifyTopic === "orders/create";
    
    if (!isOrdersPaid && !isOrdersCreate) {
      console.log("[Shopify] Ignoring non-order topic:", shopifyTopic);
      return createSuccessResponse({ success: true, message: "Ignored" });
    }
    
    // For orders/create, we only update profile - skip tracking to avoid duplication
    const shouldTrackPurchase = isOrdersPaid;

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

    // Extract attribution data upfront
    const attribution = extractAttributionFromOrder(order);
    console.log("[Shopify] Attribution data:", {
      has_epik: !!attribution.pinterest_click_id,
      has_utm_source: !!attribution.utm_source,
      has_landing_page: !!attribution.landing_page,
    });

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

    // PINTEREST TRACKING - Only on orders/paid to avoid double-tracking
    // Check if direct CAPI is enabled via app_settings toggle
    const orderValue = parseFloat(order.total_price);
    const orderCurrency = order.currency || 'EUR';
    
    if (shouldTrackPurchase) {
      // Check if direct CAPI is enabled
      const { data: capiSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pinterest_direct_capi')
        .single();
      
      const useDirectCapi = capiSetting?.value?.enabled === true;
      console.log("[Pinterest] Direct CAPI enabled:", useDirectCapi);

      // Build products array (used by both methods)
      const products = (order.line_items || []).map((item: any) => ({
        id: String(item.product_id),
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));

      // Build tracking payload with full attribution
      const pinterestPayload = {
        order_id: String(order.id),
        event_type: 'purchase',
        value: orderValue,
        currency: orderCurrency,
        products,
        email: order.email,
        phone: order.customer?.phone || order.billing_address?.phone,
        pinterest_click_id: attribution.pinterest_click_id,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        landing_page: attribution.landing_page,
        referrer: attribution.referrer,
      };

      console.log("[Pinterest] Payload:", {
        order_id: pinterestPayload.order_id,
        value: pinterestPayload.value,
        has_epik: !!pinterestPayload.pinterest_click_id,
        has_email: !!pinterestPayload.email,
        utm_source: pinterestPayload.utm_source,
        method: useDirectCapi ? 'DIRECT_CAPI' : 'RENDER',
      });

      if (useDirectCapi) {
        // Use direct Pinterest CAPI edge function
        console.log("[Pinterest] Using DIRECT CAPI (Supabase edge function)");
        try {
          const directCapiResponse = await fetch(`${SUPABASE_URL}/functions/v1/pinterest-capi-direct`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify(pinterestPayload),
          });

          const directCapiResult = await directCapiResponse.json();
          
          if (directCapiResponse.ok && directCapiResult.success) {
            console.log("[Pinterest] ✅ DIRECT CAPI: Purchase tracked successfully:", order.id);
          } else {
            console.error("[Pinterest] DIRECT CAPI: Tracking failed:", directCapiResult);
          }
        } catch (directError: any) {
          console.error("[Pinterest] DIRECT CAPI Error (non-blocking):", directError);
          // Log error to DB
          await logPinterestPurchaseEvent(
            supabase,
            String(order.id),
            orderValue,
            orderCurrency,
            attribution,
            'direct_error',
            { error: directError.message || 'Unknown error' }
          );
        }
      } else {
        // Use Render tracking server (legacy)
        const trackingServerUrl = getEnvVar("TRACKING_SERVER_URL");
        
        if (trackingServerUrl) {
          console.log("[Pinterest] Using RENDER tracking server (legacy)");
          try {
            const pinterestResponse = await fetch(`${trackingServerUrl}/track/client`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pinterestPayload),
            });

            const pinterestResult = await pinterestResponse.json();
            
            if (pinterestResponse.ok && pinterestResult.success) {
              console.log("[Pinterest] ✅ RENDER: Purchase tracked successfully:", order.id);
              await logPinterestPurchaseEvent(
                supabase,
                String(order.id),
                orderValue,
                orderCurrency,
                attribution,
                'success',
                { status: pinterestResponse.status, result: pinterestResult }
              );
            } else {
              console.error("[Pinterest] RENDER: Tracking failed:", pinterestResult);
              await logPinterestPurchaseEvent(
                supabase,
                String(order.id),
                orderValue,
                orderCurrency,
                attribution,
                'failed',
                { status: pinterestResponse.status, error: pinterestResult }
              );
            }
          } catch (pinterestError: any) {
            console.error("[Pinterest] RENDER Error (non-blocking):", pinterestError);
            await logPinterestPurchaseEvent(
              supabase,
              String(order.id),
              orderValue,
              orderCurrency,
              attribution,
              'error',
              { error: pinterestError.message || 'Unknown error' }
            );
          }
        } else {
          console.log("[Pinterest] TRACKING_SERVER_URL not configured and direct CAPI disabled, skipping");
          await logPinterestPurchaseEvent(
            supabase,
            String(order.id),
            orderValue,
            orderCurrency,
            attribution,
            'skipped_no_url',
            null
          );
        }
      }
    } else if (!shouldTrackPurchase) {
      console.log("[Pinterest] Skipping tracking for orders/create (only orders/paid triggers Pinterest)");
    }

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

    console.log("[Shopify] ✅ Successfully processed order webhook");
    return createSuccessResponse({ success: true });
  } catch (error: any) {
    console.error("[Shopify] Webhook error:", error);
    // Return 500 so Shopify will retry
    return createErrorResponse(error.message, 500);
  }
});
