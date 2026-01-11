import { createStorefrontCheckout } from "./shopify";
import type { CartItem, FreeMaskSelection } from "@/stores/cartStore";
import { 
  trackCheckoutInitiated, 
  trackCheckoutSuccess, 
  trackCheckoutTimeout, 
  trackCheckoutRetry, 
  trackCheckoutError,
  trackCheckoutPopupBlocked 
} from "./checkoutAnalytics";

const CHECKOUT_TIMEOUT_MS = 15000; // 15 seconds (reduced from 20)
const MAX_RETRIES = 1;

interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
  durationMs?: number;
  retryCount?: number;
}

/**
 * Creates a checkout with timeout and retry logic
 */
export async function createCheckoutWithResilience(
  items: CartItem[],
  freeMaskVariants: FreeMaskSelection[],
  discountCodes: string[]
): Promise<CheckoutResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  let retryCount = 0;
  
  // Track checkout initiated
  const cartTotal = items.reduce((sum, item) => sum + parseFloat(item.price.amount) * item.quantity, 0);
  trackCheckoutInitiated(items.length, cartTotal);
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const checkoutUrl = await createCheckoutWithTimeout(
        items,
        freeMaskVariants,
        discountCodes
      );
      
      if (checkoutUrl) {
        const durationMs = Date.now() - startTime;
        trackCheckoutSuccess(durationMs, retryCount);
        return { success: true, checkoutUrl, durationMs, retryCount };
      }
      
      // Null response - retry if we have attempts left
      lastError = new Error("No checkout URL returned");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.error(`Checkout attempt ${attempt + 1} failed:`, error);
      
      // Track timeout specifically
      if (lastError.message.includes("timed out")) {
        const durationMs = Date.now() - startTime;
        trackCheckoutTimeout(durationMs, retryCount);
      }
    }
    
    // Track retry if we're going to retry
    if (attempt < MAX_RETRIES) {
      retryCount++;
      trackCheckoutRetry(retryCount);
      // Minimal delay before retry
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Track final error
  const durationMs = Date.now() - startTime;
  trackCheckoutError(lastError?.message || "Unknown error", retryCount);
  
  return {
    success: false,
    error: lastError?.message || "Checkout failed after retries",
    durationMs,
    retryCount,
  };
}

/**
 * Creates checkout with timeout wrapper
 */
async function createCheckoutWithTimeout(
  items: CartItem[],
  freeMaskVariants: FreeMaskSelection[],
  discountCodes: string[]
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);
  
  try {
    // Create a promise that rejects on abort
    const checkoutPromise = createStorefrontCheckout(
      items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      freeMaskVariants,
      discountCodes
    );
    
    // Race between checkout and timeout
    const result = await Promise.race([
      checkoutPromise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Checkout timed out after 20 seconds'));
        });
      }),
    ]);
    
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Detects if running inside an iframe (preview/embedded context)
 */
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // If we can't access top, we're likely in an iframe
  }
}

/**
 * Safely opens checkout URL with popup fallback
 */
export function openCheckoutUrl(checkoutUrl: string, isMobile: boolean): void {
  // Always use same-tab redirect for mobile, or when inside iframe (preview context)
  if (isMobile || isInIframe()) {
    window.location.href = checkoutUrl;
    return;
  }
  
  // Desktop (not in iframe): try popup first, fallback to same tab
  const popup = window.open(checkoutUrl, '_blank');
  
  // If popup was blocked, fallback to same-tab redirect
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    console.log('Popup blocked, falling back to same-tab redirect');
    trackCheckoutPopupBlocked();
    window.location.href = checkoutUrl;
  }
}

/**
 * Detects if current device is mobile
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
