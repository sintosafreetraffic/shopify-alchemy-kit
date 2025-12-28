import { useCallback, useRef, useEffect } from "react";

// Stable session ID for popup tracking (persists across page loads)
const getOrCreateSessionId = (): string => {
  const key = "rbn_klaviyo_session_id";
  
  // Try localStorage first (persists across tabs/sessions)
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    // Fallback to sessionStorage (cleared when browser closes)
    sessionId = sessionStorage.getItem(key);
  }
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = `kf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store in both for resilience
    try {
      localStorage.setItem(key, sessionId);
    } catch {
      // localStorage might be blocked
    }
    try {
      sessionStorage.setItem(key, sessionId);
    } catch {
      // sessionStorage might be blocked
    }
  }
  
  return sessionId;
};

interface TrackEventOptions {
  formId?: string;
  meta?: Record<string, unknown>;
}

interface UseKlaviyoPopupTrackingReturn {
  trackView: (options?: TrackEventOptions) => Promise<void>;
  trackSubmit: (options?: TrackEventOptions) => Promise<void>;
  trackDismiss: (options?: TrackEventOptions) => Promise<void>;
  sessionId: string;
}

/**
 * Hook for tracking Klaviyo popup events with proper deduplication
 * Events are tracked via edge function with unique constraint per session/form/event
 */
export function useKlaviyoPopupTracking(): UseKlaviyoPopupTrackingReturn {
  const sessionId = useRef<string>(getOrCreateSessionId());
  const hasTrackedView = useRef<boolean>(false);

  const trackEvent = useCallback(async (
    eventType: "viewed" | "submitted" | "dismissed",
    options?: TrackEventOptions
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[klaviyo-popup-tracking] Missing Supabase config");
      return;
    }

    // Build meta object with context
    const meta: Record<string, unknown> = {
      ...(options?.meta || {}),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      // UTM params if present
      ...Object.fromEntries(
        new URLSearchParams(window.location.search)
          .entries()
      ),
    };

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/track-klaviyo-form-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          session_id: sessionId.current,
          event_type: eventType,
          form_id: options?.formId || "email_popup",
          page_path: window.location.pathname,
          meta,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("[klaviyo-popup-tracking] Track failed:", errorText);
        return;
      }

      const result = await response.json();
      
      if (import.meta.env.DEV) {
        console.log("[klaviyo-popup-tracking]", eventType, result.deduped ? "(deduped)" : "(new)");
      }
    } catch (error) {
      // Silent fail in production, log in dev
      if (import.meta.env.DEV) {
        console.warn("[klaviyo-popup-tracking] Error:", error);
      }
    }
  }, []);

  const trackView = useCallback(async (options?: TrackEventOptions) => {
    // Prevent duplicate view tracking in same component lifecycle
    if (hasTrackedView.current) {
      return;
    }
    hasTrackedView.current = true;
    await trackEvent("viewed", options);
  }, [trackEvent]);

  const trackSubmit = useCallback(async (options?: TrackEventOptions) => {
    await trackEvent("submitted", options);
  }, [trackEvent]);

  const trackDismiss = useCallback(async (options?: TrackEventOptions) => {
    await trackEvent("dismissed", options);
  }, [trackEvent]);

  // Reset view tracking flag when component unmounts
  useEffect(() => {
    return () => {
      hasTrackedView.current = false;
    };
  }, []);

  return {
    trackView,
    trackSubmit,
    trackDismiss,
    sessionId: sessionId.current,
  };
}
