/**
 * Shopify Order Webhook Edge Function
 * 
 * Handles order creation/payment webhooks and triggers Sleep Sync.
 * Uses centralized env/cors helpers and syncAndStoreAttributes.
 * 
 * HARDENED: Logs all Pinterest purchase events to pinterest_purchase_events table
 * 
 * Phase 5: Added preflight attribution classification to ensure only pinterest-capi-direct
 * is used as the authoritative send path. Removed direct Render fallback to prevent drift.
 * 
 * CHAOS INJECTION (Phase 3.5):
 * Supports controlled failure injection via query params or headers:
 * - chaos=pinterest_timeout (C1)
 * - chaos=pinterest_partial_success (C2)
 * - chaos=db_write_fail_before_send (C6)
 * - chaos=db_unavailable (C8)
 * - C9 (auth failure) is tested by sending invalid HMAC
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
import {
  classifyAttribution,
  getSendMode,
  type AttributionResult,
} from "../_shared/attribution.ts";

// ============================================================================
// CHAOS INJECTION HELPERS (Phase 3.5)
// ============================================================================

type ChaosMode = 
  | 'pinterest_timeout' 
  | 'pinterest_partial_success' 
  | 'db_write_fail_before_send' 
  | 'db_unavailable'
  | null;

/**
 * Extract chaos mode from request (query param or header)
 * Returns null if no valid chaos mode specified
 */
function extractChaosMode(req: Request): ChaosMode {
  // Check query param first
  const url = new URL(req.url);
  const chaosParam = url.searchParams.get('chaos');
  
  // Check header as fallback
  const chaosHeader = req.headers.get('x-chaos-mode');
  
  const chaosValue = chaosParam || chaosHeader;
  
  if (!chaosValue) {
    return null;
  }
  
  // Validate against known chaos modes
  const validModes: ChaosMode[] = [
    'pinterest_timeout',
    'pinterest_partial_success', 
    'db_write_fail_before_send',
    'db_unavailable',
  ];
  
  if (validModes.includes(chaosValue as ChaosMode)) {
    console.warn(`[CHAOS] Mode activated: ${chaosValue}`);
    return chaosValue as ChaosMode;
  }
  
  // Unknown chaos value - log warning and proceed normally
  console.warn(`[CHAOS] Unknown chaos mode ignored: ${chaosValue}`);
  return null;
}

// ============================================================================
// END CHAOS INJECTION HELPERS
// ============================================================================

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
  rbn_context_id: string | null;
  // Match signals from context table (populated via joinPinterestContext)
  client_ip_address: string | null;
  client_user_agent: string | null;
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
    rbn_context_id: findAttr('rbn_context_id'),
    // These will be populated by joinPinterestContext
    client_ip_address: null,
    client_user_agent: null,
  };
}

