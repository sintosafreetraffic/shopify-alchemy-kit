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

import { getHashedExternalId } from './pinterest-external-id';
import { getEpik } from './attribution';

// ============================================================================
// QUEUE SYSTEM FOR PINTEREST RACE CONDITION FIX
// Events are queued when Pinterest isn't ready, then flushed when it loads
// ============================================================================

interface QueuedPinterestEvent {
  ts: number;
  command: string;
  eventName?: string;
  payload?: Record<string, any>;
  retryCount: number;
}

declare global {
  interface Window {
    pintrk?: ((...args: any[]) => void) & { queue?: any[] };
    __pintrk_original?: (...args: any[]) => void;
    __lov_pinterestQueue?: QueuedPinterestEvent[];
    __lov_pinterestPollingActive?: boolean;
  }
}

// Queue constants
const QUEUE_MAX_LENGTH = 50;
const POLL_INTERVAL_MS = 200;
const POLL_MAX_DURATION_MS = 5000;
const MAX_RETRY_COUNT = 3;

// ============================================================================
// BROWSER-SAFE DEV MODE DETECTION (Patch A)
// Avoids process.env.NODE_ENV which can crash in Vite/Lovable builds
// ============================================================================
function isDevBuild(): boolean {
  try {
    return (
      typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.MODE !== 'production'
    );
  } catch {
    return false; // Production-safe default
  }
}

// Debug logging helper - gated by localStorage flag (never logs PII)
function debugLog(...args: any[]): void {
  if (typeof window !== 'undefined' && localStorage.getItem('DEBUG_TRACKING') === '1') {
    console.log('[Pinterest Queue]', ...args);
  }
}

// Initialize queue if needed
function ensureQueue(): QueuedPinterestEvent[] {
  if (typeof window === 'undefined') return [];
  if (!window.__lov_pinterestQueue) {
    window.__lov_pinterestQueue = [];
  }
  return window.__lov_pinterestQueue;
}

// ============================================================================
// STRICT READINESS DETECTION
// Pinterest is ONLY ready if pintrk exists AND is a function
// ============================================================================
function isPinterestReady(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.pintrk === 'function';
}

// ============================================================================
// FLUSH LOGIC - Resilient per-event processing
// ============================================================================
let isFlushing = false;

function flushPinterestQueue(): void {
  if (typeof window === 'undefined') return;
  if (!isPinterestReady()) return;
  if (isFlushing) return; // Prevent concurrent flushes
  
  const queue = ensureQueue();
  if (queue.length === 0) return;
  
  isFlushing = true;
  debugLog('Flush starting, events in queue:', queue.length);
  
  let flushedCount = 0;
  let remainingCount = 0;
  
  // Process queue from front, removing successful events
  const pin = window.pintrk!;
  const toRetain: QueuedPinterestEvent[] = [];
  
  for (const event of queue) {
    try {
      if (event.eventName !== undefined) {
        pin(event.command, event.eventName, event.payload);
      } else {
        pin(event.command);
      }
      flushedCount++;
      debugLog('Flushed event:', event.eventName || event.command);
    } catch (err) {
      // Event failed - check retry count
      event.retryCount++;
      if (event.retryCount < MAX_RETRY_COUNT) {
        toRetain.push(event);
        debugLog('Event failed, will retry:', event.eventName || event.command, 'attempt:', event.retryCount);
      } else {
        debugLog('Event dropped after max retries:', event.eventName || event.command);
      }
    }
  }
  
  // Replace queue with events that need retry
  window.__lov_pinterestQueue = toRetain;
  remainingCount = toRetain.length;
  
  debugLog('Flush complete. Flushed:', flushedCount, 'Remaining:', remainingCount);
  isFlushing = false;
}

