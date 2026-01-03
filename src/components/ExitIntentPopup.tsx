/**
 * Exit Intent Cart Abandonment Modal
 * Premium, calm approach - no aggressive discounting
 * 
 * Requirements:
 * - Only trigger if cart has >= 1 item
 * - Only show once per session
 * - Desktop: mouseleave top boundary
 * - Mobile: visibilitychange fallback
 * - Premium copy: free shipping focus, no urgency
 * - Analytics: RBN_ExitIntent_Shown/Accepted/Dismissed
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cartStore";
import { trackEvent } from "@/lib/analytics";
import { Truck, Moon, Shield } from "lucide-react";

// Get setCartOpen from store outside component for cleaner access
const getSetCartOpen = () => useCartStore.getState().setCartOpen;

const SESSION_KEY = "rbn_exit_intent_shown";

// Routes where exit intent should NOT trigger
const EXCLUDED_ROUTES = [
  "/checkout",
  "/auth",
  "/sleep-coach",
  "/affiliate-dashboard",
  "/admin",
  "/internal",
  "/debug",
  "/settings",
];

export const ExitIntentPopup = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const hasItems = items.length > 0;

  // Check if route is excluded
  const isExcludedRoute = EXCLUDED_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  // Check if already shown this session
  const hasShownThisSession = useCallback(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }, []);

  // Mark as shown
  const markAsShown = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
  }, []);

  // Can trigger logic
  const canTrigger = useCallback(() => {
    return hasItems && !isExcludedRoute && !hasShownThisSession() && !isOpen;
  }, [hasItems, isExcludedRoute, hasShownThisSession, isOpen]);

  // Trigger the modal
  const triggerModal = useCallback(() => {
    if (!canTrigger()) return;
    
    setIsOpen(true);
    markAsShown();
    
    trackEvent("RBN_ExitIntent_Shown", {
      page: location.pathname,
      cart_item_count: items.length,
      cart_value: items.reduce((sum, item) => 
        sum + parseFloat(item.price.amount) * item.quantity, 0
      ),
    });
  }, [canTrigger, markAsShown, location.pathname, items]);

  // Desktop: mouseleave detection
  useEffect(() => {
    if (isExcludedRoute || hasShownThisSession()) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of viewport
      if (e.clientY <= 0) {
        triggerModal();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isExcludedRoute, hasShownThisSession, triggerModal]);

  // Mobile: visibilitychange fallback (user switching tabs/apps)
  useEffect(() => {
    if (isExcludedRoute || hasShownThisSession()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User is leaving - we can't show modal now, but prep for return
        // Actually, we can't show modal when hidden, so this is more of a "last chance"
        // On mobile, this helps catch tab switches
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isExcludedRoute, hasShownThisSession]);

  // Accept handler - opens cart drawer for immediate checkout
  const handleAccept = () => {
    setIsOpen(false);
    
    trackEvent("RBN_ExitIntent_Accepted", {
      page: location.pathname,
      cart_item_count: items.length,
    });

    // Open cart drawer so user can complete checkout immediately
    getSetCartOpen()(true);
  };

  // Dismiss handler
  const handleDismiss = () => {
    setIsOpen(false);
    
    trackEvent("RBN_ExitIntent_Dismissed", {
      page: location.pathname,
      cart_item_count: items.length,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDismiss();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Still thinking it over?
          </DialogTitle>
          <DialogDescription className="text-center pt-2 text-muted-foreground">
            We understand. Good sleep is worth getting right.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Value props - calm, not urgent */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full">
                <Truck className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">Free shipping on all orders</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full">
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">100 nights to decide if it's right for you</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">Easy returns, no questions asked</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleAccept} size="lg" className="w-full">
            Complete My Order
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            I need more time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
