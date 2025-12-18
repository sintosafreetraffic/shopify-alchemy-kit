/**
 * Analytics Registry - Single source of truth for all tracking providers
 * Provides status checking, event dispatching, and diagnostics
 */

export type ProviderStatus = {
  name: string;
  initialized: boolean;
  lastEventAt: string | null;
  lastRoute: string | null;
  consentStatus: 'granted' | 'denied' | 'unknown';
  environment: 'production' | 'staging' | 'development';
  blockers: string[];
  scriptLoaded: boolean;
};

export type EventLogEntry = {
  id: string;
  timestamp: string;
  eventName: string;
  provider: string;
  payload: Record<string, unknown>;
  success: boolean;
  error?: string;
};

// In-memory event log (last 50 events)
const eventLog: EventLogEntry[] = [];
const MAX_LOG_SIZE = 50;

// Provider last event timestamps
const providerLastEvent: Record<string, string> = {};
const providerLastRoute: Record<string, string> = {};

/**
 * Log an analytics event
 */
export function logAnalyticsEvent(
  eventName: string,
  provider: string,
  payload: Record<string, unknown>,
  success: boolean,
  error?: string
): void {
  const entry: EventLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventName,
    provider,
    payload,
    success,
    error,
  };
  
  eventLog.unshift(entry);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.pop();
  }
  
  if (success) {
    providerLastEvent[provider] = entry.timestamp;
    if (eventName === 'page_view' || eventName === 'pagevisit') {
      providerLastRoute[provider] = String(payload.url || payload.route || window.location.pathname);
    }
  }
}

/**
 * Get event log
 */
export function getEventLog(): EventLogEntry[] {
  return [...eventLog];
}

/**
 * Clear event log
 */
export function clearEventLog(): void {
  eventLog.length = 0;
}

/**
 * Check if Klaviyo is initialized
 */
export function isKlaviyoReady(): boolean {
  if (typeof window === 'undefined') return false;
  return Array.isArray((window as any)._klOnsite);
}

/**
 * Check if Pinterest is ready
 */
export function isPinterestReady(): boolean {
  if (typeof window === 'undefined') return false;
  const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
  return typeof pintrk === 'function';
}

/**
 * Check if Clarity is ready
 */
export function isClarityReady(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).clarity === 'function';
}

/**
 * Check if scripts have loaded (deferred loading)
 */
export function areScriptsLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  // Check if any of the deferred scripts have loaded
  return isKlaviyoReady() || isPinterestReady() || isClarityReady();
}

/**
 * Detect ad blockers
 */
export async function detectAdBlocker(): Promise<boolean> {
  try {
    // Try to fetch a known ad-related resource
    const response = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return false;
  } catch {
    return true;
  }
}

/**
 * Get current environment
 */
export function getEnvironment(): 'production' | 'staging' | 'development' {
  if (typeof window === 'undefined') return 'development';
  const hostname = window.location.hostname;
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  }
  if (hostname.includes('lovableproject.com') || hostname.includes('staging')) {
    return 'staging';
  }
  return 'production';
}

/**
 * Get provider status
 */
export function getProviderStatus(providerName: string): ProviderStatus {
  const env = getEnvironment();
  const blockers: string[] = [];
  
  let initialized = false;
  let scriptLoaded = false;
  
  switch (providerName.toLowerCase()) {
    case 'klaviyo':
      initialized = isKlaviyoReady();
      scriptLoaded = initialized;
      break;
    case 'pinterest':
      initialized = isPinterestReady();
      scriptLoaded = initialized;
      // Check if debug wrapper is blocking checkout
      if ((window as any).__pintrk_debug_installed) {
        blockers.push('Debug wrapper active - checkout events blocked (intentional)');
      }
      break;
    case 'clarity':
      initialized = isClarityReady();
      scriptLoaded = initialized;
      break;
    default:
      break;
  }
  
  return {
    name: providerName,
    initialized,
    lastEventAt: providerLastEvent[providerName] || null,
    lastRoute: providerLastRoute[providerName] || null,
    consentStatus: 'granted', // No consent management implemented yet
    environment: env,
    blockers,
    scriptLoaded,
  };
}

/**
 * Get all provider statuses
 */
export function getAllProviderStatuses(): ProviderStatus[] {
  return [
    getProviderStatus('Klaviyo'),
    getProviderStatus('Pinterest'),
    getProviderStatus('Clarity'),
  ];
}

/**
 * Track page view across all providers
 */
export function trackPageView(route: string): void {
  const timestamp = new Date().toISOString();
  
  // Klaviyo - no explicit page view, but track route
  if (isKlaviyoReady()) {
    providerLastRoute['Klaviyo'] = route;
    providerLastEvent['Klaviyo'] = timestamp;
    logAnalyticsEvent('page_view', 'Klaviyo', { route }, true);
  }
  
  // Pinterest - already tracks page via initial load, but we can track SPA navigation
  if (isPinterestReady()) {
    try {
      const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
      if (typeof pintrk === 'function') {
        pintrk('track', 'pagevisit', { event_id: `pv-${Date.now()}` });
        providerLastRoute['Pinterest'] = route;
        providerLastEvent['Pinterest'] = timestamp;
        logAnalyticsEvent('pagevisit', 'Pinterest', { route }, true);
      }
    } catch (e) {
      logAnalyticsEvent('pagevisit', 'Pinterest', { route }, false, String(e));
    }
  }
  
  // Clarity - automatically tracks page views
  if (isClarityReady()) {
    providerLastRoute['Clarity'] = route;
    providerLastEvent['Clarity'] = timestamp;
    logAnalyticsEvent('page_view', 'Clarity', { route }, true);
  }
}

