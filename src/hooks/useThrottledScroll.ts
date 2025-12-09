import { useState, useEffect, useRef, useCallback } from "react";

interface ScrollState {
  isVisible: boolean;
  isAtTop: boolean;
}

/**
 * Throttled scroll hook for header visibility.
 * Uses requestAnimationFrame for efficient scroll handling.
 */
export function useThrottledScroll(): ScrollState {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Check if we're at the top
    const atTop = currentScrollY < 10;
    setIsAtTop(atTop);

    // Determine visibility
    if (atTop) {
      setIsVisible(true);
    } else if (currentScrollY < lastScrollY.current) {
      // Scrolling up - show header
      setIsVisible(true);
    } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      // Scrolling down past threshold - hide header
      setIsVisible(false);
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollState);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateScrollState]);

  return { isVisible, isAtTop };
}
