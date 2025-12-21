/**
 * Pinterest Server-Side Tracking Helper
 * 
 * Tracks purchase events via edge function to Pinterest Conversions API
 * 
 * Usage:
 *   import { trackPurchase } from '@/lib/pinterest-tracking';
 *   await trackPurchase(orderData);
 */

import { supabase } from "@/integrations/supabase/client";

interface OrderData {
  order_id: string;
  value: number;
  currency?: string;
  products?: Array<{
    id: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  email?: string;
  phone?: string;
  pinterest_click_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
}

/**
 * Track a purchase event to Pinterest via the edge function
 * 
 * @param orderData - Order information to track
 * @returns Promise with tracking result
 */
export async function trackPurchase(orderData: OrderData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  tracking_result?: any;
}> {
  try {
    // Get URL parameters for attribution (if in browser)
    const urlParams = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search)
      : null;

    // Build complete payload
    const payload: OrderData = {
      order_id: orderData.order_id,
      value: parseFloat(orderData.value.toString()),
      currency: orderData.currency || 'EUR',
      products: orderData.products || [],
      email: orderData.email,
      phone: orderData.phone,
      // Get Pinterest click ID from URL if not provided
      pinterest_click_id: orderData.pinterest_click_id || 
        (urlParams?.get('_ep') || undefined),
      // Get UTM parameters from URL if not provided
      utm_source: orderData.utm_source || 
        (urlParams?.get('utm_source') || undefined),
      utm_medium: orderData.utm_medium || 
        (urlParams?.get('utm_medium') || undefined),
      utm_campaign: orderData.utm_campaign || 
        (urlParams?.get('utm_campaign') || undefined),
      utm_content: orderData.utm_content || 
        (urlParams?.get('utm_content') || undefined),
      utm_term: orderData.utm_term || 
        (urlParams?.get('utm_term') || undefined),
      // Get referrer and landing page if in browser
      referrer: orderData.referrer || 
        (typeof window !== 'undefined' ? document.referrer : undefined),
      landing_page: orderData.landing_page || 
        (typeof window !== 'undefined' ? window.location.href : undefined),
    };

    console.log('[Pinterest Tracking] Sending purchase event:', {
      order_id: payload.order_id,
      value: payload.value,
      currency: payload.currency,
    });

    // Call edge function
    const { data, error } = await supabase.functions.invoke('pinterest-track', {
      body: payload,
    });

    if (error) {
      console.error('[Pinterest Tracking] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to track purchase',
      };
    }

    if (data?.success) {
      console.log('[Pinterest Tracking] ✅ Success:', data.message);
      return {
        success: true,
        message: data.message,
        tracking_result: data.tracking_result,
      };
    } else {
      console.error('[Pinterest Tracking] ❌ Failed:', data);
      return {
        success: false,
        error: data?.error || 'Tracking failed',
        tracking_result: data,
      };
    }
  } catch (error) {
    console.error('[Pinterest Tracking] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track purchase from order object (convenience wrapper)
 * 
 * @param order - Order object from your checkout system
 * @returns Promise with tracking result
 */
export async function trackPurchaseFromOrder(order: {
  id: string;
  total: number | string;
  currency?: string;
  items?: Array<{
    product_id?: string;
    id?: string;
    name?: string;
    quantity?: number;
    price?: number | string;
  }>;
  customer_email?: string;
  customer_phone?: string;
  email?: string;
  phone?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return trackPurchase({
    order_id: order.id,
    value: parseFloat(order.total.toString()),
    currency: order.currency || 'EUR',
    products: (order.items || []).map(item => ({
      id: item.product_id || item.id || 'unknown',
      name: item.name || 'Product',
      quantity: item.quantity || 1,
      price: parseFloat((item.price || 0).toString()),
    })),
    email: order.customer_email || order.email,
    phone: order.customer_phone || order.phone,
  });
}
