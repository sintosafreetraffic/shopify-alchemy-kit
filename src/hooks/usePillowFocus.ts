/**
 * usePillowFocus Hook
 * 
 * React hook for managing pillow focus preference.
 * Automatically captures preference on product page mount.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PillowFocus } from '@/config/pillowFocusContent';
import { 
  getPillowFocusPreference, 
  setPillowFocusPreference,
  getPreferredPillowRoute 
} from '@/lib/pillowFocusPreference';

/**
 * Hook to capture and manage pillow focus preference
 * 
 * @param currentFocus - The focus of the current page (neck or back)
 * @returns The user's pillow focus preference
 */
export function usePillowFocus(currentFocus?: PillowFocus) {
  const location = useLocation();
  
  // Capture preference on mount based on current page
  useEffect(() => {
    if (currentFocus) {
      // First-touch model: only set if not already stored
      setPillowFocusPreference(currentFocus);
    }
  }, [currentFocus]);
  
  return {
    preference: getPillowFocusPreference(),
    preferredRoute: getPreferredPillowRoute(),
  };
}

/**
 * Hook specifically for components that need to link to the pillow product
 * (e.g., homepage product cards, navigation)
 */
export function usePillowProductLink() {
  return getPreferredPillowRoute();
}
