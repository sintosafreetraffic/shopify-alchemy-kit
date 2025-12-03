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

// Track page visit with product ID (for product pages)
export function trackPageVisit(productId?: string) {
  if (typeof window !== 'undefined' && window.pintrk) {
    const data: Record<string, any> = {};
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
      product_id: extractProductId(productId),
      product_variant_id: extractVariantId(variantId),
      value: value,
      currency: currency,
      order_quantity: quantity,
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
    // Pinterest accepts product_ids as array or comma-separated string
    const productIds = items.map(item => extractProductId(item.productId));
    
    const data = {
      product_id: productIds,
      value: totalValue,
      currency: currency,
      order_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    window.pintrk('track', 'checkout', data);
    console.log('[Pinterest] Checkout tracked', data);
  }
}

// Initialize Pinterest tag (called once on page load)
export function initPinterestTag(tagId: string) {
  if (typeof window === 'undefined' || window.pintrk) return;
  
  // Pinterest base code
  (function(e: string) {
    if (!window.pintrk) {
      window.pintrk = function() {
        (window.pintrk as any).queue.push(Array.prototype.slice.call(arguments));
      } as any;
      (window.pintrk as any).queue = [];
      (window.pintrk as any).version = "3.0";
      const n = document.createElement("script");
      n.async = true;
      n.src = e;
      const t = document.getElementsByTagName("script")[0];
      if (t && t.parentNode) {
        t.parentNode.insertBefore(n, t);
      }
    }
  })("https://s.pinimg.com/ct/core.js");
  
  window.pintrk('load', tagId);
  window.pintrk('page');
  
  console.log('[Pinterest] Tag initialized with ID:', tagId);
}
