/**
 * Social Proof Toast Notification
 * Shows privacy-safe "Someone in X just purchased Y" toasts
 * 
 * Requirements:
 * - Only show on PDP and cart routes (not checkout, quiz, coach)
 * - Max 3 toasts per session, min 45s apart
 * - First toast >= 20s after page load
 * - Privacy-safe: region-level location only, no names
 * - Premium copy: no urgency, no hype
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

interface SocialProofItem {
  region: string;
  product: string;
}

// Privacy-safe curated data (region-level only, no names)
const SOCIAL_PROOF_ITEMS: SocialProofItem[] = [
  { region: "North Holland", product: "The Ergonomic Sleep Pillow" },
  { region: "Stockholm", product: "The Ergonomic Sleep Pillow" },
  { region: "Bavaria", product: "The Sleep System Bundle" },
  { region: "Île-de-France", product: "The Ergonomic Sleep Pillow" },
  { region: "California", product: "The Knee Pillow" },
  { region: "Ontario", product: "The Ergonomic Sleep Pillow" },
  { region: "Greater London", product: "The Sleep Mask" },
  { region: "Catalonia", product: "The Ergonomic Sleep Pillow" },
];

// Routes where social proof is allowed
const ALLOWED_ROUTES = [
  "/product/ergonomic-pillow",
  "/product/knee-pillow",
  "/product/sleep-mask",
  "/product/sleep-bundle",
  "/product",
];

// Session storage keys
const SESSION_KEY_COUNT = "rbn_social_proof_count";
const SESSION_KEY_LAST = "rbn_social_proof_last_shown";

const MAX_TOASTS_PER_SESSION = 3;
const MIN_INTERVAL_MS = 45000; // 45 seconds
const FIRST_DELAY_MS = 20000; // 20 seconds
const DISPLAY_DURATION_MS = 5000; // 5 seconds

export const SocialProofNotification = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<SocialProofItem>(SOCIAL_PROOF_ITEMS[0]);
  const itemIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current route is allowed
  const isAllowedRoute = ALLOWED_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith("/product/")
  );

  // Get session count
  const getSessionCount = useCallback((): number => {
    const count = sessionStorage.getItem(SESSION_KEY_COUNT);
    return count ? parseInt(count, 10) : 0;
  }, []);

  // Get last shown timestamp
  const getLastShownTime = useCallback((): number => {
    const last = sessionStorage.getItem(SESSION_KEY_LAST);
    return last ? parseInt(last, 10) : 0;
  }, []);

  // Check if we can show a toast
  const canShowToast = useCallback((): boolean => {
    if (!isAllowedRoute) return false;
    
    const count = getSessionCount();
    if (count >= MAX_TOASTS_PER_SESSION) return false;
    
    const lastShown = getLastShownTime();
    const now = Date.now();
    if (lastShown && (now - lastShown) < MIN_INTERVAL_MS) return false;
    
    return true;
  }, [isAllowedRoute, getSessionCount, getLastShownTime]);

  // Show toast
  const showToast = useCallback(() => {
    if (!canShowToast()) return;

    // Get next item
    const nextIndex = itemIndexRef.current % SOCIAL_PROOF_ITEMS.length;
    const item = SOCIAL_PROOF_ITEMS[nextIndex];
    itemIndexRef.current = nextIndex + 1;
    
    setCurrentItem(item);
    setIsVisible(true);

    // Update session storage
    const newCount = getSessionCount() + 1;
    sessionStorage.setItem(SESSION_KEY_COUNT, newCount.toString());
    sessionStorage.setItem(SESSION_KEY_LAST, Date.now().toString());

    // Track event
    trackEvent("RBN_SocialProof_Shown", {
      page: location.pathname,
      product: item.product,
      region: item.region,
      source: "curated",
    });

    // Auto-hide after duration
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, DISPLAY_DURATION_MS);
  }, [canShowToast, getSessionCount, location.pathname]);

  // Schedule next toast
  const scheduleNextToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!canShowToast()) return;

    // Calculate delay
    const lastShown = getLastShownTime();
    const now = Date.now();
    const count = getSessionCount();
    
    let delay: number;
    if (count === 0) {
      // First toast: wait at least 20s
      delay = FIRST_DELAY_MS;
    } else {
      // Subsequent: random 45-90s from last shown
      const timeSinceLast = now - lastShown;
      const baseDelay = MIN_INTERVAL_MS - timeSinceLast;
      const randomExtra = Math.random() * 45000; // 0-45s extra
      delay = Math.max(1000, baseDelay + randomExtra);
    }

    timerRef.current = setTimeout(() => {
      showToast();
      // Schedule next one after this
      setTimeout(scheduleNextToast, 1000);
    }, delay);
  }, [canShowToast, getLastShownTime, getSessionCount, showToast]);

  // Effect: Start scheduling when on allowed route
  useEffect(() => {
    if (isAllowedRoute && canShowToast()) {
      scheduleNextToast();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isAllowedRoute, canShowToast, scheduleNextToast]);

  // Close handler
  const handleClose = () => {
    setIsVisible(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 z-50 animate-in slide-in-from-left duration-500 max-w-[320px]">
      <div className="bg-background border border-border shadow-lg rounded-lg p-4 flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full shrink-0">
          <ShoppingBag className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            Someone in <span className="font-medium">{currentItem.region}</span> just purchased
          </p>
          <p className="text-sm text-primary font-medium truncate">
            {currentItem.product}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