// Join attribution with pinterest_context table to get IP/UA for match signals
async function joinPinterestContext(
  supabase: any,
  attribution: AttributionData
): Promise<AttributionData> {
  const contextId = attribution.rbn_context_id;
  
  if (!contextId) {
    console.log('[Pinterest] No rbn_context_id in order, skipping context join');
    return attribution;
  }
  
  try {
    const { data: context, error } = await supabase
      .from('pinterest_context')
      .select('*')
      .eq('context_id', contextId)
      .maybeSingle();
    
    if (error) {
      console.error('[Pinterest] Context lookup error:', error.message);
      return attribution;
    }
    
    if (!context) {
      console.log('[Pinterest] No context found for:', contextId);
      return attribution;
    }
    
    console.log('[Pinterest] Context found:', {
      context_id: contextId,
      consent_status: context.consent_status,
      has_epik: !!context.epik,
      has_ip: !!context.client_ip_address,
      has_ua: !!context.client_user_agent,
    });
    
    // Merge rules:
    // 1) order.note_attributes has highest precedence for attribution
    // 2) pinterest_context fills in missing values
    // 3) IP/UA only included if consent_status === 'granted'
    
    const merged: AttributionData = {
      ...attribution,
      // Attribution fallbacks (order takes precedence)
      pinterest_click_id: attribution.pinterest_click_id || context.epik,
      landing_page: attribution.landing_page || context.landing_page,
      utm_source: attribution.utm_source || context.utm_source,
      utm_medium: attribution.utm_medium || context.utm_medium,
      utm_campaign: attribution.utm_campaign || context.utm_campaign,
      utm_content: attribution.utm_content || context.utm_content,
      utm_term: attribution.utm_term || context.utm_term,
      referrer: attribution.referrer || context.referrer,
      // Match signals (consent-gated)
      client_ip_address: context.consent_status === 'granted' ? context.client_ip_address : null,
      client_user_agent: context.consent_status === 'granted' ? context.client_user_agent : null,
    };
    
    console.log('[Pinterest] Attribution merged:', {
      has_epik: !!merged.pinterest_click_id,
      has_ip: !!merged.client_ip_address,
      has_ua: !!merged.client_user_agent,
      epik_source: attribution.pinterest_click_id ? 'order' : (context.epik ? 'context' : 'none'),
    });
    
    return merged;
  } catch (err: any) {
    console.error('[Pinterest] Context join error (non-blocking):', err.message);
    return attribution;
  }
}

/**
 * Insert pending tracking row for idempotency.
 * Returns true if this is a NEW order (we should proceed with tracking).
 * Returns false if duplicate (we should exit early).
 * 
 * Day 1-2: Added delivery_state for operational tracking
 */
async function insertPendingTrackingRow(
  supabase: any,
  orderId: string,
  value: number,
  currency: string,
  attribution: AttributionData,
  isTest: boolean = false
): Promise<boolean> {
  try {
    // Use INSERT ... ON CONFLICT DO NOTHING for idempotency
    const { data, error } = await supabase
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
        render_status: 'pending',
        render_response: null,
        is_test: isTest,
        // Day 1-2: Operational delivery state
        delivery_state: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log("[Pinterest] Duplicate order detected, skipping:", orderId);
        return false;
      }
      console.error("[Pinterest] Failed to insert pending row:", error);
      // On other errors, still try to proceed (fail open for tracking)
      return true;
    }

    // If no data returned but no error, it was a duplicate (ON CONFLICT DO NOTHING)
    if (!data) {
      console.log("[Pinterest] Order already exists (no insert), skipping:", orderId);
      return false;
    }

    console.log("[Pinterest] Pending row inserted for:", orderId);
    return true;
  } catch (insertError) {
    console.error("[Pinterest] Error inserting pending row (proceeding anyway):", insertError);
    return true; // Fail open - try to track anyway
  }
}

/**
 * Update tracking row status after Pinterest attempt
 * Day 1-2: Also updates delivery_state for operational tracking
 */
async function updateTrackingStatus(
  supabase: any,
  orderId: string,
  renderStatus: string,
  renderResponse: any = null,
  deliveryState?: string
): Promise<void> {
  try {
    const updateData: Record<string, any> = {
      render_status: renderStatus,
      render_response: renderResponse,
    };
    
    // Day 1-2: Map render_status to delivery_state if not explicitly provided
    if (deliveryState) {
      updateData.delivery_state = deliveryState;
    } else if (renderStatus.includes('success')) {
      updateData.delivery_state = 'sent';
    } else if (renderStatus.includes('error') || renderStatus.includes('fail')) {
      updateData.delivery_state = 'failed';
    } else if (renderStatus.includes('blocked') || renderStatus.includes('chaos')) {
      updateData.delivery_state = renderStatus; // Use the specific blocked reason
    }
    
    const { error } = await supabase
      .from('pinterest_purchase_events')
      .update(updateData)
      .eq('order_id', orderId);

    if (error) {
      console.error("[Pinterest] Failed to update tracking status:", error);
    } else {
      console.log("[Pinterest] Tracking status updated:", orderId, "->", renderStatus, 
        updateData.delivery_state ? `(delivery: ${updateData.delivery_state})` : '');
    }
  } catch (updateError) {
    console.error("[Pinterest] Error updating tracking status (non-blocking):", updateError);
  }
}

