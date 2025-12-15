// Pinterest Tracking Utility
// Pinterest expects product_id to match the catalog (Shopify numeric ID)
//
// IMPORTANT: Event Attribution Strategy
// =====================================
// Lovable Front-End handles:
//   - PageVisit (product page views)
//   - AddToCart (items added to cart)
//   - InitiateCheckout (checkout started)
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
    pintrk?: ((...args: any[]) => void) & { queue?: any[] };
    __pintrk_original?: (...args: any[]) => void;
  }
}

// ============================================================================
// SAFE PINTEREST CALL WRAPPER
// This function MUST be used for ALL pintrk calls to prevent TypeError crashes
// when Pinterest Tag isn't ready or is blocked by ad blockers.
// ============================================================================
function safePintrk(
  command: string, 
  eventName?: string, 
  payload?: Record<string, any>
): boolean {
  if (typeof window === "undefined") return false;
  
  // Get the current pintrk function (could be original or wrapper)
  const pin = window.pintrk;
  
  // Guard: pintrk must exist and be callable
  if (typeof pin !== "function") {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Pinterest] pintrk not ready, skipping event", { command, eventName, payload });
    }
    return false;
  }
  
  try {
    // Call with appropriate arguments
    if (eventName !== undefined) {
      pin(command, eventName, payload);
    } else {
      pin(command);
    }
    return true;
  } catch (err) {
    // Graceful failure - never let Pinterest errors break the app
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Pinterest] pintrk call failed", { command, eventName, payload, err });
    }
    return false;
  }
}

// Check if Pinterest is loaded (basic check for any tracking call)
function isPinterestReady(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.pintrk === "function";
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
  if (!isPinterestReady() || !email) return;
  
  // Skip if already set this session
  if (wasEnhancedMatchSet()) {
    console.log('[Pinterest] Enhanced match already set this session, skipping');
    return;
  }
  
  try {
    const hashedEmail = await sha256(email);
    const success = safePintrk('set', undefined, { em: hashedEmail });
    if (success) {
      markEnhancedMatchSet();
      console.log('[Pinterest] Enhanced match set');
    }
  } catch (e) {
    console.warn('[Pinterest] Enhanced match failed:', e);
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
  if (!isPinterestReady()) {
    console.log('[Pinterest] PageVisit skipped - pintrk not ready');
    return;
  }
  
  const data: Record<string, any> = {
    event_id: generateEventId(),
  };
  if (productId) {
    data.product_id = extractProductId(productId);
  }
  
  const success = safePintrk('track', 'pagevisit', data);
  if (success) {
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
  if (!isPinterestReady()) {
    console.log('[Pinterest] AddToCart skipped - pintrk not ready');
    return;
  }
  
  const data = {
    event_id: generateEventId(),
    product_id: extractProductId(productId),
    value: value,
    order_quantity: quantity,
    currency: currency,
  };
  
  const success = safePintrk('track', 'addtocart', data);
  if (success) {
    console.log('[Pinterest] AddToCart tracked', data);
  }
}

// Session storage keys for InitiateCheckout fingerprint deduplication
const INITIATE_CHECKOUT_FP_KEY = 'pinterest_initiatecheckout_fp';
const INITIATE_CHECKOUT_TS_KEY = 'pinterest_initiatecheckout_ts';
const INITIATE_CHECKOUT_DEDUPE_WINDOW_MS = 30000; // 30 seconds

// Generate cart fingerprint for deduplication
export function generateCartFingerprint(items: Array<{ variantId: string; quantity: number; price?: { amount: string } }>): string {
  const sorted = [...items]
    .sort((a, b) => a.variantId.localeCompare(b.variantId))
    .map(item => `${item.variantId}:${item.quantity}:${item.price?.amount || '0'}`);
  return sorted.join('|');
}

// Track InitiateCheckout event (when user clicks checkout button)
// IMPORTANT: This is NOT a completed transaction - use initiatecheckout, not checkout!
// Completed transactions (Checkout) must ONLY be fired by Shopify's Pinterest App after payment.
// Deduplication: Only fires if cart fingerprint changed OR 30 seconds have passed.
export function trackInitiateCheckout(items: Array<{ variantId: string; quantity: number; price?: { amount: string }; currencyCode?: string }>): boolean {
  if (!isPinterestReady()) {
    console.log('[Pinterest] InitiateCheckout skipped - pintrk not ready');
    return false;
  }
  
  try {
    const fingerprint = generateCartFingerprint(items);
    const lastFingerprint = sessionStorage.getItem(INITIATE_CHECKOUT_FP_KEY);
    const lastTimestamp = sessionStorage.getItem(INITIATE_CHECKOUT_TS_KEY);
    const now = Date.now();
    
    // Dedupe: skip if same cart state already tracked within 30 seconds
    if (fingerprint === lastFingerprint && lastTimestamp) {
      const elapsed = now - parseInt(lastTimestamp, 10);
      if (elapsed < INITIATE_CHECKOUT_DEDUPE_WINDOW_MS) {
        console.log('[Pinterest] InitiateCheckout skipped (duplicate within 30s window)');
        return false;
      }
    }
    
    // Calculate totals for event data
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => {
      const price = parseFloat(item.price?.amount || '0');
      return sum + (price * item.quantity);
    }, 0);
    const currency = items[0]?.currencyCode || 'USD';
    
    const data: Record<string, any> = {
      event_id: generateEventId(),
      order_quantity: totalQuantity,
    };
    
    // Only include value/currency if we have valid amounts
    if (totalValue > 0) {
      data.value = totalValue;
      data.currency = currency;
    }
    
    // CRITICAL: Event name must be all lowercase 'initiatecheckout'
    const success = safePintrk('track', 'initiatecheckout', data);
    
    if (success) {
      // Store fingerprint and timestamp for deduplication
      sessionStorage.setItem(INITIATE_CHECKOUT_FP_KEY, fingerprint);
      sessionStorage.setItem(INITIATE_CHECKOUT_TS_KEY, String(now));
      console.log('[Pinterest] InitiateCheckout tracked', data);
    }
    
    return success;
  } catch (e) {
    console.warn('[Pinterest] InitiateCheckout tracking failed:', e);
    return false;
  }
}

// Clear InitiateCheckout fingerprint (call when cart changes to allow new tracking)
export function clearInitiateCheckoutFingerprint(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(INITIATE_CHECKOUT_FP_KEY);
    sessionStorage.removeItem(INITIATE_CHECKOUT_TS_KEY);
  }
}

// Track lead event (e.g., newsletter signup)
export function trackLead(leadType: string = 'Newsletter') {
  if (!isPinterestReady()) {
    console.log('[Pinterest] Lead skipped - pintrk not ready');
    return;
  }
  
  const data = {
    event_id: generateEventId(),
    lead_type: leadType,
  };
  
  const success = safePintrk('track', 'lead', data);
  if (success) {
    console.log('[Pinterest] Lead tracked', data);
  }
}

// Track signup event
export function trackSignup() {
  if (!isPinterestReady()) {
    console.log('[Pinterest] Signup skipped - pintrk not ready');
    return;
  }
  
  const data = {
    event_id: generateEventId(),
  };
  
  const success = safePintrk('track', 'signup', data);
  if (success) {
    console.log('[Pinterest] Signup tracked', data);
  }
}
