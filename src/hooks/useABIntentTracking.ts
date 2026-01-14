/**
 * A/B Intent Tracking Hook
 * 
 * Reusable hook for tracking high-intent element interactions
 * Only fires on meaningful events (click, scroll_into_view)
 * 
 * Usage:
 *   const { trackClick, trackVisible, trackHover } = useABIntentTracking(testId);
 *   <button onClick={() => trackClick('cta_button')}>Add to Cart</button>
 */

import { useCallback, useRef, useEffect } from 'react';
import { trackIntentEvent, type ElementType } from '@/lib/abExperimentation';
import { getOrAssignVariant, getSessionId } from '@/lib/abTesting';

interface UseABIntentTrackingOptions {
  testId?: string;
  debounceMs?: number;
}

interface IntentTracker {
  /** Track a click on a high-intent element */
  trackClick: (elementType: ElementType, options?: { ledToAtc?: boolean }) => void;
  
  /** Track when element scrolls into view (once per session) */
  trackVisible: (elementType: ElementType, ref: React.RefObject<HTMLElement>) => void;
  
  /** Create an IntersectionObserver callback for visibility tracking */
  useVisibilityObserver: (elementType: ElementType) => (node: HTMLElement | null) => void;
  
  /** Current variant for conditional rendering */
  variant: 'A' | 'B';
  
  /** Current session ID */
  sessionId: string;
}

/**
 * Get the current active A/B test ID
 * Returns undefined if no active test
 */
async function getActiveTestId(): Promise<string | undefined> {
  // This would be cached in a real implementation
  // For now, return the test_id if provided, or undefined
  return undefined;
}

export function useABIntentTracking(options: UseABIntentTrackingOptions = {}): IntentTracker {
  const { testId, debounceMs = 500 } = options;
  
  const variant = getOrAssignVariant();
  const sessionId = getSessionId();
  
  // Track which elements have been tracked this session (to prevent spam)
  const trackedVisibility = useRef<Set<string>>(new Set());
  const lastClickTime = useRef<Record<string, number>>({});

  /**
   * Track a click event with debouncing
   */
  const trackClick = useCallback((
    elementType: ElementType, 
    clickOptions: { ledToAtc?: boolean } = {}
  ) => {
    const now = Date.now();
    const lastTime = lastClickTime.current[elementType] || 0;
    
    // Debounce rapid clicks
    if (now - lastTime < debounceMs) {
      return;
    }
    lastClickTime.current[elementType] = now;

    // Fire and forget - never block UI
    trackIntentEvent({
      test_id: testId,
      session_id: sessionId,
      ab_variant: variant,
      element_type: elementType,
      event_type: 'click',
      led_to_atc: clickOptions.ledToAtc ?? false,
      led_to_checkout: false,
      page_path: window.location.pathname,
    }).catch(() => {
      // Silent fail - tracking should never break UX
    });
  }, [testId, sessionId, variant, debounceMs]);

  /**
   * Track visibility using IntersectionObserver
   * Only fires once per element type per session
   */
  const trackVisible = useCallback((
    elementType: ElementType,
    ref: React.RefObject<HTMLElement>
  ) => {
    if (!ref.current) return;
    
    const key = `${elementType}-${testId || 'default'}`;
    if (trackedVisibility.current.has(key)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !trackedVisibility.current.has(key)) {
            trackedVisibility.current.add(key);
            
            trackIntentEvent({
              test_id: testId,
              session_id: sessionId,
              ab_variant: variant,
              element_type: elementType,
              event_type: 'scroll_into_view',
              led_to_atc: false,
              led_to_checkout: false,
              page_path: window.location.pathname,
            }).catch(() => {});
            
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 } // 50% visible
    );

    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [testId, sessionId, variant]);

  /**
   * Create a ref callback for visibility tracking
   * Usage: <div ref={useVisibilityObserver('price_section')} />
   */
  const useVisibilityObserver = useCallback((elementType: ElementType) => {
    return (node: HTMLElement | null) => {
      if (!node) return;
      
      const key = `${elementType}-${testId || 'default'}`;
      if (trackedVisibility.current.has(key)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !trackedVisibility.current.has(key)) {
              trackedVisibility.current.add(key);
              
              trackIntentEvent({
                test_id: testId,
                session_id: sessionId,
                ab_variant: variant,
                element_type: elementType,
                event_type: 'scroll_into_view',
                led_to_atc: false,
                led_to_checkout: false,
                page_path: window.location.pathname,
              }).catch(() => {});
              
              observer.disconnect();
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(node);
    };
  }, [testId, sessionId, variant]);

  return {
    trackClick,
    trackVisible,
    useVisibilityObserver,
    variant,
    sessionId,
  };
}

/**
 * Simple one-liner for tracking a click without hook
 * Use in event handlers where hooks aren't available
 */
export function trackElementClick(
  elementType: ElementType,
  options: { testId?: string; ledToAtc?: boolean } = {}
): void {
  const variant = getOrAssignVariant();
  const sessionId = getSessionId();

  trackIntentEvent({
    test_id: options.testId,
    session_id: sessionId,
    ab_variant: variant,
    element_type: elementType,
    event_type: 'click',
    led_to_atc: options.ledToAtc ?? false,
    led_to_checkout: false,
    page_path: window.location.pathname,
  }).catch(() => {});
}

/**
 * Mark that an ATC happened after an element interaction
 * Call this in your addToCart handler to attribute the conversion
 */
export async function markAtcConversion(sessionId: string): Promise<void> {
  // This would update recent events for this session to set led_to_atc = true
  // For now, we track it inline when the click happens
  console.log('[ABIntent] ATC conversion marked for session:', sessionId);
}
