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
  rbn_ref_code: string | null; // Affiliate referral code
  // A/B testing attribution
  rbn_ab_variant: string | null;
  rbn_ab_session_id: string | null;
  // Match signals from context table (populated via joinPinterestContext)
  client_ip_address: string | null;
  client_user_agent: string | null;
  // Meta (Facebook) cookies for CAPI
  meta_fbc: string | null;  // Click ID from _fbc cookie
  meta_fbp: string | null;  // Browser ID from _fbp cookie
  // Google Click ID for Enhanced Conversions
  google_gclid: string | null;
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
    rbn_ref_code: findAttr('rbn_ref_code', 'ref_code', 'affiliate_code'), // Affiliate referral code
    // A/B testing attribution
    rbn_ab_variant: findAttr('rbn_ab_variant'),
    rbn_ab_session_id: findAttr('rbn_ab_session_id'),
    // These will be populated by joinPinterestContext
    client_ip_address: null,
    client_user_agent: null,
    // Meta (Facebook) cookies - captured from cart attributes
    meta_fbc: findAttr('_fbc', 'fbc'),
    meta_fbp: findAttr('_fbp', 'fbp'),
    // Google Click ID for Enhanced Conversions
    google_gclid: findAttr('_gclid', 'gclid'),
  };
}

/**
 * SHA-256 hash for email (same logic as track-context)
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Join attribution with pinterest_context table to get IP/UA for match signals
// Also enriches context with email hash from checkout (50%+ coverage boost)
async function joinPinterestContext(
  supabase: any,
  attribution: AttributionData,
  orderEmail?: string
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
      has_email_hash: !!context.email_hash,
    });
    
    // ENRICHMENT: If context doesn't have email_hash but order has email, enrich it
    // This captures checkout emails for pinterest_context, boosting Email Hash coverage
    if (!context.email_hash && orderEmail) {
      try {
        const emailHash = await sha256Hash(orderEmail);
        const { error: updateError } = await supabase
          .from('pinterest_context')
          .update({ 
            email_hash: emailHash,
            updated_at: new Date().toISOString(),
          })
          .eq('context_id', contextId);
        
        if (updateError) {
          console.warn('[Pinterest] Email hash enrichment failed:', updateError.message);
        } else {
          console.log('[Pinterest] ✅ Email hash enriched for context:', contextId);
        }
      } catch (hashError: any) {
        console.warn('[Pinterest] Email hashing error (non-blocking):', hashError.message);
      }
    }
    
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

// ============================================================================
// AFFILIATE COMMISSION TRACKING FUNCTIONS (P0 CRITICAL)
// These functions connect Shopify orders to affiliate commissions
// ============================================================================

interface CommissionTierInfo {
  tier: string;
  commissionRate: number;
}

function getTierCommissionRate(tier: string): CommissionTierInfo {
  const rates: Record<string, number> = {
    diamond: 0.25,
    platinum: 0.20,
    gold: 0.15,
    silver: 0.12,
    bronze: 0.10,
  };
  return {
    tier,
    commissionRate: rates[tier?.toLowerCase()] || 0.10,
  };
}

/**
 * Lookup affiliate by discount code
 * Used when no rbn_ref_code is present but a discount code matches an affiliate
 */