/**
 * Send test event (for diagnostics page)
 */
export function sendTestEvent(
  eventType: 'page_view' | 'add_to_cart' | 'begin_checkout' | 'identify',
  provider: string
): { success: boolean; error?: string; payload: Record<string, unknown> } {
  const mockPayload: Record<string, unknown> = {
    test: true,
    timestamp: new Date().toISOString(),
  };
  
  try {
    switch (eventType) {
      case 'page_view':
        if (provider === 'Pinterest' && isPinterestReady()) {
          const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
          pintrk('track', 'pagevisit', { event_id: `test-${Date.now()}`, ...mockPayload });
        } else if (provider === 'Klaviyo' && isKlaviyoReady()) {
          // Klaviyo doesn't have explicit page view
          mockPayload.note = 'Klaviyo tracks via onsite.js automatically';
        } else if (provider === 'Clarity' && isClarityReady()) {
          mockPayload.note = 'Clarity tracks page views automatically';
        }
        break;
        
      case 'add_to_cart':
        mockPayload.product_id = 'test-product-123';
        mockPayload.value = 29.99;
        mockPayload.currency = 'USD';
        mockPayload.quantity = 1;
        
        if (provider === 'Pinterest' && isPinterestReady()) {
          const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
          pintrk('track', 'addtocart', { event_id: `test-${Date.now()}`, ...mockPayload });
        } else if (provider === 'Klaviyo' && isKlaviyoReady()) {
          (window as any)._klOnsite.push(['track', 'Added to Cart', mockPayload]);
        }
        break;
        
      case 'begin_checkout':
        mockPayload.order_quantity = 1;
        mockPayload.note = 'Test event - no value sent to prevent misattribution';
        
        if (provider === 'Pinterest' && isPinterestReady()) {
          const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
          pintrk('track', 'initiatecheckout', { event_id: `test-${Date.now()}`, order_quantity: 1 });
        } else if (provider === 'Klaviyo' && isKlaviyoReady()) {
          (window as any)._klOnsite.push(['track', 'Started Checkout', mockPayload]);
        }
        break;
        
      case 'identify':
        mockPayload.email = 'tes***@example.com';
        mockPayload.note = 'Identify requires real user - skipped in test mode';
        break;
    }
    
    logAnalyticsEvent(eventType, provider, mockPayload, true);
    return { success: true, payload: mockPayload };
  } catch (e) {
    const error = String(e);
    logAnalyticsEvent(eventType, provider, mockPayload, false, error);
    return { success: false, error, payload: mockPayload };
  }
}

/**
 * Funnel event truth table
 */
export const FUNNEL_EVENT_TABLE = [
  {
    event: 'page_view',
    description: 'Triggered on every route change',
    providers: ['Pinterest (pagevisit)', 'Clarity (auto)', 'Klaviyo (implicit)'],
    data: ['route', 'event_id'],
    location: 'App.tsx useEffect on location change',
    deduplication: 'None needed - unique per navigation',
  },
  {
    event: 'view_content',
    description: 'Product detail page viewed',
    providers: ['Klaviyo (trackViewedItem)', 'Pinterest (custom)'],
    data: ['product_id', 'title', 'price', 'sku', 'image_url'],
    location: 'Product pages (ErgonomicPillowProduct, etc.)',
    deduplication: 'None - each view is unique',
  },
  {
    event: 'add_to_cart',
    description: 'Product added to cart',
    providers: ['Klaviyo (Added to Cart)', 'Pinterest (addtocart)'],
    data: ['product_id', 'variant_id', 'value', 'currency', 'quantity'],
    location: 'cartStore.ts addItem()',
    deduplication: 'None - each add is unique',
  },
  {
    event: 'begin_checkout',
    description: 'Checkout initiated (button clicked)',
    providers: ['Pinterest (initiatecheckout)', 'Internal (checkout_initiated)'],
    data: ['order_quantity', 'event_id'],
    location: 'CartDrawer.tsx checkout button',
    deduplication: 'Cart fingerprint + 30s window (Pinterest)',
  },
  {
    event: 'purchase (client)',
    description: 'BLOCKED - Never fires from client',
    providers: ['None - blocked intentionally'],
    data: ['N/A'],
    location: 'N/A - see server webhook',
    deduplication: 'N/A',
  },
  {
    event: 'purchase (server)',
    description: 'Shopify order webhook → Supabase → Klaviyo/Pinterest',
    providers: ['Klaviyo (Placed Order)', 'Pinterest Conversions API'],
    data: ['order_id', 'value', 'currency', 'products', 'email'],
    location: 'supabase/functions/shopify-order-webhook',
    deduplication: 'order_id is canonical key',
  },
];