// Legacy function for backward compatibility (non-idempotent path)
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
      .upsert({
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
      }, {
        onConflict: 'order_id',
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

    // ========================================================================
    // CHAOS: Extract chaos mode from request
    // ========================================================================
    const chaosMode = extractChaosMode(req);
    
    // Detect if this is a chaos test (mark orders as test data)
    const isChaosTest = req.headers.get('x-chaos-source') === 'true' || chaosMode !== null;
    if (isChaosTest) {
      console.log("[CHAOS] Request marked as chaos test - orders will be marked as is_test=true");
    }
    
    // ========================================================================
    // CHAOS C8: DB Unavailable - Simulate complete DB failure
    // Must happen before ANY DB operations
    // ========================================================================
    if (chaosMode === 'db_unavailable') {
      console.error("[CHAOS] C8: Simulating DB unavailable - returning 500 for Shopify retry");
      return createErrorResponse("CHAOS: Database unavailable", 500);
    }

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
    let attribution = extractAttributionFromOrder(order);
    
    // Join with pinterest_context to get IP/UA for match signals
    attribution = await joinPinterestContext(supabase, attribution);
    
    console.log("[Shopify] Attribution data:", {
      has_epik: !!attribution.pinterest_click_id,
      has_utm_source: !!attribution.utm_source,
      has_landing_page: !!attribution.landing_page,
      has_context_id: !!attribution.rbn_context_id,
      has_ip: !!attribution.client_ip_address,
      has_ua: !!attribution.client_user_agent,
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
    // IDEMPOTENCY: Insert pending row FIRST, exit early if duplicate
    const orderValue = parseFloat(order.total_price);
    const orderCurrency = order.currency || 'USD';
    const orderId = String(order.id);
    
    if (shouldTrackPurchase) {
      // STEP 1: Insert pending row for idempotency check
      const isNewOrder = await insertPendingTrackingRow(
        supabase,
        orderId,
        orderValue,
        orderCurrency,
        attribution,
        isChaosTest // Mark as test if this is a chaos test request
      );
      
      if (!isNewOrder) {
        // Duplicate order - return 200 immediately so Shopify stops retrying
        console.log("[Pinterest] Duplicate webhook detected, returning 200:", orderId);
        return createSuccessResponse({ success: true, message: "Duplicate order, skipped" });
      }

      // ======================================================================
      // CHAOS C6: DB Write Fail Before Send
      // Pending row inserted successfully, now simulate failure before Pinterest call
      // ======================================================================
      if (chaosMode === 'db_write_fail_before_send') {
        console.error("[CHAOS] C6: Simulating DB failure after insert, before Pinterest send");
        await updateTrackingStatus(supabase, orderId, 'chaos_db_fail_before_send', {
          chaos: true,
          reason: 'Simulated DB failure before external call',
        });
        // This order is now in missing_purchase_events-eligible state (no success)
        // Recovery can pick it up
        return createSuccessResponse({ success: true, chaos: 'db_write_fail_before_send' });
      }

      // ======================================================================
      // PHASE 5: PREFLIGHT ATTRIBUTION CLASSIFICATION (B)
      // Classify attribution BEFORE any Pinterest send attempt.
      // This ensures consistent routing through pinterest-capi-direct only.
      // ======================================================================
      
      const preflightAttribution = classifyAttribution({
        pinterest_click_id: attribution.pinterest_click_id,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
      });
      
      const sendMode = await getSendMode(supabase);
      
      console.log("[Pinterest] Preflight attribution:", {
        order_id: orderId,
        attribution_source: preflightAttribution.attribution_source,
        attribution_confidence: preflightAttribution.attribution_confidence,
        should_send: preflightAttribution.should_send_to_pinterest,
        send_mode: sendMode,
      });

      // Build products array
      const products = (order.line_items || []).map((item: any) => ({
        id: String(item.product_id),
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));

      // Build tracking payload with full attribution + match signals
      const pinterestPayload: Record<string, any> = {
        order_id: orderId,
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
        is_test: isChaosTest, // Pass test flag to CAPI
      };
      
      // Add match signals if available (from pinterest_context via joinPinterestContext)
      if (attribution.client_ip_address) {
        pinterestPayload.client_ip_address = attribution.client_ip_address;
      }
      if (attribution.client_user_agent) {
        pinterestPayload.client_user_agent = attribution.client_user_agent;
      }

      console.log("[Pinterest] Payload:", {
        order_id: pinterestPayload.order_id,
        value: pinterestPayload.value,
        has_epik: !!pinterestPayload.pinterest_click_id,
        has_email: !!pinterestPayload.email,
        has_ip: !!pinterestPayload.client_ip_address,
        has_ua: !!pinterestPayload.client_user_agent,
        utm_source: pinterestPayload.utm_source,
        method: 'DIRECT_CAPI_ONLY', // Phase 5: Only one path
      });

      // STEP 3: Attempt Pinterest tracking
      let trackingSuccess = false;
      let finalStatus = 'error';
      let finalResponse: any = null;

      // ======================================================================
      // CHAOS C1: Pinterest Timeout - Simulate timeout before any Pinterest call
      // ======================================================================
      if (chaosMode === 'pinterest_timeout') {
        console.error("[CHAOS] C1: Simulating Pinterest timeout");
        finalStatus = 'chaos_timeout';
        finalResponse = { chaos: true, reason: 'Simulated Pinterest timeout' };
        // trackingSuccess stays false - will be picked up by recovery
        await updateTrackingStatus(supabase, orderId, finalStatus, finalResponse);
        return createSuccessResponse({ success: true, chaos: 'pinterest_timeout' });
      }

      // ======================================================================
      // CHAOS C2: Pinterest Partial Success - Simulate incomplete response
      // ======================================================================
      if (chaosMode === 'pinterest_partial_success') {
        console.error("[CHAOS] C2: Simulating Pinterest partial success (missing conversion ID)");
        finalStatus = 'chaos_partial';
        finalResponse = { chaos: true, reason: 'Simulated partial success - missing conversion ID' };
        // trackingSuccess stays false - will be picked up by recovery
        await updateTrackingStatus(supabase, orderId, finalStatus, finalResponse);
        return createSuccessResponse({ success: true, chaos: 'pinterest_partial_success' });
      }

      // ======================================================================
      // PHASE 5: SINGLE CANONICAL SEND PATH - pinterest-capi-direct ONLY
      // Removed Render fallback to prevent attribution drift.
      // pinterest-capi-direct handles all gating, logging, and blocking.
      // ======================================================================
      
      console.log("[Pinterest] Using DIRECT CAPI (canonical path - Phase 5)");
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
          console.log("[Pinterest] ✅ DIRECT CAPI: Purchase processed:", orderId, {
            send_status: directCapiResult.send_status,
            attribution_source: directCapiResult.attribution_source,
          });
          trackingSuccess = true;
          // Use send_status from CAPI response for accurate status
          finalStatus = directCapiResult.send_status === 'sent' ? 'success_direct' : `blocked_${directCapiResult.send_status}`;
          finalResponse = { status: directCapiResponse.status, result: directCapiResult };
        } else {
          console.error("[Pinterest] DIRECT CAPI: Processing failed:", directCapiResult);
          finalStatus = 'error_direct';
          finalResponse = { status: directCapiResponse.status, error: directCapiResult };
        }
      } catch (directError: any) {
        console.error("[Pinterest] DIRECT CAPI Error:", directError.message);
        finalStatus = 'error_direct';
        finalResponse = { error: directError.message || 'Unknown direct CAPI error' };
      }

      // STEP 4: Update tracking status with final result
      await updateTrackingStatus(supabase, orderId, finalStatus, finalResponse);
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