async function lookupAffiliateByDiscountCode(
  supabase: any,
  discountCode: string
): Promise<{ id: string; referral_code: string; tier: string } | null> {
  try {
    const { data, error } = await supabase
      .from('affiliate_discount_codes')
      .select('affiliate_id, affiliates!inner(id, referral_code, tier)')
      .eq('code', discountCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    // Update usage count
    await supabase
      .from('affiliate_discount_codes')
      .update({ usage_count: (data.usage_count || 0) + 1 })
      .eq('code', discountCode.toUpperCase());
    
    return {
      id: data.affiliates.id,
      referral_code: data.affiliates.referral_code,
      tier: data.affiliates.tier || 'bronze',
    };
  } catch (e) {
    console.error("[Affiliate] Error looking up discount code:", e);
    return null;
  }
}

/**
 * Process affiliate commission for an order
 * This is the critical function that creates commission records
 */
async function processAffiliateCommission(
  supabase: any,
  referralCode: string,
  order: any,
  customerEmail: string,
  klaviyoApiKey: string,
  discountCode?: string
): Promise<void> {
  const orderId = String(order.id);
  const orderTotal = parseFloat(order.total_price);
  const customerIp = order.client_details?.browser_ip || null;
  
  console.log("[Affiliate] Processing commission for order:", orderId, "ref_code:", referralCode);
  
  try {
    // 1. Look up affiliate by referral code
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, tier, total_commissions, first_sale_at')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .maybeSingle();
    
    if (affError || !affiliate) {
      console.log("[Affiliate] No active affiliate found for code:", referralCode);
      return;
    }
    
    // 2. Get affiliate's email for fraud check
    const { data: userData } = await supabase.auth.admin.getUserById(affiliate.user_id);
    const affiliateEmail = userData?.user?.email?.toLowerCase();
    
    // 3. FRAUD DETECTION
    let fraudFlag = false;
    let fraudReason: string | null = null;
    
    // Check self-referral (affiliate buying with own code)
    if (affiliateEmail && customerEmail.toLowerCase() === affiliateEmail) {
      fraudFlag = true;
      fraudReason = 'self_referral_email';
      console.warn("[Affiliate] FRAUD: Self-referral detected for:", customerEmail);
    }
    
    // Check for repeat purchase within 6 hours
    if (!fraudFlag) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: recentCommissions } = await supabase
        .from('commissions')
        .select('id')
        .eq('affiliate_id', affiliate.id)
        .eq('customer_email', customerEmail.toLowerCase())
        .gte('created_at', sixHoursAgo)
        .limit(1);
      
      if (recentCommissions && recentCommissions.length > 0) {
        fraudFlag = true;
        fraudReason = 'repeated_purchase_same_email_6h';
        console.warn("[Affiliate] FRAUD: Repeated purchase within 6h:", customerEmail);
      }
    }
    
    // 4. Calculate commission amount based on tier
    const tierInfo = getTierCommissionRate(affiliate.tier || 'bronze');
    const commissionAmount = orderTotal * tierInfo.commissionRate;
    
    console.log("[Affiliate] Commission calculation:", {
      orderId,
      orderTotal,
      tier: tierInfo.tier,
      rate: tierInfo.commissionRate,
      commission: commissionAmount,
      fraudFlag,
    });
    
    // 5. Check for duplicate commission (idempotency)
    const { data: existingCommission } = await supabase
      .from('commissions')
      .select('id')
      .eq('order_id', orderId)
      .eq('affiliate_id', affiliate.id)
      .maybeSingle();
    
    if (existingCommission) {
      console.log("[Affiliate] Duplicate commission detected, skipping:", orderId);
      return;
    }
    
    // 6. Insert commission record
    const { error: insertError } = await supabase
      .from('commissions')
      .insert({
        affiliate_id: affiliate.id,
        order_id: orderId,
        order_amount: orderTotal,
        amount: commissionAmount,
        level: 1, // Direct sale
        status: fraudFlag ? 'flagged' : 'pending',
        fraud_flag: fraudFlag,
        fraud_reason: fraudReason,
        customer_email: customerEmail.toLowerCase(),
        customer_ip: customerIp,
        discount_code: discountCode || null,
      });
    
    if (insertError) {
      console.error("[Affiliate] Failed to insert commission:", insertError);
      return;
    }
    
    console.log("[Affiliate] ✅ Commission created:", {
      affiliateId: affiliate.id,
      orderId,
      amount: commissionAmount,
      status: fraudFlag ? 'flagged' : 'pending',
    });
    
    // 7. Update affiliate totals if not fraud
    if (!fraudFlag) {
      const newTotalCommissions = (Number(affiliate.total_commissions) || 0) + commissionAmount;
      const updateData: Record<string, any> = {
        total_commissions: newTotalCommissions,
        monthly_sales_count: (affiliate.monthly_sales_count || 0) + 1,
        monthly_revenue_generated: (Number(affiliate.monthly_revenue_generated) || 0) + orderTotal,
        total_referrals: (affiliate.total_referrals || 0) + 1,
      };
      
      // Track first sale (for onboarding metrics)
      if (!affiliate.first_sale_at) {
        updateData.first_sale_at = new Date().toISOString();
        
        // Send Klaviyo event for first sale
        if (klaviyoApiKey && affiliateEmail) {
          try {
            await fetch("https://a.klaviyo.com/api/events/", {
              method: "POST",
              headers: {
                "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
                "Content-Type": "application/json",
                "revision": "2024-02-15",
              },
              body: JSON.stringify({
                data: {
                  type: "event",
                  attributes: {
                    profile: { $email: affiliateEmail },
                    metric: { name: "RBN_Affiliate_First_Sale" },
                    properties: {
                      affiliate_code: affiliate.referral_code,
                      tier: tierInfo.tier,
                      commission_amount: commissionAmount,
                      order_total: orderTotal,
                    },
                  },
                },
              }),
            });
            console.log("[Affiliate] Sent RBN_Affiliate_First_Sale event");
          } catch {
            // Non-blocking
          }
        }
      }
      
      await supabase
        .from('affiliates')
        .update(updateData)
        .eq('id', affiliate.id);
      
      // 8. Send real-time sale notification to Klaviyo
      if (klaviyoApiKey && affiliateEmail) {
        try {
          await fetch("https://a.klaviyo.com/api/events/", {
            method: "POST",
            headers: {
              "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
              "Content-Type": "application/json",
              "revision": "2024-02-15",
            },
            body: JSON.stringify({
              data: {
                type: "event",
                attributes: {
                  profile: { $email: affiliateEmail },
                  metric: { name: "RBN_Affiliate_Sale" },
                  properties: {
                    affiliate_code: affiliate.referral_code,
                    tier: tierInfo.tier,
                    commission_amount: commissionAmount,
                    order_total: orderTotal,
                    order_id: orderId,
                    total_earnings: newTotalCommissions,
                  },
                },
              },
            }),
          });
          console.log("[Affiliate] Sent RBN_Affiliate_Sale event");
        } catch {
          // Non-blocking
        }
      }
    }
    
    // 9. Process Level 2 commission (sub-affiliate)
    // Check if this affiliate has a parent
    const { data: parentCheck } = await supabase
      .from('affiliates')
      .select('parent_affiliate_id')
      .eq('id', affiliate.id)
      .maybeSingle();
    
    if (parentCheck?.parent_affiliate_id && !fraudFlag) {
      // Get parent affiliate
      const { data: parentAffiliate } = await supabase
        .from('affiliates')
        .select('id, user_id, referral_code, tier, total_commissions')
        .eq('id', parentCheck.parent_affiliate_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (parentAffiliate) {
        // Level 2 commission is 5% of order total (fixed)
        const level2Commission = orderTotal * 0.05;
        
        await supabase
          .from('commissions')
          .insert({
            affiliate_id: parentAffiliate.id,
            order_id: orderId,
            order_amount: orderTotal,
            amount: level2Commission,
            level: 2, // Sub-affiliate sale
            status: 'pending',
            fraud_flag: false,
            customer_email: customerEmail.toLowerCase(),
            customer_ip: customerIp,
          });
        
        console.log("[Affiliate] ✅ Level 2 commission created for parent:", parentAffiliate.referral_code);
        
        // Update parent totals
        await supabase
          .from('affiliates')
          .update({
            total_commissions: (Number(parentAffiliate.total_commissions) || 0) + level2Commission,
          })
          .eq('id', parentAffiliate.id);
      }
    }
  } catch (e) {
    console.error("[Affiliate] Error processing commission:", e);
    // Non-blocking - don't fail the webhook
  }
}

