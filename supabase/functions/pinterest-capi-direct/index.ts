/**
 * Pinterest CAPI Direct Edge Function
 * 
 * Direct Pinterest Conversions API integration - replaces the Render tracking server.
 * Handles purchase event tracking with proper hashing and attribution.
 * 
 * Phase 4.2a: Added attribution classifier and send gating (Strategy A)
 * Phase 5: Uses shared attribution classifier from _shared/attribution.ts
 * 
 * - Only sends to Pinterest when attribution_source === 'pinterest'
 * - Respects kill switch in app_settings
 * - Always records to DB with source-truth fields
 * - Invariant check prevents impossible states
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  classifyAttribution,
  getSendMode,
  determineSendDecision,
  type AttributionResult,
  type SendStatus,
  type SendMode,
} from "../_shared/attribution.ts";

// ============================================================================
// TYPES
// ============================================================================

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
  is_test?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  const cleaned = phone.replace(/[^\d+]/g, '');
  // If it starts with +, keep it, otherwise add +
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Pinterest CAPI Direct] Request received");

  try {
    const PINTEREST_CONVERSION_TOKEN = requireEnvVar("PINTEREST_CONVERSION_TOKEN");
    const PINTEREST_AD_ACCOUNT_ID = requireEnvVar("PINTEREST_AD_ACCOUNT_ID");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const eventData: PurchaseEventData = await req.json();
    
    // ========================================================================
    // PHASE Day 1-2: Generate event_id BEFORE any API call (idempotency)
    // This ensures we can deduplicate even if API call fails/times out
    // ========================================================================
    const eventId = `checkout_${eventData.order_id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    
    // Initialize tracking variables
    let sendStatus: SendStatus = 'pending';
    let sendStatusReason: string | null = null;
    let deliveryState = 'pending'; // Operational state: pending -> sent/failed/blocked_*
    let renderStatus = 'pending';
    let renderResponse: Record<string, unknown> | null = null;

    console.log("[Pinterest CAPI Direct] Processing purchase:", {
      order_id: eventData.order_id,
      event_id: eventId,
      value: eventData.value,
      has_epik: !!eventData.pinterest_click_id,
      has_email: !!eventData.email,
      utm_source: eventData.utm_source,
      is_test: eventData.is_test,
    });

    // ========================================================================
    // PHASE 4.2a: ATTRIBUTION CLASSIFICATION + GATING
    // ========================================================================

    // Step 1: Read send mode from app_settings
    const sendMode = await getSendMode(supabase);
    console.log("[Pinterest CAPI Direct] Send mode:", sendMode);

    // Step 2: Classify attribution
    const attribution = classifyAttribution(eventData);
    console.log("[Pinterest CAPI Direct] Attribution:", {
      source: attribution.attribution_source,
      confidence: attribution.attribution_confidence,
      reason: attribution.attribution_reason,
      has_epik: !!attribution.epik,
    });

    // Step 3: Determine send decision (priority order)
    let shouldSendToPinterest = false;

    // 3a: Test orders are always blocked
    if (eventData.is_test === true) {
      sendStatus = 'blocked_test';
      sendStatusReason = 'is_test';
      deliveryState = 'blocked_test';
      console.log("[Pinterest CAPI Direct] Blocked: test order");
    }
    // 3b: Kill switch disabled
    else if (sendMode === 'disabled') {
      sendStatus = 'blocked_disabled';
      sendStatusReason = 'mode_disabled';
      deliveryState = 'blocked_disabled';
      console.log("[Pinterest CAPI Direct] Blocked: send mode disabled");
    }
    // 3c: Pinterest-only mode - check attribution
    else if (sendMode === 'pinterest_only') {
      if (attribution.attribution_source === 'pinterest') {
        shouldSendToPinterest = true;
        sendStatus = 'pending'; // Will update to 'sent' after successful call
        deliveryState = 'pending'; // Will update after API call
        console.log("[Pinterest CAPI Direct] Allowed: Pinterest attribution confirmed");
      } else {
        sendStatus = 'blocked_attribution';
        sendStatusReason = 'non_pinterest_attribution';
        deliveryState = 'blocked_attribution';
        console.log("[Pinterest CAPI Direct] Blocked: non-Pinterest attribution", {
          source: attribution.attribution_source,
        });
      }
    }
    // 3d: All orders mode - always send
    else if (sendMode === 'all_orders') {
      shouldSendToPinterest = true;
      sendStatus = 'pending';
      deliveryState = 'pending';
      console.log("[Pinterest CAPI Direct] Allowed: all_orders mode");
    }

    // ========================================================================
    // PHASE 5: INVARIANT GUARDRAIL (D)
    // Detect impossible states before sending - sent requires pinterest source
    // ========================================================================
    if (shouldSendToPinterest && attribution.attribution_source !== 'pinterest' && sendMode === 'pinterest_only') {
      // INVARIANT VIOLATION: About to send non-Pinterest order in pinterest_only mode
      console.error("[Pinterest CAPI Direct] INVARIANT VIOLATION: Attempted to send non-Pinterest order", {
        order_id: eventData.order_id,
        attribution_source: attribution.attribution_source,
        send_mode: sendMode,
      });
      
      // Force block
      shouldSendToPinterest = false;
      sendStatus = 'blocked_error';
      sendStatusReason = 'invariant_violation_sent_requires_pinterest_source';
      
      // Create tracking alert (non-blocking)
      try {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('tracking_alerts').insert({
          day: today,
          severity: 'critical',
          type: 'invariant_violation',
          message: `Invariant violation: Attempted to send non-Pinterest order in pinterest_only mode`,
          context: {
            order_id: eventData.order_id,
            attribution_source: attribution.attribution_source,
            send_mode: sendMode,
            blocked_by: 'phase5_invariant_check',
          },
          status: 'open',
        });
        console.log("[Pinterest CAPI Direct] Invariant violation alert created");
      } catch (alertError) {
        console.error("[Pinterest CAPI Direct] Failed to create invariant alert:", alertError);
      }
    }

    // ========================================================================
    // DAY 3: EVENT_ID DEDUPLICATION CHECK
    // Check if this event_id was already sent successfully (prevents duplicate sends)
    // ========================================================================
    
    if (shouldSendToPinterest) {
      // Check for existing successful send with same order_id
      const { data: existingSend } = await supabase
        .from('pinterest_purchase_events')
        .select('event_id, delivery_state')
        .eq('order_id', eventData.order_id)
        .eq('delivery_state', 'sent')
        .limit(1)
        .maybeSingle();
      
      if (existingSend) {
        console.log("[Pinterest CAPI Direct] Duplicate detected - order already sent:", {
          order_id: eventData.order_id,
          existing_event_id: existingSend.event_id,
        });
        
        // Block duplicate send
        shouldSendToPinterest = false;
        sendStatus = 'blocked_duplicate';
        sendStatusReason = 'already_sent';
        deliveryState = 'blocked_duplicate';
        renderStatus = 'blocked_duplicate';
        renderResponse = {
          blocked_reason: 'Event already successfully sent',
          existing_event_id: existingSend.event_id,
        };
      }
    }

    // ========================================================================
    // PINTEREST CAPI CALL (only if shouldSendToPinterest)
    // ========================================================================

    if (shouldSendToPinterest) {
      // Build user data with proper hashing
      const userData: Record<string, unknown> = {};
      
      if (eventData.email) {
        userData.em = [await sha256Hash(eventData.email)];
      }
      
      if (eventData.phone) {
        const normalizedPhone = normalizePhone(eventData.phone);
        if (normalizedPhone) {
          userData.ph = [await sha256Hash(normalizedPhone)];
        }
      }
      
      // Add click ID if present (critical for attribution)
      if (attribution.epik) {
        userData.click_id = attribution.epik;
      }

      // event_id already generated at start of function for idempotency

      // Build custom data
      const customData: Record<string, unknown> = {
        currency: eventData.currency || 'USD',
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
      try {
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
        let pinterestResult: unknown;
        try {
          pinterestResult = JSON.parse(responseText);
        } catch {
          pinterestResult = { raw_response: responseText };
        }

        console.log("[Pinterest CAPI Direct] Pinterest API response:", {
          status: pinterestResponse.status,
          ok: pinterestResponse.ok,
        });

        if (pinterestResponse.ok) {
          sendStatus = 'sent';
          sendStatusReason = null;
          deliveryState = 'sent'; // Operational: API call succeeded
          renderStatus = 'success_direct';
          renderResponse = {
            status: pinterestResponse.status,
            result: pinterestResult,
            event_id: eventId,
          };
        } else {
          sendStatus = 'blocked_error';
          sendStatusReason = 'pinterest_post_failed';
          deliveryState = 'failed'; // Operational: API call failed
          renderStatus = 'failed_direct';
          renderResponse = {
            status: pinterestResponse.status,
            error: pinterestResult,
            event_id: eventId,
          };
          console.error("[Pinterest CAPI Direct] Pinterest API error:", pinterestResult);
        }
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        sendStatus = 'blocked_error';
        sendStatusReason = 'pinterest_fetch_error';
        deliveryState = 'failed'; // Operational: API call failed
        renderStatus = 'error_direct';
        renderResponse = { error: errorMessage };
        console.error("[Pinterest CAPI Direct] Fetch error:", errorMessage);
      }
    } else {
      // Not sending - set appropriate render status
      renderStatus = 'blocked';
      renderResponse = {
        blocked_reason: sendStatusReason,
        attribution_source: attribution.attribution_source,
      };
    }

    // ========================================================================
    // ALWAYS LOG TO DATABASE (even when blocked)
    // ========================================================================

    const insertResult = await supabase
      .from('pinterest_purchase_events')
      .insert({
        order_id: eventData.order_id,
        value: eventData.value,
        currency: eventData.currency || 'EUR',
        epik: attribution.epik || eventData.pinterest_click_id,
        utm_source: eventData.utm_source,
        utm_medium: eventData.utm_medium,
        utm_campaign: eventData.utm_campaign,
        utm_content: eventData.utm_content,
        utm_term: eventData.utm_term,
        landing_page: eventData.landing_page,
        source: 'direct_capi',
        render_status: renderStatus,
        render_response: renderResponse,
        is_test: eventData.is_test || false,
        // Phase 4.2a: New source-truth fields
        attribution_source: attribution.attribution_source,
        attribution_confidence: attribution.attribution_confidence,
        attribution_reason: attribution.attribution_reason,
        send_status: sendStatus,
        send_status_reason: sendStatusReason,
        send_mode: sendMode,
        // Phase Day 1-2: Idempotency and operational state
        event_id: eventId,
        delivery_state: deliveryState,
      });

    if (insertResult.error) {
      console.error("[Pinterest CAPI Direct] DB insert error:", insertResult.error);
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================

    if (sendStatus === 'sent') {
      console.log("[Pinterest CAPI Direct] ✅ Purchase tracked successfully:", eventData.order_id);
      return createSuccessResponse({
        success: true,
        message: "Purchase tracked via direct CAPI",
        event_id: eventId,
        attribution_source: attribution.attribution_source,
        send_status: sendStatus,
      });
    } else if (sendStatus.startsWith('blocked_')) {
      console.log("[Pinterest CAPI Direct] ⚠️ Purchase blocked:", {
        order_id: eventData.order_id,
        send_status: sendStatus,
        reason: sendStatusReason,
      });
      return createSuccessResponse({
        success: true,
        message: `Purchase recorded but blocked from Pinterest: ${sendStatusReason}`,
        send_status: sendStatus,
        send_status_reason: sendStatusReason,
        attribution_source: attribution.attribution_source,
      });
    } else {
      return createErrorResponse("Unexpected send status", 500);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[Pinterest CAPI Direct] Error:", errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
});
