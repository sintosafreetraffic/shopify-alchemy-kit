/**
 * PDP Intent Tracking Hook - Production A/B Platform Integration
 * 
 * Simplified hook for tracking high-intent PDP elements.
 * Wraps useABIntentTracking with PDP-specific defaults and helpers.
 * 
 * Usage:
 *   const { trackATC, trackBenefitsVisible, atcRef, priceRef } = usePDPIntentTracking();
 *   <button ref={atcRef} onClick={trackATC}>Add to Cart</button>
 */

import { useRef, useCallback, useEffect } from 'react';
import { useABIntentTracking, trackElementClick } from './useABIntentTracking';
import type { ElementType } from '@/lib/abExperimentation';

interface UsePDPIntentTrackingOptions {
  /** Active test ID (optional - if not provided, events are still tracked for baseline) */
  testId?: string;
  /** Product handle for attribution */
  productHandle?: string;
}

export function usePDPIntentTracking(options: UsePDPIntentTrackingOptions = {}) {
  const { testId, productHandle } = options;
  const { trackClick, useVisibilityObserver, variant, sessionId } = useABIntentTracking({ testId });
  
  // Refs for visibility tracking
  const priceRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLElement>(null);
  const reviewsRef = useRef<HTMLElement>(null);
  const urgencyRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);

  // Track Add to Cart click - fire and forget
  const trackATC = useCallback((options?: { productId?: string; value?: number }) => {
    trackClick('cta_button', { ledToAtc: true });
  }, [trackClick]);

  // Track Sticky ATC click
  const trackStickyATC = useCallback(() => {
    trackClick('sticky_atc', { ledToAtc: true });
  }, [trackClick]);

  // Track price section hover/engagement
  const trackPriceEngagement = useCallback(() => {
    trackClick('price_section');
  }, [trackClick]);

  // Track benefits click/expansion
  const trackBenefitsClick = useCallback(() => {
    trackClick('benefits');
  }, [trackClick]);

  // Track urgency element interaction
  const trackUrgencyInteraction = useCallback(() => {
    trackClick('urgency');
  }, [trackClick]);

  // Track reviews scroll/click
  const trackReviewsInteraction = useCallback(() => {
    trackClick('reviews');
  }, [trackClick]);

  // Track gallery interaction (thumbnail click, zoom, etc.)
  const trackGalleryInteraction = useCallback(() => {
    trackClick('gallery');
  }, [trackClick]);

  // Track hero props interaction
  const trackHeroInteraction = useCallback(() => {
    trackClick('hero_props');
  }, [trackClick]);

  // Visibility observers for auto-tracking
  const priceVisibilityRef = useVisibilityObserver('price_section');
  const benefitsVisibilityRef = useVisibilityObserver('benefits');
  const reviewsVisibilityRef = useVisibilityObserver('reviews');
  const urgencyVisibilityRef = useVisibilityObserver('urgency');
  const heroVisibilityRef = useVisibilityObserver('hero_props');
  const galleryVisibilityRef = useVisibilityObserver('gallery');

  return {
    // Current variant for conditional rendering
    variant,
    sessionId,
    
    // Click trackers
    trackATC,
    trackStickyATC,
    trackPriceEngagement,
    trackBenefitsClick,
    trackUrgencyInteraction,
    trackReviewsInteraction,
    trackGalleryInteraction,
    trackHeroInteraction,
    
    // Visibility refs - attach to elements for auto scroll-into-view tracking
    priceVisibilityRef,
    benefitsVisibilityRef,
    reviewsVisibilityRef,
    urgencyVisibilityRef,
    heroVisibilityRef,
    galleryVisibilityRef,
    
    // Legacy refs (if needed)
    priceRef,
    benefitsRef,
    reviewsRef,
    urgencyRef,
    heroRef,
    galleryRef,
  };
}

/**
 * One-liner for tracking ATC in any context (no hook needed)
 * Use when you can't use hooks (e.g., in event handlers outside React)
 */
export function trackATCClick(testId?: string): void {
  trackElementClick('cta_button', { testId, ledToAtc: true });
}

/**
 * Track sticky bar ATC
 */
export function trackStickyATCClick(testId?: string): void {
  trackElementClick('sticky_atc', { testId, ledToAtc: true });
}

/**
 * Wrap an existing onClick handler with ATC tracking
 * Preserves original handler behavior while adding tracking
 */
export function withATCTracking<T extends (...args: unknown[]) => unknown>(
  handler: T,
  testId?: string
): T {
  return ((...args: unknown[]) => {
    // Fire and forget tracking
    trackElementClick('cta_button', { testId, ledToAtc: true });
    // Execute original handler
    return handler(...args);
  }) as T;
}
