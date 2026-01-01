/**
 * Shopify Fulfillment Webhook Edge Function
 * 
 * Handles fulfillment creation webhooks from Shopify.
 * When an order is fulfilled with tracking info:
 * 1. Inserts record into shipment_trackings
 * 2. Registers tracking number with 17TRACK for push updates
 * 
 * Topic: fulfillments/create
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

const TRACK17_API_URL = 'https://api.17track.net/track/v2.4';

// ============================================================================
// HMAC VERIFICATION
// ============================================================================

async function verifyShopifyHmac(body: string, hmacHeader: string | null): Promise<boolean> {
  if (!hmacHeader) {
    console.error("[Fulfillment] HMAC header missing - REJECTING");
    return false;
  }

  const secret = getEnvVar("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[Fulfillment] SHOPIFY_WEBHOOK_SECRET not configured - REJECTING");
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

    const isValid = computedHmac === hmacHeader;
    if (!isValid) {
      console.error("[Fulfillment] HMAC mismatch - REJECTING");
    }
    return isValid;
  } catch (hmacError) {
    console.error("[Fulfillment] HMAC computation error - REJECTING:", hmacError);
    return false;
  }
}

// ============================================================================
// 17TRACK REGISTRATION
// ============================================================================

async function registerWith17Track(
  trackingNumber: string,
  orderId: string,
  carrierCode?: string | null
): Promise<{ success: boolean; alreadyRegistered: boolean; error?: string }> {
  const track17ApiKey = getEnvVar("TRACK17_API_KEY");
  if (!track17ApiKey) {
    console.error("[Fulfillment] TRACK17_API_KEY not configured");
    return { success: false, alreadyRegistered: false, error: "Missing API key" };
  }

  try {
    console.log(`[Fulfillment] Registering ${trackingNumber} with 17TRACK (order: ${orderId})`);
    
    const registerPayload: Record<string, unknown> = {
      number: trackingNumber,
      auto_detection: true,
      tag: orderId,
    };
    
    // If Shopify provides a carrier code, include it
    if (carrierCode) {
      registerPayload.carrier = carrierCode;
    }

    const response = await fetch(`${TRACK17_API_URL}/register`, {
      method: 'POST',
      headers: {
        '17token': track17ApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([registerPayload]),
    });

    if (!response.ok) {
      console.error(`[Fulfillment] 17TRACK register API error: ${response.status}`);
      return { success: false, alreadyRegistered: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log(`[Fulfillment] 17TRACK register response:`, JSON.stringify(data).substring(0, 500));

    // Check response structure
    if (data.code !== 0) {
      console.log(`[Fulfillment] 17TRACK API error code: ${data.code}, message: ${data.message}`);
      return { success: false, alreadyRegistered: false, error: data.message || `Code ${data.code}` };
    }

    const accepted = data.data?.accepted || [];
    const rejected = data.data?.rejected || [];

    if (accepted.length > 0) {
      console.log(`[Fulfillment] Successfully registered tracking number with 17TRACK`);
      return { success: true, alreadyRegistered: false };
    }

    if (rejected.length > 0) {
      const rejectReason = rejected[0]?.error?.code;
      // Error code -18010001 means already registered
      if (rejectReason === -18010001) {
        console.log(`[Fulfillment] Tracking number already registered with 17TRACK`);
        return { success: true, alreadyRegistered: true };
      }
      console.log(`[Fulfillment] 17TRACK rejected: ${JSON.stringify(rejected[0])}`);
      return { success: false, alreadyRegistered: false, error: `Rejected: ${rejectReason}` };
    }

    return { success: false, alreadyRegistered: false, error: "Unknown response" };
  } catch (error) {
    console.error(`[Fulfillment] Error registering with 17TRACK:`, error);
    return { success: false, alreadyRegistered: false, error: String(error) };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Fulfillment] Received webhook");

  try {
    // Read body for HMAC verification
    const body = await req.text();
    const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");

    // Verify HMAC
    const isValid = await verifyShopifyHmac(body, hmacHeader);
    if (!isValid) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Parse fulfillment payload
    const fulfillment = JSON.parse(body);
    console.log(`[Fulfillment] Processing fulfillment ID: ${fulfillment.id}, order_id: ${fulfillment.order_id}`);

    // Extract key fields
    const orderId = fulfillment.order_id?.toString();
    const trackingNumber = fulfillment.tracking_number;
    const trackingCompany = fulfillment.tracking_company;
    const trackingUrl = fulfillment.tracking_url;
    const email = fulfillment.email || fulfillment.destination?.email;

    if (!orderId) {
      console.error("[Fulfillment] Missing order_id in payload");
      return createErrorResponse("Missing order_id", 400);
    }

    if (!trackingNumber) {
      console.log(`[Fulfillment] No tracking number in fulfillment for order ${orderId} - skipping`);
      return createSuccessResponse({ 
        message: "No tracking number provided", 
        order_id: orderId 
      });
    }

    console.log(`[Fulfillment] Order: ${orderId}, Tracking: ${trackingNumber}, Carrier: ${trackingCompany}`);

    // Initialize Supabase
    const supabaseUrl = getEnvVar("SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Fulfillment] Missing Supabase credentials");
      return createErrorResponse("Server configuration error", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate (idempotency)
    const { data: existing } = await supabase
      .from('shipment_trackings')
      .select('id')
      .eq('order_id', orderId)
      .eq('tracking_number', trackingNumber)
      .single();

    if (existing) {
      console.log(`[Fulfillment] Shipment tracking already exists for order ${orderId}, tracking ${trackingNumber}`);
      return createSuccessResponse({ 
        message: "Already processed", 
        order_id: orderId,
        tracking_number: trackingNumber 
      });
    }

    // Try to get email from order_tracking if not in fulfillment payload
    let customerEmail = email;
    if (!customerEmail) {
      const { data: orderTracking } = await supabase
        .from('order_tracking')
        .select('email')
        .eq('order_number', orderId)
        .single();
      
      customerEmail = orderTracking?.email;
    }

    if (!customerEmail) {
      console.warn(`[Fulfillment] No email found for order ${orderId} - will insert without email`);
    }

    // Insert into shipment_trackings
    const { error: insertError } = await supabase
      .from('shipment_trackings')
      .insert({
        order_id: orderId,
        email: customerEmail || `order-${orderId}@placeholder.rbn`, // Fallback to prevent NOT NULL violation
        tracking_number: trackingNumber,
        carrier: trackingCompany || null,
        current_status: 'pending',
      });

    if (insertError) {
      // Check if it's a duplicate constraint error (race condition)
      if (insertError.code === '23505') {
        console.log(`[Fulfillment] Duplicate insert (race condition), treating as success`);
      } else {
        console.error(`[Fulfillment] Error inserting shipment_trackings:`, insertError);
        return createErrorResponse("Database error", 500);
      }
    } else {
      console.log(`[Fulfillment] Inserted shipment_trackings for order ${orderId}`);
    }

    // Register with 17TRACK
    const registerResult = await registerWith17Track(trackingNumber, orderId, trackingCompany);
    console.log(`[Fulfillment] 17TRACK registration result:`, registerResult);

    return createSuccessResponse({
      message: "Fulfillment processed",
      order_id: orderId,
      tracking_number: trackingNumber,
      carrier: trackingCompany,
      shipment_tracking_created: !insertError || insertError.code === '23505',
      track17_registered: registerResult.success,
      track17_already_registered: registerResult.alreadyRegistered,
    });

  } catch (error) {
    console.error("[Fulfillment] Unexpected error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
