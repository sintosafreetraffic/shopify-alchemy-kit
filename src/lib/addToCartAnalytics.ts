/**
 * Add to Cart Analytics Tracking
 * Stores cart events in Supabase for funnel analysis
 * 
 * Includes TBLS (The Big Landing Store) attribution for revenue tracking
 */
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/abTesting";
import { getAttribution } from "@/lib/attribution";

// Re-export getSessionId for backwards compatibility
// Now uses the unified session ID from abTesting.ts to ensure consistent tracking
export { getSessionId };

// Detect device type
function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/mobile/.test(ua)) return 'mobile_other';
  return 'desktop';
}

interface TrackAddToCartParams {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle?: string;
  price: number;
  currency: string;
  quantity: number;
}

/**
 * Track add-to-cart event in Supabase
 * Fire and forget - doesn't block UI
 * Includes TBLS attribution for funnel tracking
 */
export async function trackAddToCartEvent(params: TrackAddToCartParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const referrer = document.referrer || null;
    const pagePath = window.location.pathname;
    
    // Get TBLS attribution
    const attribution = getAttribution();

    const { error } = await supabase
      .from('add_to_cart_analytics')
      .insert({
        session_id: sessionId,
        product_id: params.productId,
        product_title: params.productTitle,
        variant_id: params.variantId,
        variant_title: params.variantTitle || null,
        price: params.price,
        currency: params.currency,
        quantity: params.quantity,
        device_type: deviceType,
        referrer: referrer,
        page_path: pagePath,
        // TBLS attribution
        tbls_page_id: attribution.tbls_page_id,
        tbls_pin_id: attribution.tbls_pin_id,
        tbls_template: attribution.tbls_template,
      });

    if (error) {
      console.warn('Failed to track add-to-cart event:', error.message);
    } else {
      console.log('[AddToCart Analytics] Event tracked:', params.productTitle, attribution.tbls_page_id ? `(TBLS: ${attribution.tbls_page_id})` : '');
    }
  } catch (err) {
    // Fire and forget - don't block the cart flow
    console.warn('Add-to-cart tracking error:', err);
  }
}
