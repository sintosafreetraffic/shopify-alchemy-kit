/**
 * Analytics Registry - Central hub for tracking providers
 * 
 * HARDENED:
 * - All providers wrapped in try/catch
 * - Consent-aware gating
 * - Never throws or blocks UI
 */

import { isTrackingAllowed } from './consent';
import { captureAttribution, hasAttributionParams } from './attribution';

// Provider readiness checks
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

// Safe Pinterest call wrapper - NEVER throws
export function safePintrk(command: string, eventName?: string, payload?: Record<string, any>): boolean {
  try {
    if (!isTrackingAllowed()) {
      console.log('[Pinterest] Tracking blocked by consent');
      return false;
    }
    
    if (!isPinterestReady()) {
      console.log('[Pinterest] Not ready, skipping:', command, eventName);
      return false;
    }
    
    const pintrk = (window as any).pintrk || (window as any).__pintrk_original;
    if (typeof pintrk !== 'function') return false;
    
    if (eventName) {
      pintrk(command, eventName, payload);
    } else {
      pintrk(command);
    }
    
    return true;
  } catch (e) {
    console.warn('[Pinterest] safePintrk error:', e);
    return false;
  }
}

// Track page view across all providers
export function trackPageView(route: string): void {
  try {
    // Capture attribution on every route change if URL has params
    if (hasAttributionParams()) {
      captureAttribution();
    }
    
    if (!isTrackingAllowed()) {
      console.log('[Analytics] Page view blocked by consent');
      return;
    }
    
    // Pinterest
    if (isPinterestReady()) {
      safePintrk('track', 'pagevisit', { event_id: `pv-${Date.now()}` });
    }
    
    // Clarity automatically tracks page views
    
  } catch (e) {
    console.warn('[Analytics] trackPageView error:', e);
  }
}

// Initialize all providers (consent-aware)
export function initializeProviders(): void {
  try {
    // Always capture attribution regardless of consent
    captureAttribution();
    
    if (!isTrackingAllowed()) {
      console.log('[Analytics] Provider init blocked by consent');
      return;
    }
    
    // Providers auto-initialize via their script tags
    console.log('[Analytics] Providers initialized');
  } catch (e) {
    console.warn('[Analytics] initializeProviders error:', e);
  }
}

// Check if any tracking is blocked (for diagnostics)
export function isTrackingBlocked(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return !isPinterestReady() && !isClarityReady();
  } catch {
    return true;
  }
}
