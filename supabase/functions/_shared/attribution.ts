/**
 * Shared Attribution Classifier (Phase 5)
 * 
 * Canonical source of truth for Pinterest attribution classification.
 * All code paths (webhook, recovery, direct CAPI) MUST use this classifier.
 * 
 * RULES (non-negotiable):
 * 1. EPIK present → pinterest, high confidence
 * 2. utm_source indicates pinterest → pinterest, medium confidence
 * 3. Other known sources (google, facebook, etc.) → other, low confidence
 * 4. No signal → organic, low confidence
 * 
 * This function MUST NOT throw. Returns 'unknown' on any error.
 */

export interface AttributionInput {
  pinterest_click_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface AttributionResult {
  attribution_source: 'pinterest' | 'organic' | 'other' | 'unknown';
  attribution_confidence: 'high' | 'medium' | 'low';
  attribution_reason: string;
  should_send_to_pinterest: boolean;
  epik: string | null;
}

export type SendStatus = 
  | 'pending' 
  | 'sent' 
  | 'blocked_attribution' 
  | 'blocked_disabled' 
  | 'blocked_test' 
  | 'blocked_error'
  | 'skipped_blocked_attribution'; // Used by recovery

export type SendMode = 'pinterest_only' | 'all_orders' | 'disabled';

/**
 * Canonical attribution classifier.
 * 
 * Determines if an order is Pinterest-attributed based on available signals.
 * MUST NOT THROW - returns 'unknown' on any error.
 */
export function classifyAttribution(input: AttributionInput): AttributionResult {
  try {
    const epik = input.pinterest_click_id?.trim() || null;
    const utmSource = input.utm_source?.toLowerCase().trim() || '';
    const utmMedium = input.utm_medium?.toLowerCase().trim() || '';

    // Rule 1: EPIK present = Pinterest-attributed (high confidence)
    if (epik && epik.length > 0) {
      return {
        attribution_source: 'pinterest',
        attribution_confidence: 'high',
        attribution_reason: 'epik_present',
        should_send_to_pinterest: true,
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
        attribution_confidence: 'medium',
        attribution_reason: 'utm_pinterest',
        should_send_to_pinterest: true,
        epik: null,
      };
    }

    // Rule 3: Other known sources
    const otherSources = ['google', 'facebook', 'meta', 'tiktok', 'email', 'klaviyo', 'instagram', 'youtube'];
    const isOtherSource = otherSources.some(src => utmSource.includes(src));
    
    if (isOtherSource) {
      return {
        attribution_source: 'other',
        attribution_confidence: 'low',
        attribution_reason: `utm_${utmSource.split(/[^a-z]/)[0] || 'other'}`,
        should_send_to_pinterest: false,
        epik: null,
      };
    }

    // Rule 4: No Pinterest signal = organic
    return {
      attribution_source: 'organic',
      attribution_confidence: 'low',
      attribution_reason: 'no_pinterest_signal',
      should_send_to_pinterest: false,
      epik: null,
    };
  } catch (error) {
    // Never throw - return unknown on any error
    console.warn('[Attribution] Classification error:', error);
    return {
      attribution_source: 'unknown',
      attribution_confidence: 'low',
      attribution_reason: 'classification_error',
      should_send_to_pinterest: false,
      epik: null,
    };
  }
}

/**
 * Read send mode from app_settings.
 * Returns 'pinterest_only' if missing or unreadable (fail-safe default).
 */
// deno-lint-ignore no-explicit-any
export async function getSendMode(supabase: any): Promise<SendMode> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'pinterest_purchase_send_mode')
      .single();

    if (error || !data?.value) {
      console.log('[Attribution] No send_mode setting found, defaulting to pinterest_only');
      return 'pinterest_only';
    }

    const mode = data.value?.mode;
    if (mode && ['pinterest_only', 'all_orders', 'disabled'].includes(mode)) {
      return mode as SendMode;
    }

    console.warn('[Attribution] Invalid send_mode value:', mode);
    return 'pinterest_only';
  } catch (error) {
    console.warn('[Attribution] Error reading send_mode:', error);
    return 'pinterest_only';
  }
}

/**
 * Determine send decision based on attribution + send mode.
 * Returns the appropriate SendStatus.
 */
export function determineSendDecision(
  attribution: AttributionResult,
  sendMode: SendMode,
  isTest: boolean
): { shouldSend: boolean; sendStatus: SendStatus; sendStatusReason: string | null } {
  // Priority 1: Test orders always blocked
  if (isTest) {
    return {
      shouldSend: false,
      sendStatus: 'blocked_test',
      sendStatusReason: 'is_test',
    };
  }

  // Priority 2: Kill switch disabled
  if (sendMode === 'disabled') {
    return {
      shouldSend: false,
      sendStatus: 'blocked_disabled',
      sendStatusReason: 'mode_disabled',
    };
  }

  // Priority 3: Pinterest-only mode - check attribution
  if (sendMode === 'pinterest_only') {
    if (attribution.should_send_to_pinterest) {
      return {
        shouldSend: true,
        sendStatus: 'pending',
        sendStatusReason: null,
      };
    } else {
      return {
        shouldSend: false,
        sendStatus: 'blocked_attribution',
        sendStatusReason: 'non_pinterest_attribution',
      };
    }
  }

  // Priority 4: All orders mode - always send
  if (sendMode === 'all_orders') {
    return {
      shouldSend: true,
      sendStatus: 'pending',
      sendStatusReason: null,
    };
  }

  // Fallback (should never reach)
  return {
    shouldSend: false,
    sendStatus: 'blocked_error',
    sendStatusReason: 'unknown_send_mode',
  };
}
