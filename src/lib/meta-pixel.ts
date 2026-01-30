// Meta Pixel Tracking Utility
// Handles all Meta/Facebook Pixel events for the e-commerce funnel
//
// IMPORTANT: Event Strategy
// =========================
// Client-side events (this file):
//   - PageView (auto-fired via base pixel code)
//   - ViewContent (product page views)
//   - AddToCart (items added to cart)
//   - InitiateCheckout (checkout started)
//   - Lead (email signups)
//
// Server-side events (Shopify handles):
//   - Purchase events (order confirmation via Shopify's native Meta integration)

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { queue?: any[] };
  }
}

// ============================================================================
// META PIXEL READY CHECK
// ============================================================================

function isMetaPixelReady(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Safe wrapper for fbq calls - queues if not ready, fires when ready
 */
function safeFbq(command: string, eventName: string, params?: Record<string, any>): boolean {
  if (!isMetaPixelReady()) {
    // fbq queues events if not ready - just return false to skip local logging
    return false;
  }
  
  try {
    if (params) {
      window.fbq!(command, eventName, params);
    } else {
      window.fbq!(command, eventName);
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CONTENT ID EXTRACTION
// Extracts numeric product ID from Shopify GID format
// ============================================================================

function extractProductId(shopifyGid: string): string {
  // Handle Shopify GID format: gid://shopify/Product/123456789
  const match = shopifyGid.match(/\/(\d+)$/);
  return match ? match[1] : shopifyGid;
}

// ============================================================================
// META PIXEL EVENTS
// ============================================================================

/**
 * Track ViewContent event - when a user views a product page
 */
export function trackViewContent(
  productId: string,
  productName: string,
  value: number,
  currency: string = 'EUR'
): void {
  const params = {
    content_ids: [extractProductId(productId)],
    content_name: productName,
    content_type: 'product',
    value: value,
    currency: currency,
  };
  
  safeFbq('track', 'ViewContent', params);
}

/**
 * Track AddToCart event - when a user adds a product to cart
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  value: number,
  currency: string = 'EUR',
  quantity: number = 1
): void {
  // Validate value
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return;
  }

  const params = {
    content_ids: [extractProductId(productId)],
    content_name: productName,
    content_type: 'product',
    value: value,
    currency: currency,
    num_items: quantity,
  };
  
  safeFbq('track', 'AddToCart', params);
}

/**
 * Track InitiateCheckout event - when a user starts the checkout process
 */
export function trackInitiateCheckout(
  items: Array<{ 
    productId: string; 
    productName?: string;
    quantity: number; 
    price?: { amount: string }; 
  }>,
  currency: string = 'EUR'
): void {
  // Calculate totals
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => {
    const price = parseFloat(item.price?.amount || '0');
    return sum + (price * item.quantity);
  }, 0);
  
  // Extract all product IDs
  const contentIds = items.map(item => extractProductId(item.productId));
  
  const params = {
    content_ids: contentIds,
    content_type: 'product',
    value: totalValue,
    currency: currency,
    num_items: totalQuantity,
  };
  
  safeFbq('track', 'InitiateCheckout', params);
}

/**
 * Track Lead event - when a user submits their email (e.g., quiz results)
 */
export function trackLead(email?: string): void {
  // Note: We don't send the actual email to Meta, just fire the event
  safeFbq('track', 'Lead');
}

/**
 * Track CompleteRegistration event - when a user completes account registration
 */
export function trackCompleteRegistration(): void {
  safeFbq('track', 'CompleteRegistration');
}

/**
 * Track Search event - when a user performs a search
 */
export function trackSearch(searchQuery: string): void {
  const params = {
    search_string: searchQuery,
  };
  
  safeFbq('track', 'Search', params);
}
