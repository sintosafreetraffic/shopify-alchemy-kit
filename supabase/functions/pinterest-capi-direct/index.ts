/**
 * Pinterest CAPI Direct Edge Function
 * 
 * Direct Pinterest Conversions API integration - replaces the Render tracking server.
 * Handles purchase event tracking with proper hashing and attribution.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

// SHA-256 hash helper
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Clean and normalize phone number
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\\d+]/g, '');
  // If it starts with +, keep it, otherwise add +
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

interface PurchaseEventData {
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
  pinterest_click_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Pinterest CAPI Direct] Request received");

  try {
    const PINTEREST_CONVERSION_TOKEN = requireEnvVar("PINTEREST_CONVERSION_TOKEN");
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const PINTEREST_TAG_ID = requireEnvVar("PINTEREST_TAG_ID");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const eventData: PurchaseEventData = await req.json();
    
    console.log("[Pinterest CAPI Direct] Processing purchase:", {
      order_id: eventData.order_id,
      value: eventData.value,
      has_epik: !!eventData.pinterest_click_id,
      has_email: !!eventData.email,
      utm_source: eventData.utm_source,
    });

    // Build user data with proper hashing
    const userData: Record<string, any> = {};
    
    if (eventData.email) {
      userData.em = [await sha256Hash(eventData.email)];
    }
    
    if (eventData.phone) {
      const normalizedPhone = normalizePhone(eventData.phone);
      if (normalizedPhone) {
        userData.ph = [await sha256Hash(normalizedPhone)];
      }
    }
    
    // Add click ID if present (this is critical for attribution)
    if (eventData.pinterest_click_id) {
      userData.click_id = eventData.pinterest_click_id;
      console.log("[Pinterest CAPI Direct] Using click_id for attribution:", eventData.pinterest_click_id);
    }

    // Generate unique event ID
    const eventId = `checkout_${eventData.order_id}_${Date.now()}`;

    // Build custom data
    const customData: Record<string, any> = {
      currency: eventData.currency || 'EUR',
      value: String(eventData.value),
      order_id: eventData.order_id,
    };

    // Add product data if available
    if (eventData.products && eventData.products.length > 0) {
      customData.content_ids = eventData.products.map(p => p.id);
      customData.contents = eventData.products.map(p => ({
        id: p.id,
        item_name: p.name,
        quantity: p.quantity,
        item_price: String(p.price),
      }));
      customData.num_items = eventData.products.reduce((sum, p) => sum + p.quantity, 0);
    }

    // Build the conversion event payload
    const conversionPayload = {
      data: [
        {
          event_name: "checkout",
          action_source: "web",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          user_data: userData,
          custom_data: customData,
          ...(eventData.landing_page && { event_source_url: eventData.landing_page }),
        },
      ],
    };

    console.log("[Pinterest CAPI Direct] Sending to Pinterest API:", {
      ad_account_id: PINTEREST_AD_ACCOUNT_ID,
      event_id: eventId,
      has_click_id: !!userData.click_id,
      has_email_hash: !!userData.em,
      value: customData.value,
    });

    // Send to Pinterest Conversions API
    const pinterestResponse = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/events`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PINTEREST_CONVERSION_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(conversionPayload),
      }
    );

    const responseText = await pinterestResponse.text();
    let pinterestResult: any;
    try {
      pinterestResult = JSON.parse(responseText);
    } catch {
      pinterestResult = { raw_response: responseText };
    }

    console.log("[Pinterest CAPI Direct] Pinterest API response:", {
      status: pinterestResponse.status,
      ok: pinterestResponse.ok,
      result: pinterestResult,
    });

    // Log to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const renderStatus = pinterestResponse.ok ? 'success_direct' : 'failed_direct';
    
    await supabase
      .from('pinterest_purchase_events')
      .insert({
        order_id: eventData.order_id,
        value: eventData.value,
        currency: eventData.currency || 'EUR',
        epik: eventData.pinterest_click_id,
        utm_source: eventData.utm_source,
        utm_medium: eventData.utm_medium,
        utm_campaign: eventData.utm_campaign,
        utm_content: eventData.utm_content,
        utm_term: eventData.utm_term,
        landing_page: eventData.landing_page,
        source: 'direct_capi',
        render_status: renderStatus,
        render_response: {
          status: pinterestResponse.status,
          result: pinterestResult,
          event_id: eventId,
        },
      });

    if (pinterestResponse.ok) {
      console.log("[Pinterest CAPI Direct] ✅ Purchase tracked successfully:", eventData.order_id);
      return createSuccessResponse({
        success: true,
        message: "Purchase tracked via direct CAPI",
        event_id: eventId,
        pinterest_response: pinterestResult,
      });
    } else {
      console.error("[Pinterest CAPI Direct] ❌ Pinterest API error:", pinterestResult);
      return createErrorResponse(
        `Pinterest API error: ${JSON.stringify(pinterestResult)}`,
        pinterestResponse.status
      );
    }
  } catch (error: any) {
    console.error("[Pinterest CAPI Direct] Error:", error);
    return createErrorResponse(error.message || "Unknown error", 500);
  }
});
