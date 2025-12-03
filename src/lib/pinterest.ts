// Pinterest Tracking Utility
// Pinterest expects product_id to match the catalog (Shopify numeric ID)

declare global {
  interface Window {
    pintrk?: (...args: any[]) => void;
  }
}

// Extract numeric product ID from Shopify GraphQL ID
// e.g., "gid://shopify/Product/8456789123456" -> "8456789123456"
export function extractProductId(shopifyGid: string): string {
  const match = shopifyGid.match(/Product\/(\d+)/);
  return match ? match[1] : shopifyGid;
}

// Extract numeric variant ID from Shopify GraphQL ID
export function extractVariantId(shopifyGid: string): string {
  const match = shopifyGid.match(/ProductVariant\/(\d+)/);
  return match ? match[1] : shopifyGid;
}

// Generate unique event ID
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Track page visit with product ID (for product pages)
export function trackPageVisit(productId?: string) {
  if (typeof window !== 'undefined' && window.pintrk) {
    const data: Record<string, any> = {
      event_id: generateEventId(),
    };
    if (productId) {
      data.product_id = extractProductId(productId);
    }
    window.pintrk('track', 'pagevisit', data);
    console.log('[Pinterest] PageVisit tracked', data);
  }
}

// Track add to cart event
export function trackAddToCart(
  productId: string,
  variantId: string,
  value: number,
  currency: string = 'USD',
  quantity: number = 1
) {
  if (typeof window !== 'undefined' && window.pintrk) {
    const data = {
      event_id: generateEventId(),
      product_id: extractProductId(productId),
      value: value,
      order_quantity: quantity,
      currency: currency,
    };
    window.pintrk('track', 'addtocart', data);
    console.log('[Pinterest] AddToCart tracked', data);
  }
}

// Track checkout/initiate checkout event
export function trackCheckout(
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
  }>,
  totalValue: number,
  currency: string = 'USD'
) {
  if (typeof window !== 'undefined' && window.pintrk) {
    // Pinterest accepts product_ids as array
    const productIds = items.map(item => extractProductId(item.productId));
    
    const data = {
      event_id: generateEventId(),
      product_id: productIds,
      value: totalValue,
      currency: currency,
      order_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    window.pintrk('track', 'checkout', data);
    console.log('[Pinterest] Checkout tracked', data);
  }
}

// Track lead event (e.g., newsletter signup)
export function trackLead(leadType: string = 'Newsletter') {
  if (typeof window !== 'undefined' && window.pintrk) {
    const data = {
      event_id: generateEventId(),
      lead_type: leadType,
    };
    window.pintrk('track', 'lead', data);
    console.log('[Pinterest] Lead tracked', data);
  }
}

// Track signup event
export function trackSignup() {
  if (typeof window !== 'undefined' && window.pintrk) {
    const data = {
      event_id: generateEventId(),
    };
    window.pintrk('track', 'signup', data);
    console.log('[Pinterest] Signup tracked', data);
  }
}
