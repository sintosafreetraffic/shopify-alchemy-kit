import { useState, useEffect, useCallback } from "react";

interface UseEmailPopupOptions {
  delay?: number;
  storageKey?: string;
  showOnScroll?: boolean;
  scrollThreshold?: number;
  exitIntent?: boolean;
}

export const useEmailPopup = (options: UseEmailPopupOptions = {}) => {
  const {
    delay = 30000,
    storageKey = "email_popup_dismissed",
    showOnScroll = true,
    scrollThreshold = 50,
    exitIntent = true,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  const isDismissed = useCallback(() => {
    if (typeof window === "undefined") return false;
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed < 7;
    }
    return false;
  }, [storageKey]);

  const openPopup = useCallback(() => {
    if (!hasBeenShown && !isDismissed()) {
      setIsOpen(true);
      setHasBeenShown(true);
      setShowTeaser(false);
    }
  }, [hasBeenShown, isDismissed]);

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setShowTeaser(true);
    localStorage.setItem(storageKey, new Date().toISOString());
  }, [storageKey]);

  const openFromTeaser = useCallback(() => {
    setIsOpen(true);
    setShowTeaser(false);
  }, []);

  // Exit intent detection (desktop only)
  useEffect(() => {
    if (!exitIntent || isDismissed() || hasBeenShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 0) {
        openPopup();
      }
    };

    document.addEventListener("mouseout", handleMouseLeave);
    return () => document.removeEventListener("mouseout", handleMouseLeave);
  }, [exitIntent, openPopup, isDismissed, hasBeenShown]);

  // Scroll depth detection (mobile fallback)
  useEffect(() => {
    if (!showOnScroll || isDismissed() || hasBeenShown) return;
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= scrollThreshold) {
        openPopup();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showOnScroll, scrollThreshold, openPopup, isDismissed, hasBeenShown]);

  // Fallback time-based trigger
  useEffect(() => {
    if (isDismissed() || hasBeenShown) return;

    const timer = setTimeout(openPopup, delay);
    return () => clearTimeout(timer);
  }, [delay, openPopup, isDismissed, hasBeenShown]);

  return { isOpen, showTeaser, openPopup, closePopup, openFromTeaser };
};
