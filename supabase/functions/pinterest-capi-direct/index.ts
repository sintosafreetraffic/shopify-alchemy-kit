/**
 * Pinterest CAPI Direct Edge Function
 * 
 * Direct Pinterest Conversions API integration - replaces the Render tracking server.
 * Handles purchase event tracking with proper hashing and attribution.
 * 
 * Phase 4.2a: Added attribution classifier and send gating (Strategy A)
 * - Only sends to Pinterest when attribution_source === 'pinterest'
 * - Respects kill switch in app_settings
 * - Always records to DB with source-truth fields
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

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

interface AttributionResult {
  attribution_source: 'pinterest' | 'organic' | 'other' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  epik: string | null;
}

type SendStatus = 'pending' | 'sent' | 'blocked_attribution' | 'blocked_disabled' | 'blocked_test' | 'blocked_error';
type SendMode = 'pinterest_only' | 'all_orders' | 'disabled';

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

/**
 * Attribution Classifier (Strategy A)
 * 
 * Determines if an order is Pinterest-attributed based on available signals.
 * MUST NOT THROW - returns 'unknown' on any error.
 * 
 * Rules:
 * 1. If epik exists and non-empty → pinterest, high confidence
 * 2. If utm_source indicates pinterest → pinterest, medium confidence
 * 3. If utm_source is another known source → other, low confidence
 * 4. Otherwise → organic, low confidence
 */
function classifyAttribution(input: PurchaseEventData): AttributionResult {
  try {
    const epik = input.pinterest_click_id?.trim() || null;
    const utmSource = input.utm_source?.toLowerCase().trim() || '';
    const utmMedium = input.utm_medium?.toLowerCase().trim() || '';

    // Rule 1: EPIK present = Pinterest-attributed (high confidence)
    if (epik && epik.length > 0) {
      return {
        attribution_source: 'pinterest',
        confidence: 'high',
        reason: 'epik_present',
        epik,
      };
    }

    // Rule 2: UTM indicates Pinterest (medium confidence)
    const isPinterestUtm = 
      utmSource === 'pinterest' || 
      utmSource.includes('pinterest') ||
      (utmMedium === 'paid_social' && utmSource.includes('pin'));
    
    if (isPinterestUtm) {
      return {
        attribution_source: 'pinterest',
        confidence: 'medium',
        reason: 'utm_pinterest',
        epik: null,
      };
    }

    // Rule 3: Other known sources
    const otherSources = ['google', 'facebook', 'meta', 'tiktok', 'email', 'klaviyo', 'instagram', 'youtube'];
    const isOtherSource = otherSources.some(src => utmSource.includes(src));
    
    if (isOtherSource) {
      return {
        attribution_source: 'other',
        confidence: 'low',
        reason: `utm_${utmSource.split(/[^a-z]/)[0] || 'other'}`,
        epik: null,
      };
    }

    // Rule 4: No Pinterest signal = organic
    return {
      attribution_source: 'organic',
      confidence: 'low',
      reason: 'no_pinterest_signal',
      epik: null,
    };
  } catch (error) {
    // Never throw - return unknown on any error
    console.warn('[Pinterest CAPI Direct] Attribution classification error:', error);
    return {
      attribution_source: 'unknown',
      confidence: 'low',
      reason: 'classification_error',
      epik: null,
    };
  }
}

/**
 * Read send mode from app_settings
 * Returns 'pinterest_only' if missing or unreadable
 */
// deno-lint-ignore no-explicit-any
async function getSendMode(supabase: any): Promise<SendMode> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'pinterest_purchase_send_mode')
      .single();

    if (error || !data?.value) {
      console.log('[Pinterest CAPI Direct] No send_mode setting found, defaulting to pinterest_only');
      return 'pinterest_only';
    }

    const mode = data.value?.mode;
    if (mode && ['pinterest_only', 'all_orders', 'disabled'].includes(mode)) {
      return mode as SendMode;
    }

    console.warn('[Pinterest CAPI Direct] Invalid send_mode value:', mode);
    return 'pinterest_only';
  } catch (error) {
    console.warn('[Pinterest CAPI Direct] Error reading send_mode:', error);
    return 'pinterest_only';
  }
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
    
    // Initialize tracking variables
    let sendStatus: SendStatus = 'pending';
    let sendStatusReason: string | null = null;
    let eventId: string | null = null;
    let renderStatus = 'pending';
    let renderResponse: Record<string, unknown> | null = null;

    console.log("[Pinterest CAPI Direct] Processing purchase:", {
      order_id: eventData.order_id,
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
      confidence: attribution.confidence,
      reason: attribution.reason,
      has_epik: !!attribution.epik,
    });

    // Step 3: Determine send decision (priority order)
    let shouldSendToPinterest = false;

    // 3a: Test orders are always blocked
    if (eventData.is_test === true) {
      sendStatus = 'blocked_test';
      sendStatusReason = 'is_test';
      console.log("[Pinterest CAPI Direct] Blocked: test order");
    }
    // 3b: Kill switch disabled
    else if (sendMode === 'disabled') {
      sendStatus = 'blocked_disabled';
      sendStatusReason = 'mode_disabled';
      console.log("[Pinterest CAPI Direct] Blocked: send mode disabled");
    }
    // 3c: Pinterest-only mode - check attribution
    else if (sendMode === 'pinterest_only') {
      if (attribution.attribution_source === 'pinterest') {
        shouldSendToPinterest = true;
        sendStatus = 'pending'; // Will update to 'sent' after successful call
        console.log("[Pinterest CAPI Direct] Allowed: Pinterest attribution confirmed");
      } else {
        sendStatus = 'blocked_attribution';
        sendStatusReason = 'non_pinterest_attribution';
        console.log("[Pinterest CAPI Direct] Blocked: non-Pinterest attribution", {
          source: attribution.attribution_source,
        });
      }
    }
    // 3d: All orders mode - always send
    else if (sendMode === 'all_orders') {
      shouldSendToPinterest = true;
      sendStatus = 'pending';
      console.log("[Pinterest CAPI Direct] Allowed: all_orders mode");
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

      // Generate unique event ID
      eventId = `checkout_${eventData.order_id}_${Date.now()}`;

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
          renderStatus = 'success_direct';
          renderResponse = {
            status: pinterestResponse.status,
            result: pinterestResult,
            event_id: eventId,
          };
        } else {
          sendStatus = 'blocked_error';
          sendStatusReason = 'pinterest_post_failed';
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
        attribution_confidence: attribution.confidence,
        attribution_reason: attribution.reason,
        send_status: sendStatus,
        send_status_reason: sendStatusReason,
        send_mode: sendMode,
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
