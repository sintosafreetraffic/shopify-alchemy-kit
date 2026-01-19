/**
 * Add to Cart Analytics Tracking
 * Stores cart events in Supabase for funnel analysis
 */
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/abTesting";

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
 */
export async function trackAddToCartEvent(params: TrackAddToCartParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const referrer = document.referrer || null;
    const pagePath = window.location.pathname;

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
      });

    if (error) {
      console.warn('Failed to track add-to-cart event:', error.message);
    } else {
      console.log('[AddToCart Analytics] Event tracked:', params.productTitle);
    }
  } catch (err) {
    // Fire and forget - don't block the cart flow
    console.warn('Add-to-cart tracking error:', err);
  }
}
