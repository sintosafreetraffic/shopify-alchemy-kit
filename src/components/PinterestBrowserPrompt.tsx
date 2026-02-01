/**
 * Pinterest In-App Browser Detection & Prompt
 * 
 * Pinterest's in-app browser has known issues with:
 * - JavaScript execution delays
 * - Checkout popup blocking
 * - Session/cookie handling
 * - React hydration timing
 * 
 * This component detects Pinterest WebView and prompts users to open in their default browser.
 */

import { useState, useEffect } from "react";
import { X, ExternalLink, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

// Detect Pinterest in-app browser from user agent
function isPinterestInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Pinterest iOS: "Pinterest/iOS" in user agent
  // Pinterest Android: "[Pinterest/Android]" in user agent
  // Also check for generic webview indicators when coming from Pinterest
  const isPinterestUA = ua.includes("pinterest");
  const isWebView = ua.includes("wv") || ua.includes("webview");
  
  // Check referrer as backup
  const referrer = document.referrer?.toLowerCase() || "";
  const fromPinterest = referrer.includes("pinterest") || 
    new URLSearchParams(window.location.search).has("epik");
  
  // Consider it Pinterest in-app if:
  // 1. User agent explicitly says Pinterest
  // 2. It's a webview coming from Pinterest referrer/params
  return isPinterestUA || (isWebView && fromPinterest);
}

// Get the "open in browser" URL (works on both iOS and Android)
function getOpenInBrowserUrl(): string {
  // For iOS: intent URLs don't work, but we can provide the URL to copy
  // For Android: We could use intent:// but most users prefer direct URL
  return window.location.href;
}

export function PinterestBrowserPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("pinterest_prompt_dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }
    
    // Only show for Pinterest in-app browser users
    if (isPinterestInAppBrowser()) {
      // Small delay to let page render first
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem("pinterest_prompt_dismissed", "1");
  };
  
  const handleOpenInBrowser = async () => {
    const url = getOpenInBrowserUrl();
    
    // Try to copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API may not be available in webview
    }
    
    // Attempt to open in default browser
    // On Android, this may work. On iOS, it usually opens in Safari.
    window.open(url, "_blank");
    
    handleDismiss();
  };
  
  if (!isVisible || isDismissed) return null;
  
  return (
    <div className="fixed inset-x-0 bottom-20 z-[200] px-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-md rounded-xl bg-card border shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Chrome className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              For the best experience
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Open this page in your browser for faster loading and easier checkout.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm"
                onClick={handleOpenInBrowser}
                className="flex-1"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open in Browser
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Continue Here
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
