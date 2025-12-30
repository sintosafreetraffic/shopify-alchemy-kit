/**
 * Pinterest External ID Helper
 * 
 * Uses existing context_id from contextTracking.ts as external_id.
 * Ensures 100% coverage by always returning a hashed ID.
 * 
 * The context_id is already:
 * - Persisted to localStorage + cookie (30-day expiry)
 * - Used for CAPI enrichment via pinterest_context table
 * - Attached to Shopify orders via rbn_context_id note attribute
 */

import { getOrCreateContextId } from './contextTracking';

/**
 * SHA-256 hash for Pinterest external_id
 * Pinterest requires hashed external_id for privacy compliance
 */
export async function sha256Hash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get hashed external_id for Pinterest Tag
 * Uses context_id from contextTracking (already persistent across sessions)
 * 
 * @returns SHA-256 hashed context_id, or null if unavailable
 */
export async function getHashedExternalId(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    
    const contextId = getOrCreateContextId();
    if (!contextId) {
      console.warn('[Pinterest] No context_id available for external_id');
      return null;
    }
    
    const hashed = await sha256Hash(contextId);
    return hashed;
  } catch (e) {
    console.warn('[Pinterest] Failed to get hashed external_id:', e);
    return null;
  }
}