// ============================================================================
// END AFFILIATE COMMISSION TRACKING FUNCTIONS
// ============================================================================

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
    // Also enriches context with checkout email for CAPI coverage boost
    attribution = await joinPinterestContext(supabase, attribution, email);
    
    console.log("[Shopify] Attribution data:", {
      has_epik: !!attribution.pinterest_click_id,
      has_utm_source: !!attribution.utm_source,
      has_landing_page: !!attribution.landing_page,
      has_context_id: !!attribution.rbn_context_id,
      has_ref_code: !!attribution.rbn_ref_code,
      has_ab_variant: !!attribution.rbn_ab_variant,
      ab_variant: attribution.rbn_ab_variant,
      has_ab_session: !!attribution.rbn_ab_session_id,
      has_ip: !!attribution.client_ip_address,
      has_ua: !!attribution.client_user_agent,
    });

    // ============================================================
    // AFFILIATE COMMISSION TRACKING - P0 CRITICAL
    // Process affiliate referral code and create commission records
    // ============================================================
    if (attribution.rbn_ref_code && shouldTrackPurchase) {
      await processAffiliateCommission(
        supabase,
        attribution.rbn_ref_code,
        order,
        email,
        KLAVIYO_PRIVATE_API_KEY
      );
    } else if (shouldTrackPurchase) {
      // Also check for discount codes that might be affiliate codes
      const discountCodes = order.discount_codes || [];
      for (const discount of discountCodes) {
        if (discount.code) {
          const affiliateFromDiscount = await lookupAffiliateByDiscountCode(supabase, discount.code);
          if (affiliateFromDiscount) {
            console.log("[Affiliate] Found affiliate via discount code:", discount.code);
            await processAffiliateCommission(
              supabase,
              affiliateFromDiscount.referral_code,
              order,
              email,
              KLAVIYO_PRIVATE_API_KEY,
              discount.code
            );
            break; // Only attribute to first matching affiliate code
          }
        }
      }
    }

    // ============================================================
    // A/B TEST CONVERSION TRACKING
    // Track purchase event to ab_events table for funnel analysis
    // ============================================================
    if (shouldTrackPurchase && attribution.rbn_ab_variant) {
      try {
        const abSessionId = attribution.rbn_ab_session_id || `purchase_${order.id}`;
        const orderValue = parseFloat(order.total_price);
        
        const { error: abEventError } = await supabase
          .from('ab_events')
          .insert({
            event_name: 'purchase',
            session_id: abSessionId,
            ab_variant: attribution.rbn_ab_variant,
            revenue: orderValue,
            payload: {
              order_id: String(order.id),
              order_number: order.order_number,
              currency: order.currency || 'USD',
              email: email,
              items: (order.line_items || []).map((item: any) => ({
                product_id: item.product_id,
                title: item.title,
                quantity: item.quantity,
                price: parseFloat(item.price),
              })),
              timestamp: new Date().toISOString(),
              source: 'shopify_webhook',
            },
          });
        
        if (abEventError) {
          console.error('[A/B] Failed to track purchase event:', abEventError.message);
        } else {
          console.log('[A/B] ✅ Purchase event tracked:', {
            variant: attribution.rbn_ab_variant,
            session_id: abSessionId,
            revenue: orderValue,
            order_id: order.id,
          });
        }
      } catch (abError: any) {
        console.error('[A/B] Purchase tracking error:', abError.message);
        // Non-blocking - continue with other processing
      }
    } else if (shouldTrackPurchase && !attribution.rbn_ab_variant) {
      console.log('[A/B] No variant in order attributes, skipping A/B purchase tracking');
    }

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
      // Extract customer info for enhanced matching (Pinterest CAPI user_data)
      const billingAddress = order.billing_address || {};
      const shippingAddress = order.shipping_address || {};
      const customer = order.customer || {};
      
      // Prefer billing address, fall back to shipping
      const firstName = billingAddress.first_name || shippingAddress.first_name || customer.first_name;
      const lastName = billingAddress.last_name || shippingAddress.last_name || customer.last_name;
      const city = billingAddress.city || shippingAddress.city;
      const state = billingAddress.province_code || shippingAddress.province_code; // Shopify uses province_code
      const zip = billingAddress.zip || shippingAddress.zip;
      const country = billingAddress.country_code || shippingAddress.country_code;
      
      const pinterestPayload: Record<string, any> = {
        order_id: orderId,
        event_type: 'purchase',
        value: orderValue,
        currency: orderCurrency,
        products,
        email: order.email,
        phone: order.customer?.phone || order.billing_address?.phone,
        // Enhanced matching fields (name + address)
        first_name: firstName,
        last_name: lastName,
        city: city,
        state: state,
        zip: zip,
        country: country,
        pinterest_click_id: attribution.pinterest_click_id,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        landing_page: attribution.landing_page,
        referrer: attribution.referrer,
        is_test: isChaosTest, // Pass test flag to CAPI
        context_id: attribution.rbn_context_id, // Pass context_id for external_id
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

    // META CONVERSIONS API TRACKING - Server-side purchase event
    // Runs in parallel with Pinterest, non-blocking
    if (shouldTrackPurchase) {
      try {
        const billingAddr = order.billing_address || {};
        const shippingAddr = order.shipping_address || {};
        const metaPayload = {
          order_id: orderId,
          value: orderValue,
          currency: orderCurrency,
          email: order.email,
          phone: order.customer?.phone || billingAddr.phone,
          first_name: billingAddr.first_name || shippingAddr.first_name,
          last_name: billingAddr.last_name || shippingAddr.last_name,
          city: billingAddr.city || shippingAddr.city,
          state: billingAddr.province_code || shippingAddr.province_code,
          zip: billingAddr.zip || shippingAddr.zip,
          country: billingAddr.country_code || shippingAddr.country_code,
          fbc: attribution.meta_fbc,
          fbp: attribution.meta_fbp,
          landing_page: attribution.landing_page,
          client_ip_address: attribution.client_ip_address,
          client_user_agent: attribution.client_user_agent,
          products: (order.line_items || []).map((item: any) => ({
            id: String(item.product_id),
            name: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
          is_test: isChaosTest,
        };

        // Fire-and-forget - don't block on Meta response
        fetch(`${SUPABASE_URL}/functions/v1/meta-capi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(metaPayload),
        }).then(async (res) => {
          const result = await res.json();
          console.log("[Meta CAPI] Response:", { ok: res.ok, events_received: result.events_received });
        }).catch((err) => {
          console.error("[Meta CAPI] Error (non-blocking):", err.message);
        });
      } catch (metaError: any) {
        console.error("[Meta CAPI] Setup error (non-blocking):", metaError.message);
      }
    }

    // GOOGLE ENHANCED CONVERSIONS - Server-side purchase event
    // Runs in parallel with Meta, non-blocking
    if (shouldTrackPurchase) {
      try {
        const billingAddr = order.billing_address || {};
        const shippingAddr = order.shipping_address || {};
        const googlePayload = {
          order_id: orderId,
          value: orderValue,
          currency: orderCurrency,
          email: order.email,
          phone: order.customer?.phone || billingAddr.phone,
          first_name: billingAddr.first_name || shippingAddr.first_name,
          last_name: billingAddr.last_name || shippingAddr.last_name,
          street_address: billingAddr.address1 || shippingAddr.address1,
          city: billingAddr.city || shippingAddr.city,
          region: billingAddr.province_code || shippingAddr.province_code,
          postal_code: billingAddr.zip || shippingAddr.zip,
          country: billingAddr.country_code || shippingAddr.country_code,
          gclid: attribution.google_gclid,
          is_test: isChaosTest,
        };

        // Fire-and-forget - don't block on Google response
        fetch(`${SUPABASE_URL}/functions/v1/google-enhanced-conversions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(googlePayload),
        }).then(async (res) => {
          const result = await res.json();
          console.log("[Google EC] Response:", { ok: res.ok, send_status: result.send_status });
        }).catch((err) => {
          console.error("[Google EC] Error (non-blocking):", err.message);
        });
      } catch (googleError: any) {
        console.error("[Google EC] Setup error (non-blocking):", googleError.message);
      }
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
