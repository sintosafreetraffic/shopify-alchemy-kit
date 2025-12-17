import { createStorefrontCheckout } from "./shopify";
import type { CartItem } from "@/stores/cartStore";

const CHECKOUT_TIMEOUT_MS = 20000; // 20 seconds
const MAX_RETRIES = 1;

interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Creates a checkout with timeout and retry logic
 */
export async function createCheckoutWithResilience(
  items: CartItem[],
  freeMasks: number,
  discountCodes: string[]
): Promise<CheckoutResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const checkoutUrl = await createCheckoutWithTimeout(
        items,
        freeMasks,
        discountCodes
      );
      
      if (checkoutUrl) {
        return { success: true, checkoutUrl };
      }
      
      // Null response - retry if we have attempts left
      lastError = new Error("No checkout URL returned");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.error(`Checkout attempt ${attempt + 1} failed:`, error);
    }
    
    // Don't retry on last attempt
    if (attempt < MAX_RETRIES) {
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return {
    success: false,
    error: lastError?.message || "Checkout failed after retries",
  };
}

/**
 * Creates checkout with timeout wrapper
 */
async function createCheckoutWithTimeout(
  items: CartItem[],
  freeMasks: number,
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
      freeMasks,
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
 * Safely opens checkout URL with popup fallback
 */
export function openCheckoutUrl(checkoutUrl: string, isMobile: boolean): void {
  if (isMobile) {
    // Force flush any pending UI updates before redirect
    requestAnimationFrame(() => {
      window.location.href = checkoutUrl;
    });
    return;
  }
  
  // Desktop: try popup first, fallback to same tab
  const popup = window.open(checkoutUrl, '_blank');
  
  // If popup was blocked, fallback to same-tab redirect
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    console.log('Popup blocked, falling back to same-tab redirect');
    window.location.href = checkoutUrl;
  }
}

/**
 * Detects if current device is mobile
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
