import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Cookie, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "rbn_cookie_consent";
const CONSENT_VERSION = "v1";

interface ConsentState {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
}

const defaultConsent: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  timestamp: Date.now(),
};

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ConsentState;
        // Check if consent version matches
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed);
          return; // Already consented, don't show banner
        }
      } catch {
        // Invalid stored data, show banner
      }
    }
    // Small delay to prevent flash
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (newConsent: ConsentState) => {
    const consentData = { ...newConsent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
    setConsent(consentData);
    setIsVisible(false);
    
    // Emit consent event for analytics
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: consentData }));
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  const handleRejectNonEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6",
        "bg-background/95 backdrop-blur-sm border-t shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm md:text-base">We value your privacy</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                Read our{" "}
                <Link to="/privacy-policy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>{" "}
                for more information.
              </p>
            </div>
          </div>
          <button 
            onClick={handleRejectNonEssential} 
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customize Panel */}
        {showCustomize && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Essential Cookies</p>
                <p className="text-xs text-muted-foreground">Required for the website to function</p>
              </div>
              <div className="text-xs text-muted-foreground">Always Active</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analytics Cookies</p>
                <p className="text-xs text-muted-foreground">Help us improve our website</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={consent.analytics}
                  onChange={(e) => setConsent(prev => ({ ...prev, analytics: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Marketing Cookies</p>
                <p className="text-xs text-muted-foreground">Used for targeted advertising</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={consent.marketing}
                  onChange={(e) => setConsent(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCustomize(!showCustomize)}
            className="order-3 sm:order-1"
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            {showCustomize ? "Hide Options" : "Customize"}
          </Button>
          
          {showCustomize ? (
            <Button 
              size="sm"
              onClick={handleSavePreferences}
              className="order-1 sm:order-2"
            >
              Save Preferences
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRejectNonEssential}
                className="order-2"
              >
                Essential Only
              </Button>
              <Button 
                size="sm"
                onClick={handleAcceptAll}
                className="order-1"
              >
                Accept All
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
