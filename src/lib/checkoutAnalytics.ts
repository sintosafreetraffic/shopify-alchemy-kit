/**
 * Checkout Analytics Tracking
 * Tracks checkout reliability metrics: success, timeout, retry, errors
 * 
 * IMPORTANT: Uses unified session ID from abTesting.ts to ensure funnel integrity
 * This allows tracking ATC → Checkout → Purchase with the same session_id
 */
import { getSessionId } from "@/lib/abTesting";

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mobile/.test(ua)) return "mobile_other";
  return "desktop";
};

interface TrackCheckoutEventParams {
  event_type: "checkout_initiated" | "checkout_success" | "checkout_timeout" | "checkout_retry" | "checkout_error" | "checkout_popup_blocked";
  duration_ms?: number;
  retry_count?: number;
  error_message?: string;
  cart_item_count?: number;
  cart_total?: number;
}

export async function trackCheckoutEvent(params: TrackCheckoutEventParams): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[checkoutAnalytics] Missing Supabase config");
      return;
    }

    const payload = {
      action: "track",
      session_id: getSessionId(),
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      ...params,
    };

    // Fire and forget - don't block checkout flow
    fetch(`${supabaseUrl}/functions/v1/checkout-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.warn("[checkoutAnalytics] Failed to track:", err);
    });

  } catch (error) {
    console.warn("[checkoutAnalytics] Error:", error);
  }
}

// Convenience functions
export const trackCheckoutInitiated = (cartItemCount: number, cartTotal: number) => 
  trackCheckoutEvent({ 
    event_type: "checkout_initiated", 
    cart_item_count: cartItemCount,
    cart_total: cartTotal,
  });

export const trackCheckoutSuccess = (durationMs: number, retryCount: number) => 
  trackCheckoutEvent({ 
    event_type: "checkout_success", 
    duration_ms: durationMs,
    retry_count: retryCount,
  });

export const trackCheckoutTimeout = (durationMs: number, retryCount: number) => 
  trackCheckoutEvent({ 
    event_type: "checkout_timeout", 
    duration_ms: durationMs,
    retry_count: retryCount,
  });

export const trackCheckoutRetry = (retryCount: number) => 
  trackCheckoutEvent({ 
    event_type: "checkout_retry", 
    retry_count: retryCount,
  });

export const trackCheckoutError = (errorMessage: string, retryCount: number) => 
  trackCheckoutEvent({ 
    event_type: "checkout_error", 
    error_message: errorMessage,
    retry_count: retryCount,
  });

export const trackCheckoutPopupBlocked = () => 
  trackCheckoutEvent({ event_type: "checkout_popup_blocked" });
