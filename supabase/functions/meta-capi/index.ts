/**
 * Meta Conversions API Edge Function
 * 
 * Server-side Meta (Facebook) purchase event tracking via Conversions API.
 * Called from shopify-order-webhook after successful order payment.
 * 
 * Features:
 * - SHA-256 hashing of PII (email, phone, name, address)
 * - Event deduplication via event_id
 * - Enhanced matching with all available customer data
 * - fbc/fbp click tracking parameter support
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

// ============================================================================
// TYPES
// ============================================================================

interface MetaPurchaseEventData {
  order_id: string;
  value: number;
  currency: string;
  email?: string;
  phone?: string;
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  // Customer info for enhanced matching
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  // Attribution data
  fbc?: string;  // Meta click ID from _fbc cookie
  fbp?: string;  // Meta browser ID from _fbp cookie
  landing_page?: string;
  // Match signals
  client_ip_address?: string;
  client_user_agent?: string;
  // Test mode
  is_test?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * SHA-256 hash helper for PII
 * Meta requires lowercase, trimmed, SHA-256 hashed values
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clean and normalize phone number
 * Meta expects E.164 format (digits only, no +)
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Return if we have at least 10 digits
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Normalize zip code - first 5 digits for US
 */
function normalizeZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  // Remove non-alphanumeric and take first 5-10 chars
  return zip.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase();
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Meta CAPI] Request received");

  try {
    // Get required environment variables
    const META_PIXEL_ID = requireEnvVar("META_PIXEL_ID");
    const META_ACCESS_TOKEN = requireEnvVar("META_ACCESS_TOKEN");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const eventData: MetaPurchaseEventData = await req.json();

    // Generate stable event_id for deduplication
    // CRITICAL: Use order_id only (no timestamp) to allow dedup with browser-side events
    const eventId = `purchase_${eventData.order_id}`;
    const eventTime = Math.floor(Date.now() / 1000);

    console.log("[Meta CAPI] Processing purchase:", {
      order_id: eventData.order_id,
      event_id: eventId,
      value: eventData.value,
      currency: eventData.currency,
      has_email: !!eventData.email,
      has_phone: !!eventData.phone,
      has_fbc: !!eventData.fbc,
      has_fbp: !!eventData.fbp,
      is_test: eventData.is_test,
    });

    // Skip sending for test orders
    if (eventData.is_test === true) {
      console.log("[Meta CAPI] Skipping test order");
      return createSuccessResponse({
        success: true,
        message: "Test order skipped",
        event_id: eventId,
      });
    }

    // ========================================================================
    // BUILD USER DATA (with proper hashing)
    // ========================================================================
    
    const userData: Record<string, any> = {};

    // Email (em) - most important match key
    if (eventData.email) {
      userData.em = [await sha256Hash(eventData.email)];
    }

    // Phone (ph) - E.164 format, hashed
    if (eventData.phone) {
      const normalizedPhone = normalizePhone(eventData.phone);
      if (normalizedPhone) {
        userData.ph = [await sha256Hash(normalizedPhone)];
      }
    }

    // First name (fn)
    if (eventData.first_name) {
      userData.fn = [await sha256Hash(eventData.first_name)];
    }

    // Last name (ln)
    if (eventData.last_name) {
      userData.ln = [await sha256Hash(eventData.last_name)];
    }

    // City (ct)
    if (eventData.city) {
      userData.ct = [await sha256Hash(eventData.city)];
    }

    // State (st) - 2-letter code
    if (eventData.state) {
      userData.st = [await sha256Hash(eventData.state)];
    }

    // Zip code (zp)
    if (eventData.zip) {
      const normalizedZip = normalizeZip(eventData.zip);
      if (normalizedZip) {
        userData.zp = [await sha256Hash(normalizedZip)];
      }
    }

    // Country (country) - 2-letter ISO code
    if (eventData.country) {
      userData.country = [await sha256Hash(eventData.country.toLowerCase())];
    }

    // Meta click ID (fbc) - NOT hashed, passed as-is
    if (eventData.fbc) {
      userData.fbc = eventData.fbc;
    }

    // Meta browser ID (fbp) - NOT hashed, passed as-is
    if (eventData.fbp) {
      userData.fbp = eventData.fbp;
    }

    // External ID - order_id for cross-platform matching
    userData.external_id = [await sha256Hash(eventData.order_id)];

    // Client IP address (not hashed)
    if (eventData.client_ip_address) {
      userData.client_ip_address = eventData.client_ip_address;
    }

    // Client user agent (not hashed)
    if (eventData.client_user_agent) {
      userData.client_user_agent = eventData.client_user_agent;
    }

    console.log("[Meta CAPI] User data prepared:", {
      has_em: !!userData.em,
      has_ph: !!userData.ph,
      has_fn: !!userData.fn,
      has_ln: !!userData.ln,
      has_ct: !!userData.ct,
      has_st: !!userData.st,
      has_zp: !!userData.zp,
      has_country: !!userData.country,
      has_fbc: !!userData.fbc,
      has_fbp: !!userData.fbp,
      has_ip: !!userData.client_ip_address,
      has_ua: !!userData.client_user_agent,
    });

    // ========================================================================
    // BUILD CUSTOM DATA
    // ========================================================================

    const customData: Record<string, any> = {
      currency: eventData.currency || 'EUR',
      value: eventData.value,
      order_id: eventData.order_id,
    };

    // Add product data if available
    if (eventData.products && eventData.products.length > 0) {
      customData.content_ids = eventData.products.map(p => String(p.id));
      customData.contents = eventData.products.map(p => ({
        id: String(p.id),
        quantity: p.quantity,
        item_price: p.price,
      }));
      customData.content_type = 'product';
      customData.num_items = eventData.products.reduce((sum, p) => sum + p.quantity, 0);
    }

    // ========================================================================
    // BUILD EVENT SOURCE URL
    // ========================================================================

    let eventSourceUrl: string | undefined;
    if (eventData.landing_page) {
      if (eventData.landing_page.startsWith('http://') || eventData.landing_page.startsWith('https://')) {
        eventSourceUrl = eventData.landing_page;
      } else {
        eventSourceUrl = `https://risebynight.com${eventData.landing_page.startsWith('/') ? '' : '/'}${eventData.landing_page}`;
      }
    }

    // ========================================================================
    // BUILD CONVERSION EVENT PAYLOAD
    // ========================================================================

    const conversionPayload = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTime,
          event_id: eventId,
          event_source_url: eventSourceUrl || "https://risebynight.com",
          action_source: "website",
          user_data: userData,
          custom_data: customData,
        },
      ],
      // Test event code for debugging (remove in production)
      // test_event_code: "TEST12345",
    };

    console.log("[Meta CAPI] Sending to Meta API:", {
      pixel_id: META_PIXEL_ID,
      event_id: eventId,
      event_name: "Purchase",
      value: customData.value,
      currency: customData.currency,
      has_event_source_url: !!eventSourceUrl,
    });

    // ========================================================================
    // SEND TO META CONVERSIONS API
    // ========================================================================

    try {
      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...conversionPayload,
            access_token: META_ACCESS_TOKEN,
          }),
        }
      );

      const responseText = await metaResponse.text();
      let metaResult: any;
      try {
        metaResult = JSON.parse(responseText);
      } catch {
        metaResult = { raw_response: responseText };
      }

      console.log("[Meta CAPI] Meta API response:", {
        status: metaResponse.status,
        ok: metaResponse.ok,
        events_received: metaResult.events_received,
      });

      if (metaResponse.ok) {
        // Log successful event
        try {
          await supabase.from('meta_purchase_events').insert({
            order_id: eventData.order_id,
            event_id: eventId,
            value: eventData.value,
            currency: eventData.currency,
            fbc: eventData.fbc || null,
            fbp: eventData.fbp || null,
            send_status: 'sent',
            response_status: metaResponse.status,
            events_received: metaResult.events_received || 0,
          });
        } catch (logError) {
          console.warn("[Meta CAPI] Failed to log event (non-blocking):", logError);
        }

        return createSuccessResponse({
          success: true,
          message: "Purchase event sent to Meta",
          event_id: eventId,
          events_received: metaResult.events_received,
        });
      } else {
        console.error("[Meta CAPI] API error:", metaResult);
        
        // Log failed event
        try {
          await supabase.from('meta_purchase_events').insert({
            order_id: eventData.order_id,
            event_id: eventId,
            value: eventData.value,
            currency: eventData.currency,
            fbc: eventData.fbc || null,
            fbp: eventData.fbp || null,
            send_status: 'error',
            response_status: metaResponse.status,
            error_message: JSON.stringify(metaResult).slice(0, 500),
          });
        } catch (logError) {
          console.warn("[Meta CAPI] Failed to log error (non-blocking):", logError);
        }

        return createSuccessResponse({
          success: false,
          message: "Meta API returned error",
          event_id: eventId,
          error: metaResult,
        });
      }
    } catch (fetchError: any) {
      console.error("[Meta CAPI] Fetch error:", fetchError.message);
      
      return createErrorResponse(
        `Meta API request failed: ${fetchError.message}`,
        500
      );
    }
  } catch (error: any) {
    console.error("[Meta CAPI] Error:", error);
    return createErrorResponse(error.message || "Unknown error", 500);
  }
});
