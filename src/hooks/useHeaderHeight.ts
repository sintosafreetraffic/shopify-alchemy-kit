import { useState, useLayoutEffect, useCallback } from "react";

/**
 * Measures the combined height of fixed header elements (banner + header).
 * Uses useLayoutEffect to prevent CLS by measuring before paint.
 */
export function useHeaderHeight() {
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    // Measure urgency banner (fixed at top)
    const banner = document.querySelector('[data-header-banner]');
    const header = document.querySelector('[data-header-main]');
    
    const bannerHeight = banner?.getBoundingClientRect().height ?? 0;
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    
    setHeight(bannerHeight + headerHeight);
  }, []);

  useLayoutEffect(() => {
    // Measure immediately
    measure();

    // Re-measure on resize (handles mobile text wrapping)
    window.addEventListener("resize", measure);
    
    // Also observe for DOM changes (in case banner hides/shows)
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [measure]);

  return height;
}
