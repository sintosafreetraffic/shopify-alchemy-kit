// Pinterest Tracking Utility
// Pinterest expects product_id to match the catalog (Shopify numeric ID)
//
// IMPORTANT: Event Attribution Strategy
// =====================================
// Lovable Front-End handles:
//   - PageVisit (product page views)
//   - AddToCart (items added to cart)
//   - Checkout / InitiateCheckout (checkout started)
//   - Lead (email signups)
//   - Signup (account creation)
//
// Shopify Pinterest App handles (DO NOT duplicate here):
//   - Purchase events (order confirmation)
//   - CAPI (Conversions API) events
//
// This separation prevents attribution conflicts and allows Pinterest
// to deduplicate correctly between client-side and server-side events.

declare global {
  interface Window {
    pintrk?: (...args: any[]) => void;
  }
}

// SHA-256 hash function for enhanced matching
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Session guard key for enhanced match
const ENHANCED_MATCH_SESSION_KEY = 'pinterest_enhanced_match_set';

// Check if enhanced match was already set this session
function wasEnhancedMatchSet(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(ENHANCED_MATCH_SESSION_KEY) === 'true';
}

// Mark enhanced match as set for this session
function markEnhancedMatchSet(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(ENHANCED_MATCH_SESSION_KEY, 'true');
  }
}

// Set enhanced match data (call when user email is known)
// Includes session guard to avoid duplicate calls
export async function setEnhancedMatch(email?: string) {
  if (typeof window !== 'undefined' && window.pintrk && email) {
    // Skip if already set this session
    if (wasEnhancedMatchSet()) {
      console.log('[Pinterest] Enhanced match already set this session, skipping');
      return;
    }
    
    const hashedEmail = await sha256(email);
    window.pintrk('set', { em: hashedEmail });
    markEnhancedMatchSet();
    console.log('[Pinterest] Enhanced match set');
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

// Session storage key for InitiateCheckout fingerprint deduplication
const INITIATE_CHECKOUT_FP_KEY = 'pinterest_initiatecheckout_fp';

// Generate cart fingerprint for deduplication
export function generateCartFingerprint(items: Array<{ variantId: string; quantity: number; price?: { amount: string } }>): string {
  const sorted = [...items]
    .sort((a, b) => a.variantId.localeCompare(b.variantId))
    .map(item => `${item.variantId}:${item.quantity}:${item.price?.amount || '0'}`);
  return sorted.join('|');
}

// Track InitiateCheckout event (when user clicks checkout button)
// IMPORTANT: This is NOT a completed transaction - use InitiateCheckout, not Checkout!
// Completed transactions (Checkout) must ONLY be fired by Shopify's Pinterest App after payment.
// Deduplication: Only fires if cart fingerprint changed since last InitiateCheckout.
export function trackInitiateCheckout(items: Array<{ variantId: string; quantity: number; price?: { amount: string } }>): boolean {
  if (typeof window === 'undefined' || !window.pintrk) {
    return false;
  }
  
  const fingerprint = generateCartFingerprint(items);
  const lastFingerprint = sessionStorage.getItem(INITIATE_CHECKOUT_FP_KEY);
  
  // Dedupe: skip if same cart state already tracked
  if (fingerprint === lastFingerprint) {
    console.log('[Pinterest] InitiateCheckout skipped (duplicate fingerprint)');
    return false;
  }
  
  const data = {
    event_id: generateEventId(),
  };
  window.pintrk('track', 'initiateCheckout', data);
  sessionStorage.setItem(INITIATE_CHECKOUT_FP_KEY, fingerprint);
  console.log('[Pinterest] InitiateCheckout tracked', data);
  return true;
}

// Clear InitiateCheckout fingerprint (call when cart changes to allow new tracking)
export function clearInitiateCheckoutFingerprint(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(INITIATE_CHECKOUT_FP_KEY);
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
