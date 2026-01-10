import { useParams, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";

/**
 * Maps Shopify product handles (used by Klaviyo, emails, etc.) to internal route handles.
 * This ensures external integrations work seamlessly with our custom product pages.
 * 
 * HOW TO ADD FUTURE PRODUCTS:
 * 1. Get the Shopify handle from your product
 * 2. Add patterns to HANDLE_PATTERNS array below
 * 3. Ensure the corresponding route exists in App.tsx
 */

// Pattern-based matching for more flexible handle resolution
const HANDLE_PATTERNS: Array<{ patterns: RegExp[]; internalHandle: string }> = [
  {
    // Complete Sleep Bundle - matches various formats with ™ or without
    patterns: [
      /^rise[-\s]?by[-\s]?night[™\u2122]?[-\s]?complete[-\s]?sleep[-\s]?bundle$/i,
      /^complete[-\s]?sleep[-\s]?bundle$/i,
    ],
    internalHandle: "sleep-bundle",
  },
  {
    // Ergonomic Sleep Pillow
    patterns: [
      /^rise[-\s]?by[-\s]?night[-\s]?ergonomic[-\s]?sleep[-\s]?pillow$/i,
      /^risebynight[-\s]?ergonomic[-\s]?sleep[-\s]?pillow$/i,
      /^ergonomic[-\s]?sleep[-\s]?pillow$/i,
    ],
    internalHandle: "ergonomic-pillow",
  },
  {
    // Ergonomic Knee Pillow
    patterns: [
      /^rise[-\s]?by[-\s]?night[-\s]?ergonomic[-\s]?knee[-\s]?pillow$/i,
      /^risebynight[-\s]?ergonomic[-\s]?knee[-\s]?pillow$/i,
      /^ergonomic[-\s]?knee[-\s]?pillow$/i,
    ],
    internalHandle: "knee-pillow",
  },
  {
    // Silk Deep Sleep Mask (including free gift variant)
    patterns: [
      /^rise[-\s]?by[-\s]?night[-\s]?silk[-\s]?(deep[-\s]?)?sleep[-\s]?mask/i,
      /^risebynight[-\s]?silk[-\s]?(deep[-\s]?)?sleep[-\s]?mask/i,
      /^silk[-\s]?(deep[-\s]?)?sleep[-\s]?mask/i,
    ],
    internalHandle: "sleep-mask",
  },
];

// Internal handles that have dedicated route components
const INTERNAL_HANDLES = ["ergonomic-pillow", "knee-pillow", "sleep-mask", "sleep-bundle"];

/**
 * Normalizes a handle for lookup:
 * - Decodes URL encoding (%E2%84%A2 → ™)
 * - Trims whitespace
 */
function normalizeHandle(handle: string): string {
  try {
    // Decode URI component (handles %E2%84%A2 → ™)
    return decodeURIComponent(handle).trim();
  } catch {
    // If decoding fails, return as-is trimmed
    return handle.trim();
  }
}

/**
 * Finds the internal handle for a given Shopify handle using pattern matching
 */
function findInternalHandle(normalizedHandle: string): string | null {
  // First check if it's already an internal handle
  if (INTERNAL_HANDLES.includes(normalizedHandle.toLowerCase())) {
    return normalizedHandle.toLowerCase();
  }

  // Try pattern matching
  for (const { patterns, internalHandle } of HANDLE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedHandle)) {
        return internalHandle;
      }
    }
  }

  return null;
}

/**
 * Catches dynamic /products/:handle routes and redirects to the correct product page.
 * Handles Shopify handles from Klaviyo, email campaigns, social media, etc.
 */
export const DynamicProductRoute = () => {
  const { handle } = useParams<{ handle: string }>();
  const location = useLocation();
  
  // Memoize the handle resolution to prevent unnecessary recalculations
  const { normalizedHandle, internalHandle } = useMemo(() => {
    if (!handle) {
      return { normalizedHandle: "", internalHandle: null };
    }
    const normalized = normalizeHandle(handle);
    const internal = findInternalHandle(normalized);
    return { normalizedHandle: normalized, internalHandle: internal };
  }, [handle]);
  
  // Debug logging - only in development
  useEffect(() => {
    console.log('[DynamicProductRoute] Processing:', {
      rawHandle: handle,
      normalizedHandle,
      internalHandle: internalHandle || 'NOT FOUND',
      fullPath: location.pathname,
      search: location.search,
    });
  }, [handle, normalizedHandle, internalHandle, location]);
  
  if (!handle) {
    console.log('[DynamicProductRoute] No handle provided, redirecting to /products');
    return <Navigate to="/products" replace />;
  }
  
  if (internalHandle) {
    // Preserve query params (like ?_kx= from Klaviyo)
    const targetUrl = `/products/${internalHandle}${location.search}`;
    console.log('[DynamicProductRoute] ✅ Redirecting to:', targetUrl);
    return <Navigate to={targetUrl} replace />;
  }
  
  // Unknown product - log for debugging and redirect to products index
  console.warn(`[DynamicProductRoute] ❌ Unknown product handle: "${handle}"`);
  console.warn(`[DynamicProductRoute] Normalized: "${normalizedHandle}"`);
  console.info('[DynamicProductRoute] Add a pattern to HANDLE_PATTERNS in src/components/DynamicProductRoute.tsx');
  
  return <Navigate to="/products" replace />;
};