// ============================================================================
// POLLING MECHANISM - setTimeout chain (not setInterval)
// Patch B: Only runs when queue has items AND Pinterest is not ready
// ============================================================================
function startPolling(): void {
  if (typeof window === 'undefined') return;
  if (window.__lov_pinterestPollingActive) return; // Already polling
  
  // Patch B: Don't poll if Pinterest is already ready
  if (isPinterestReady()) {
    flushPinterestQueue();
    return;
  }
  
  // Patch B: Don't poll if queue is empty (nothing to flush)
  const queue = ensureQueue();
  if (queue.length === 0) {
    debugLog('Polling skipped: queue empty');
    return;
  }
  
  window.__lov_pinterestPollingActive = true;
  const startTime = Date.now();
  debugLog('Polling started, queue size:', queue.length);
  
  function poll(): void {
    const elapsed = Date.now() - startTime;
    const currentQueue = ensureQueue();
    
    // Stop early if Pinterest ready - flush and exit
    if (isPinterestReady()) {
      debugLog('Pinterest ready detected via polling');
      flushPinterestQueue();
      window.__lov_pinterestPollingActive = false;
      return;
    }
    
    // Patch B: Stop early if queue became empty (e.g., all events dropped)
    if (currentQueue.length === 0) {
      debugLog('Polling stopped: queue empty');
      window.__lov_pinterestPollingActive = false;
      return;
    }
    
    // Stop after timeout
    if (elapsed >= POLL_MAX_DURATION_MS) {
      debugLog('Polling timeout reached (5s), stopping. Queue size:', currentQueue.length);
      window.__lov_pinterestPollingActive = false;
      return;
    }
    
    // Schedule next poll
    setTimeout(poll, POLL_INTERVAL_MS);
  }
  
  // Start the chain
  setTimeout(poll, POLL_INTERVAL_MS);
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
  // Server-side: always return false, nothing to do
  if (typeof window === 'undefined') return false;
  
  try {
    // If Pinterest is ready, send immediately
    if (isPinterestReady()) {
      const pin = window.pintrk!;
      if (eventName !== undefined) {
        pin(command, eventName, payload);
      } else {
        pin(command);
      }
      return true;
    }
    
    // Pinterest not ready - queue the event
    const queue = ensureQueue();
    
    const queuedEvent: QueuedPinterestEvent = {
      ts: Date.now(),
      command,
      eventName,
      payload,
      retryCount: 0,
    };
    
    // Cap queue length - drop oldest if exceeded
    if (queue.length >= QUEUE_MAX_LENGTH) {
      const dropped = queue.shift();
      debugLog('Queue full, dropped oldest event:', dropped?.eventName || dropped?.command);
    }
    
    queue.push(queuedEvent);
    debugLog('Event queued:', eventName || command, 'Queue size:', queue.length);
    
    // Start polling if not already active
    startPolling();
    
    return false; // Event queued, not sent yet
  } catch (err) {
    // Absolute safety net - never throw (Patch A: browser-safe logging)
    if (isDevBuild() || (typeof window !== 'undefined' && localStorage.getItem('DEBUG_TRACKING') === '1')) {
      console.warn('[Pinterest] safePintrk error (suppressed):', err instanceof Error ? err.message : 'unknown');
    }
    return false;
  }
}

export { safePintrk };

// Initialize on module load - Patch B: only flush checks, no eager polling
// Polling is now triggered on-demand by safePintrk() when events are queued
if (typeof window !== 'undefined') {
  // Backup flush attempts when Pinterest script fires load event
  const checkAndFlush = () => {
    if (isPinterestReady()) {
      flushPinterestQueue();
    }
  };
  
  // Check after short delays (gives Pinterest time to initialize)
  setTimeout(checkAndFlush, 100);
  setTimeout(checkAndFlush, 500);
  setTimeout(checkAndFlush, 1000);
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

// ============================================================================
// EMAIL PERSISTENCE FOR PINTEREST MATCHING
// Store hashed email in localStorage for subsequent events (AddToCart, Lead)
// ============================================================================

const EMAIL_HASH_KEY = '__lov_pinterest_em';

function storeEmailHash(hashedEmail: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(EMAIL_HASH_KEY, hashedEmail);
    } catch (e) {
      console.warn('[Pinterest] Failed to store email hash:', e);
    }
  }
}

