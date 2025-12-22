/**
 * Analytics Registry - Central hub for tracking providers
 * 
 * HARDENED:
 * - All providers wrapped in try/catch
 * - Consent-aware gating
 * - Never throws or blocks UI
 * - Preserves full diagnostic API for AnalyticsDiagnostics.tsx
 */

import { isTrackingAllowed } from './consent';
import { captureAttribution, hasAttributionParams } from './attribution';

// ============================================================================
// TYPES - Exported for AnalyticsDiagnostics.tsx
// ============================================================================

export interface ProviderStatus {
  name: string;
  initialized: boolean;
  scriptLoaded: boolean;
  lastEventAt: string | null;
  lastRoute: string | null;
  blockers: string[];
}

export interface EventLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  eventName: string;
  provider: string;
  payload: Record<string, any>;
  success: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const FUNNEL_EVENT_TABLE = [
  { event: 'pagevisit', providers: ['Pinterest'], data: ['event_id'], location: 'analyticsRegistry.ts', deduplication: 'None' },
  { event: 'addtocart', providers: ['Pinterest', 'Klaviyo'], data: ['product_id', 'value', 'quantity'], location: 'pinterest.ts / klaviyo.ts', deduplication: 'None' },
  { event: 'initiatecheckout', providers: ['Pinterest'], data: ['event_id', 'order_quantity'], location: 'pinterest.ts', deduplication: '30s fingerprint (sessionStorage)' },
  { event: 'purchase', providers: ['Pinterest (CAPI)'], data: ['order_id', 'value', 'products', 'epik'], location: 'shopify-order-webhook → pinterest-track → Render', deduplication: 'order_id (Render handles)' },
  { event: 'lead', providers: ['Pinterest', 'Klaviyo'], data: ['lead_type'], location: 'pinterest.ts / klaviyo.ts', deduplication: 'None' },
  { event: 'signup', providers: ['Pinterest'], data: ['event_id'], location: 'pinterest.ts', deduplication: 'None' },
] as const;

// ============================================================================
// STATE - In-memory event log (last 50 events)
// ============================================================================

const MAX_EVENT_LOG_SIZE = 50;
let eventLog: EventLogEntry[] = [];
const providerLastRoute: Record<string, string> = {};
const providerLastEvent: Record<string, string> = {};

// ============================================================================
// PROVIDER READINESS CHECKS
// ============================================================================

export function isKlaviyoReady(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return Array.isArray((window as any)._klOnsite);
  } catch {
    return false;
  }
}

export function isPinterestReady(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
    return typeof pintrk === 'function';
  } catch {
    return false;
  }
}

export function isClarityReady(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).clarity === 'function';
  } catch {
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS - Exported for AnalyticsDiagnostics.tsx
// ============================================================================

export function getEnvironment(): string {
  try {
    if (typeof window === 'undefined') return 'ssr';
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    if (hostname.includes('preview') || hostname.includes('staging')) return 'staging';
    return 'production';
  } catch {
    return 'unknown';
  }
}

export function areScriptsLoaded(): boolean {
  return isPinterestReady() || isClarityReady() || isKlaviyoReady();
}

// ============================================================================
// EVENT LOG MANAGEMENT
// ============================================================================

function logAnalyticsEvent(
  eventType: string,
  provider: string,
  payload: Record<string, any>,
  success: boolean,
  error?: string
): void {
  try {
    const entry: EventLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      eventType,
      eventName: eventType, // Alias for backward compatibility
      provider,
      payload,
      success,
      error,
    };
    
    eventLog = [entry, ...eventLog].slice(0, MAX_EVENT_LOG_SIZE);
    
    // Update provider tracking
    providerLastEvent[provider] = entry.timestamp;
  } catch {
    // Never throw from logging
  }
}

export function getEventLog(): EventLogEntry[] {
  return [...eventLog];
}

export function clearEventLog(): void {
  eventLog = [];
}

// ============================================================================
// PROVIDER STATUS
// ============================================================================

function getProviderBlockers(name: string): string[] {
  const blockers: string[] = [];
  
  try {
    if (!isTrackingAllowed()) {
      blockers.push('Consent not granted');
    }
    
    if (name === 'Pinterest' && !isPinterestReady()) {
      blockers.push('Pinterest tag not loaded (ad-blocker?)');
    }
    
    if (name === 'Klaviyo' && !isKlaviyoReady()) {
      blockers.push('Klaviyo script not loaded');
    }
    
    if (name === 'Clarity' && !isClarityReady()) {
      blockers.push('Clarity script not loaded');
    }
  } catch {
    blockers.push('Error checking status');
  }
  
  return blockers;
}

export function getAllProviderStatuses(): ProviderStatus[] {
  const providers = ['Pinterest', 'Klaviyo', 'Clarity'];
  
  return providers.map(name => {
    let initialized = false;
    let scriptLoaded = false;
    
    try {
      if (name === 'Pinterest') {
        scriptLoaded = isPinterestReady();
        initialized = scriptLoaded;
      } else if (name === 'Klaviyo') {
        scriptLoaded = isKlaviyoReady();
        initialized = scriptLoaded;
      } else if (name === 'Clarity') {
        scriptLoaded = isClarityReady();
        initialized = scriptLoaded;
      }
    } catch {
      // Leave as false
    }
    
    return {
      name,
      initialized,
      scriptLoaded,
      lastEventAt: providerLastEvent[name] || null,
      lastRoute: providerLastRoute[name] || null,
      blockers: getProviderBlockers(name),
    };
  });
}

