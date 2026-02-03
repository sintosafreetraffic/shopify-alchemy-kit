/**
 * Pillow Focus Preference - localStorage Persistence
 * 
 * Stores and retrieves user's pillow focus preference (neck vs back).
 * Uses first-touch model: only sets preference if not already stored.
 * 
 * This ensures consistent user journey:
 * - User lands on /products/back-pain-pillow → preference set to "back"
 * - User navigates to homepage, clicks pillow → returns to back pain variant
 */

import { PillowFocus, getDefaultFocus } from '@/config/pillowFocusContent';

const STORAGE_KEY = 'pillow_focus_preference';

/**
 * Get the stored pillow focus preference
 * Returns the default if none is stored
 */
export function getPillowFocusPreference(): PillowFocus {
  if (typeof window === 'undefined') return getDefaultFocus();
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'neck' || stored === 'back') {
    return stored;
  }
  return getDefaultFocus();
}

/**
 * Set the pillow focus preference
 * Uses first-touch model: only sets if not already stored
 * 
 * @param focus - The focus variant to store
 * @param force - If true, override existing preference (default: false)
 */
export function setPillowFocusPreference(focus: PillowFocus, force = false): void {
  if (typeof window === 'undefined') return;
  
  const existing = localStorage.getItem(STORAGE_KEY);
  
  // First-touch model: only set if not already stored (or if forced)
  if (!existing || force) {
    localStorage.setItem(STORAGE_KEY, focus);
  }
}

/**
 * Clear the pillow focus preference
 * Useful for testing or admin reset
 */
export function clearPillowFocusPreference(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the preferred pillow product route based on stored preference
 */
export function getPreferredPillowRoute(): string {
  const focus = getPillowFocusPreference();
  return focus === 'back' ? '/products/back-pain-pillow' : '/products/ergonomic-pillow';
}
