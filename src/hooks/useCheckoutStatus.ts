import { useState, useCallback, useRef } from "react";

export interface CheckoutStatus {
  isCheckingOut: boolean;
  checkoutStartTime: number | null;
  error: string | null;
}

export function useCheckoutStatus() {
  const [status, setStatus] = useState<CheckoutStatus>({
    isCheckingOut: false,
    checkoutStartTime: null,
    error: null,
  });
  
  // Prevent multiple simultaneous checkout attempts
  const checkoutInProgress = useRef(false);

  const startCheckout = useCallback(() => {
    if (checkoutInProgress.current) {
      return false; // Already in progress, prevent duplicate
    }
    checkoutInProgress.current = true;
    setStatus({
      isCheckingOut: true,
      checkoutStartTime: Date.now(),
      error: null,
    });
    return true;
  }, []);

  const endCheckout = useCallback((error?: string) => {
    checkoutInProgress.current = false;
    setStatus({
      isCheckingOut: false,
      checkoutStartTime: null,
      error: error || null,
    });
  }, []);

  const resetError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...status,
    startCheckout,
    endCheckout,
    resetError,
    isInProgress: checkoutInProgress.current,
  };
}