// ============================================================================
// SAFE PINTEREST WRAPPER - NEVER throws
// ============================================================================

export function safePintrk(command: string, eventName?: string, payload?: Record<string, any>): boolean {
  try {
    // Check consent ONLY for tracking events
    if (command === 'track' && !isTrackingAllowed()) {
      logAnalyticsEvent(eventName || command, 'Pinterest', payload || {}, false, 'Consent denied');
      return false;
    }
    
    if (!isPinterestReady()) {
      logAnalyticsEvent(eventName || command, 'Pinterest', payload || {}, false, 'Not ready');
      return false;
    }
    
    const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
    if (typeof pintrk !== 'function') return false;
    
    if (eventName !== undefined) {
      pintrk(command, eventName, payload);
    } else if (payload !== undefined) {
      pintrk(command, payload);
    } else {
      pintrk(command);
    }
    
    logAnalyticsEvent(eventName || command, 'Pinterest', payload || {}, true);
    return true;
  } catch (e) {
    logAnalyticsEvent(eventName || command, 'Pinterest', payload || {}, false, String(e));
    return false;
  }
}

// ============================================================================
// TRACK PAGE VIEW
// ============================================================================

export function trackPageView(route: string): void {
  try {
    // Always capture attribution on route changes with params (regardless of consent)
    if (hasAttributionParams()) {
      captureAttribution();
    }
    
    const timestamp = new Date().toISOString();
    
    // Klaviyo - no explicit page view, but track route
    if (isKlaviyoReady()) {
      providerLastRoute['Klaviyo'] = route;
      providerLastEvent['Klaviyo'] = timestamp;
      logAnalyticsEvent('page_view', 'Klaviyo', { route }, true);
    }
    
    // Pinterest - track SPA navigation (consent-gated)
    if (isPinterestReady() && isTrackingAllowed()) {
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
  } catch (e) {
    // Never throw
    console.warn('[Analytics] trackPageView error:', e);
  }
}

// ============================================================================
// TEST EVENTS - For AnalyticsDiagnostics.tsx
// ============================================================================

export function sendTestEvent(
  eventType: 'page_view' | 'add_to_cart' | 'begin_checkout' | 'identify',
  provider: string
): { success: boolean; error?: string } {
  try {
    if (provider === 'Pinterest') {
      if (!isPinterestReady()) {
        return { success: false, error: 'Pinterest not ready' };
      }
      
      const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
      
      if (eventType === 'page_view') {
        pintrk('track', 'pagevisit', { event_id: `test-pv-${Date.now()}` });
      } else if (eventType === 'add_to_cart') {
        pintrk('track', 'addtocart', { event_id: `test-atc-${Date.now()}`, product_id: 'TEST-123', value: 0.01, currency: 'USD' });
      } else if (eventType === 'begin_checkout') {
        pintrk('track', 'initiatecheckout', { event_id: `test-ic-${Date.now()}`, order_quantity: 1 });
      }
      
      logAnalyticsEvent(eventType, provider, { test: true }, true);
      return { success: true };
    }
    
    if (provider === 'Klaviyo') {
      if (!isKlaviyoReady()) {
        return { success: false, error: 'Klaviyo not ready' };
      }
      
      const kl = (window as any)._klOnsite;
      
      if (eventType === 'add_to_cart') {
        kl.push(['track', 'Added to Cart', { ProductID: 'TEST-123', ProductName: 'Test Product', Price: 0.01 }]);
      } else if (eventType === 'begin_checkout') {
        kl.push(['track', 'Started Checkout', { ItemCount: 1, Value: 0.01 }]);
      } else if (eventType === 'identify') {
        kl.push(['identify', { $email: 'test@example.com' }]);
      }
      
      logAnalyticsEvent(eventType, provider, { test: true }, true);
      return { success: true };
    }
    
    if (provider === 'Clarity') {
      if (!isClarityReady()) {
        return { success: false, error: 'Clarity not ready' };
      }
      
      // Clarity auto-tracks, just log it
      logAnalyticsEvent(eventType, provider, { test: true }, true);
      return { success: true };
    }
    
    return { success: false, error: 'Unknown provider' };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeProviders(): void {
  try {
    // Always capture attribution regardless of consent (first-party storage)
    captureAttribution();
    
    if (!isTrackingAllowed()) {
      console.log('[Analytics] Provider init blocked by consent');
      return;
    }
    
    console.log('[Analytics] Providers initialized');
  } catch (e) {
    console.warn('[Analytics] initializeProviders error:', e);
  }
}

export function isTrackingBlocked(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return !isPinterestReady() && !isClarityReady() && !isKlaviyoReady();
  } catch {
    return true;
  }
}
