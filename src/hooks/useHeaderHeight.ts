import { useState, useLayoutEffect, useRef } from "react";

/**
 * Measures the combined height of fixed header elements (banner + header).
 * Uses ResizeObserver for efficient, jank-free updates.
 * RAF-throttled to collapse multiple triggers into one measurement per frame.
 */
export function useHeaderHeight() {
  const [height, setHeight] = useState(0);
  const rafId = useRef<number | null>(null);
  const lastHeight = useRef(0);

  useLayoutEffect(() => {
    const banner = document.querySelector('[data-header-banner]') as HTMLElement | null;
    const header = document.querySelector('[data-header-main]') as HTMLElement | null;

    // RAF-throttled measurement - collapses multiple triggers into one per frame
    const scheduleMeasure = () => {
      if (rafId.current !== null) return; // Already scheduled
      
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        
        const bannerHeight = banner?.offsetHeight ?? 0;
        const headerHeight = header?.offsetHeight ?? 0;
        const total = bannerHeight + headerHeight;
        
        // Only update state if height actually changed
        if (total !== lastHeight.current) {
          lastHeight.current = total;
          setHeight(total);
        }
      });
    };

    // Initial measurement (synchronous for first paint)
    const bannerHeight = banner?.offsetHeight ?? 0;
    const headerHeight = header?.offsetHeight ?? 0;
    const initialTotal = bannerHeight + headerHeight;
    lastHeight.current = initialTotal;
    setHeight(initialTotal);

    // ResizeObserver for efficient size change detection
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    
    if (banner) resizeObserver.observe(banner);
    if (header) resizeObserver.observe(header);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return height;
}
