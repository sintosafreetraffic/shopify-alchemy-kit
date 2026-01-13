/**
 * useABVariant Hook
 * 
 * React hook for A/B testing variant assignment and tracking.
 * Ensures variant is assigned early and consistently across renders.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getOrAssignVariant, 
  trackABEvent,
  setClarityVariantTag,
  AB_TEST_CONFIG,
  type ABVariant,
  type ABEventName,
} from '@/lib/abTesting';

interface UseABVariantReturn {
  /** Current assigned variant */
  variant: ABVariant;
  /** Whether variant B (urgency) is active */
  isVariantB: boolean;
  /** Whether A/B testing is enabled */
  isEnabled: boolean;
  /** Track an event with variant automatically included */
  trackEvent: (eventName: ABEventName, revenue?: number, payload?: Record<string, unknown>) => void;
  /** Loading state (false once variant is determined) */
  isReady: boolean;
}

/**
 * Hook to get A/B variant and track events
 * 
 * Usage:
 * ```tsx
 * const { variant, isVariantB, trackEvent } = useABVariant();
 * 
 * if (isVariantB) {
 *   // Render urgency elements
 * }
 * 
 * trackEvent('add_to_cart', 59.99);
 * ```
 */
export function useABVariant(): UseABVariantReturn {
  // Get variant immediately (synchronous, from cookie/localStorage)
  // This ensures no flicker - variant is known before first render
  const [variant] = useState<ABVariant>(() => getOrAssignVariant());
  const [isReady, setIsReady] = useState(false);

  // Set Clarity tag on mount
  useEffect(() => {
    setClarityVariantTag();
    setIsReady(true);
  }, []);

  // Memoized track function
  const trackEvent = useCallback(
    (eventName: ABEventName, revenue?: number, payload?: Record<string, unknown>) => {
      trackABEvent({ eventName, revenue, payload });
    },
    []
  );

  // Derived values
  const isVariantB = useMemo(() => variant === 'B', [variant]);
  const isEnabled = useMemo(() => AB_TEST_CONFIG.enabled, []);

  return {
    variant,
    isVariantB,
    isEnabled,
    trackEvent,
    isReady,
  };
}

/**
 * Hook specifically for product pages
 * Automatically tracks page_view on mount
 */
export function useProductABVariant(productHandle: string): UseABVariantReturn {
  const abState = useABVariant();
  
  // Track page view on mount (once)
  useEffect(() => {
    if (abState.isReady) {
      abState.trackEvent('page_view', undefined, { 
        productHandle,
        page: 'product',
      });
    }
  }, [abState.isReady, productHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  return abState;
}