export function getStoredEmailHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(EMAIL_HASH_KEY);
  } catch (e) {
    return null;
  }
}

// Set enhanced match data (call when user email is known)
// Includes session guard to avoid duplicate calls
// ALSO stores hashed email for subsequent events
export async function setEnhancedMatch(email?: string) {
  if (!email) return;
  
  try {
    const hashedEmail = await sha256(email);
    
    // Always store the hash for subsequent events (AddToCart, Lead)
    storeEmailHash(hashedEmail);
    console.log('[Pinterest] Email hash stored for future events');
    
    // Only call pintrk.set if Pinterest is ready and not already set
    if (isPinterestReady() && !wasEnhancedMatchSet()) {
      const success = safePintrk('set', undefined, { em: hashedEmail });
      if (success) {
        markEnhancedMatchSet();
        console.log('[Pinterest] Enhanced match set via pintrk');
      }
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
// Now queues event if Pinterest isn't ready (instead of dropping)
// Includes external_id and click_id for 100% coverage
export async function trackPageVisit(productId?: string): Promise<void> {
  const hashedExternalId = await getHashedExternalId();
  const clickId = getEpik();
  
  const data: Record<string, any> = {
    event_id: generateEventId(),
    event_source_url: window.location.href, // Required for 100% Source URL coverage
  };
  
  if (hashedExternalId) {
    data.external_id = hashedExternalId;
  }
  
  // Include click_id for improved EPIK coverage
  if (clickId) {
    data.click_id = clickId;
  }
  
  if (productId) {
    data.product_id = extractProductId(productId);
  }
  
  const success = safePintrk('track', 'pagevisit', data);
  if (success) {
    console.log('[Pinterest] PageVisit tracked', { ...data, click_id: clickId ? '[set]' : '[not set]' });
  } else {
    debugLog('PageVisit queued or failed', data);
  }
}

// Track add to cart event
// Now queues event if Pinterest isn't ready (instead of dropping)
// Includes external_id, em, and click_id for 100% coverage
export async function trackAddToCart(
  productId: string,
  variantId: string,
  value: number,
  currency: string = 'USD',
  quantity: number = 1
): Promise<void> {
  const hashedExternalId = await getHashedExternalId();
  const storedEmailHash = getStoredEmailHash();
  const clickId = getEpik();
  
  const data: Record<string, any> = {
    event_id: generateEventId(),
    event_source_url: window.location.href, // Required for 100% Source URL coverage
    product_id: extractProductId(productId),
    value: value,
    order_quantity: quantity,
    currency: currency,
  };
  
  if (hashedExternalId) {
    data.external_id = hashedExternalId;
  }
  
  // Include email hash if available (for improved coverage)
  if (storedEmailHash) {
    data.em = storedEmailHash;
  }
  
  // Include click_id for improved EPIK coverage
  if (clickId) {
    data.click_id = clickId;
  }
  
  const success = safePintrk('track', 'addtocart', data);
  if (success) {
    console.log('[Pinterest] AddToCart tracked', { 
      ...data, 
      em: storedEmailHash ? '[set]' : '[not set]',
      click_id: clickId ? '[set]' : '[not set]'
    });
  } else {
    debugLog('AddToCart queued or failed', data);
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
//
// NOTE: We intentionally do NOT send `value`/`currency` for initiatecheckout
// to avoid any risk of Pinterest misattributing this as revenue.
// Completed purchases are tracked server-side via Shopify / Conversions API only.
// Now queues event if Pinterest isn't ready (instead of dropping)
// Includes external_id for 100% coverage
export async function trackInitiateCheckout(items: Array<{ variantId: string; quantity: number; price?: { amount: string }; currencyCode?: string }>): Promise<boolean> {
  
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
    
    // Get external_id and click_id for 100% coverage
    const hashedExternalId = await getHashedExternalId();
    const clickId = getEpik();
    
    // Calculate totals for logging/debugging (NOT sent to Pinterest)
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => {
      const price = parseFloat(item.price?.amount || '0');
      return sum + (price * item.quantity);
    }, 0);
    const currency = items[0]?.currencyCode || 'USD';
    
    // Build payload - intentionally excludes value/currency to prevent revenue misattribution
    const data: Record<string, any> = {
      event_id: generateEventId(),
      event_source_url: window.location.href, // Required for 100% Source URL coverage
      order_quantity: totalQuantity,
    };
    
    if (hashedExternalId) {
      data.external_id = hashedExternalId;
    }
    
    // Include click_id for improved EPIK coverage
    if (clickId) {
      data.click_id = clickId;
    }
    
    // Debug logging (browser-safe, gated by DEBUG_TRACKING)
    if (isDevBuild() || (typeof window !== 'undefined' && localStorage.getItem('DEBUG_TRACKING') === '1')) {
      console.log('[Pinterest] InitiateCheckout event prepared', {
        fingerprint,
        totalQuantity,
        totalValue,
        currency,
        data,
      });
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
// Now queues event if Pinterest isn't ready (instead of dropping)
// Includes external_id, em, and click_id for 100% coverage
export async function trackLead(leadType: string = 'Newsletter', email?: string): Promise<void> {
  const hashedExternalId = await getHashedExternalId();
  const clickId = getEpik();
  
  // Get email hash: prefer passed email, fallback to stored
  let emailHash = getStoredEmailHash();
  if (email) {
    emailHash = await sha256(email);
  }
  
  const data: Record<string, any> = {
    event_id: generateEventId(),
    event_source_url: window.location.href, // Required for 100% Source URL coverage
    lead_type: leadType,
  };
  
  if (hashedExternalId) {
    data.external_id = hashedExternalId;
  }
  
  // Include email hash for 100% coverage
  if (emailHash) {
    data.em = emailHash;
  }
  
  // Include click_id for improved EPIK coverage
  if (clickId) {
    data.click_id = clickId;
  }
  
  const success = safePintrk('track', 'lead', data);
  if (success) {
    console.log('[Pinterest] Lead tracked', { 
      ...data, 
      em: emailHash ? '[set]' : '[not set]',
      click_id: clickId ? '[set]' : '[not set]'
    });
  } else {
    debugLog('Lead queued or failed', data);
  }
}

// Track signup event
// Now queues event if Pinterest isn't ready (instead of dropping)
// Includes external_id and click_id for 100% coverage
export async function trackSignup(): Promise<void> {
  const hashedExternalId = await getHashedExternalId();
  const clickId = getEpik();
  
  const data: Record<string, any> = {
    event_id: generateEventId(),
    event_source_url: window.location.href, // Required for 100% Source URL coverage
  };
  
  if (hashedExternalId) {
    data.external_id = hashedExternalId;
  }
  
  // Include click_id for improved EPIK coverage
  if (clickId) {
    data.click_id = clickId;
  }
  
  const success = safePintrk('track', 'signup', data);
  if (success) {
    console.log('[Pinterest] Signup tracked', { ...data, click_id: clickId ? '[set]' : '[not set]' });
  } else {
    debugLog('Signup queued or failed', data);
  }
}


// ============================================================================
// SERVER-SIDE PURCHASE TRACKING
// Tracks purchases via edge function to Pinterest Conversions API
// ============================================================================

interface PurchaseOrderData {
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

// Storage keys for Pinterest attribution
const PINTEREST_EPIK_STORAGE_KEY = 'pinterest_epik';
const PINTEREST_LANDING_PAGE_KEY = 'pinterest_landing_page';

/**
 * Get Pinterest click ID from storage
 */
function getStoredPinterestClickId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const fromStorage = localStorage.getItem(PINTEREST_EPIK_STORAGE_KEY);
  if (fromStorage) return fromStorage;
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_epik' && value) {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * Track a purchase event to Pinterest via edge function (server-side)
 * Automatically captures Pinterest click ID and UTM params from URL/storage
 * 
 * @param orderData - Order information to track
 * @returns Promise with tracking result
 */
export async function trackPurchase(orderData: PurchaseOrderData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  tracking_result?: any;
}> {
  try {
    // Dynamically import supabase to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get URL parameters for attribution (if in browser)
    const urlParams = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search)
      : null;

    // Build complete payload with automatic attribution capture
    const payload: PurchaseOrderData = {
      order_id: orderData.order_id,
      value: parseFloat(orderData.value.toString()),
      currency: orderData.currency || 'EUR',
      products: orderData.products || [],
      email: orderData.email,
      phone: orderData.phone,
      // Get Pinterest click ID: provided > URL param > stored
      pinterest_click_id: orderData.pinterest_click_id || 
        urlParams?.get('_ep') || 
        getStoredPinterestClickId() || 
        undefined,
      // Get UTM parameters from URL if not provided
      utm_source: orderData.utm_source || urlParams?.get('utm_source') || undefined,
      utm_medium: orderData.utm_medium || urlParams?.get('utm_medium') || undefined,
      utm_campaign: orderData.utm_campaign || urlParams?.get('utm_campaign') || undefined,
      utm_content: orderData.utm_content || urlParams?.get('utm_content') || undefined,
      utm_term: orderData.utm_term || urlParams?.get('utm_term') || undefined,
      // Get referrer and landing page
      referrer: orderData.referrer || 
        (typeof document !== 'undefined' ? document.referrer : undefined),
      landing_page: orderData.landing_page || 
        localStorage.getItem(PINTEREST_LANDING_PAGE_KEY) ||
        (typeof window !== 'undefined' ? window.location.href : undefined),
    };

    console.log('[Pinterest] Sending server-side purchase event:', {
      order_id: payload.order_id,
      value: payload.value,
      currency: payload.currency,
      has_click_id: !!payload.pinterest_click_id,
    });

    // Call edge function
    const { data, error } = await supabase.functions.invoke('pinterest-track', {
      body: payload,
    });

    if (error) {
      console.error('[Pinterest] Server-side tracking error:', error);
      return {
        success: false,
        error: error.message || 'Failed to track purchase',
      };
    }

    if (data?.success) {
      console.log('[Pinterest] ✅ Server-side purchase tracked:', data.message);
      return {
        success: true,
        message: data.message,
        tracking_result: data.tracking_result,
      };
    } else {
      console.error('[Pinterest] ❌ Server-side tracking failed:', data);
      return {
        success: false,
        error: data?.error || 'Tracking failed',
        tracking_result: data,
      };
    }
  } catch (error) {
    console.error('[Pinterest] Server-side tracking exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track purchase from Shopify order object (convenience wrapper)
 * 
 * @param order - Shopify order object
 * @returns Promise with tracking result
 */
export async function trackPurchaseFromOrder(order: {
  id: string | number;
  total_price?: string | number;
  total?: string | number;
  currency?: string;
  line_items?: Array<{
    product_id?: string | number;
    id?: string | number;
    title?: string;
    name?: string;
    quantity?: number;
    price?: string | number;
  }>;
  customer?: {
    email?: string;
    phone?: string;
  };
  email?: string;
  phone?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const total = order.total_price || order.total || 0;
  
  return trackPurchase({
    order_id: String(order.id),
    value: parseFloat(String(total)),
    currency: order.currency || 'EUR',
    products: (order.line_items || []).map(item => ({
      id: String(item.product_id || item.id || 'unknown'),
      name: item.title || item.name || 'Product',
      quantity: item.quantity || 1,
      price: parseFloat(String(item.price || 0)),
    })),
    email: order.customer?.email || order.email,
    phone: order.customer?.phone || order.phone,
  });
}
