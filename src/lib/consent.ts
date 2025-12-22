/**
 * Consent management utility
 * Provides consent-aware gating for tracking providers
 * 
 * Default: consent granted (for regions without consent requirements)
 * Integrates with existing consent mechanisms if present
 */

export type ConsentStatus = 'granted' | 'denied' | 'pending';

// Storage key for consent
const CONSENT_STORAGE_KEY = 'tracking_consent';

/**
 * Get current consent status
 * Checks for existing consent mechanisms or stored preference
 */
export function getConsentStatus(): ConsentStatus {
  try {
    if (typeof window === 'undefined') return 'granted';
    
    // Check for stored consent preference
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === 'denied') return 'denied';
    if (stored === 'granted') return 'granted';
    
    // Check for common consent management platforms
    // OneTrust
    if ((window as any).OneTrust?.GetDomainData) {
      const otData = (window as any).OneTrust.GetDomainData();
      if (otData?.Groups) {
        const perfGroup = otData.Groups.find((g: any) => g.GroupId === 'C0002');
        if (perfGroup && !perfGroup.Status) return 'denied';
      }
    }
    
    // Cookiebot
    if ((window as any).Cookiebot?.consent) {
      if (!(window as any).Cookiebot.consent.statistics) return 'denied';
    }
    
    // Default to granted for non-regulated regions
    return 'granted';
  } catch {
    // On error, default to granted to not break tracking
    return 'granted';
  }
}

/**
 * Check if tracking is allowed based on consent
 */
export function isTrackingAllowed(): boolean {
  return getConsentStatus() === 'granted';
}

/**
 * Set consent preference (for custom consent UI)
 */
export function setConsent(status: 'granted' | 'denied'): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Silent fail
  }
}

/**
 * Listen for consent changes (for OneTrust, Cookiebot, etc.)
 */
export function onConsentChange(callback: (status: ConsentStatus) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  // OneTrust consent change
  const handleOneTrust = () => {
    callback(getConsentStatus());
  };
  
  // Cookiebot consent change
  const handleCookiebot = () => {
    callback(getConsentStatus());
  };
  
  window.addEventListener('OneTrustGroupsUpdated', handleOneTrust);
  window.addEventListener('CookiebotOnAccept', handleCookiebot);
  window.addEventListener('CookiebotOnDecline', handleCookiebot);
  
  return () => {
    window.removeEventListener('OneTrustGroupsUpdated', handleOneTrust);
    window.removeEventListener('CookiebotOnAccept', handleCookiebot);
    window.removeEventListener('CookiebotOnDecline', handleCookiebot);
  };
}
