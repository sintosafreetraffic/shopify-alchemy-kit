import { useParams, Navigate } from "react-router-dom";

/**
 * Maps Shopify product handles (used by Klaviyo, emails, etc.) to internal route handles.
 * This ensures external integrations work seamlessly with our custom product pages.
 * 
 * HOW TO ADD FUTURE PRODUCTS:
 * 1. Get the Shopify handle from your product (lowercase, hyphenated)
 * 2. Add a mapping: "shopify-handle": "internal-route"
 * 3. Create the corresponding route in App.tsx
 */
const SHOPIFY_HANDLE_MAP: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE SLEEP BUNDLE
  // ═══════════════════════════════════════════════════════════════════════════
  "rise-by-night™-complete-sleep-bundle": "sleep-bundle",
  "rise-by-night-complete-sleep-bundle": "sleep-bundle", // Without trademark symbol
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERGONOMIC SLEEP PILLOW
  // ═══════════════════════════════════════════════════════════════════════════
  "risebynight-ergonomic-sleep-pillow": "ergonomic-pillow",
  "rise-by-night-ergonomic-sleep-pillow": "ergonomic-pillow", // Alternative spacing
  "ergonomic-sleep-pillow": "ergonomic-pillow", // Short form
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERGONOMIC KNEE PILLOW
  // ═══════════════════════════════════════════════════════════════════════════
  "risebynight-ergonomic-knee-pillow": "knee-pillow",
  "rise-by-night-ergonomic-knee-pillow": "knee-pillow", // Alternative spacing
  "ergonomic-knee-pillow": "knee-pillow", // Short form
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SILK DEEP SLEEP MASK
  // ═══════════════════════════════════════════════════════════════════════════
  "risebynight-silk-sleep-mask": "sleep-mask",
  "risebynight-silk-deep-sleep-mask": "sleep-mask", // Full name variant
  "rise-by-night-silk-sleep-mask": "sleep-mask", // Alternative spacing
  "silk-deep-sleep-mask": "sleep-mask", // Short form
  "silk-sleep-mask": "sleep-mask", // Shorter form
};

// Internal handles that have dedicated route components
const INTERNAL_HANDLES = ["ergonomic-pillow", "knee-pillow", "sleep-mask", "sleep-bundle"];

/**
 * Normalizes a handle for lookup:
 * - Decodes URL encoding (%E2%84%A2 → ™)
 * - Converts to lowercase
 * - Strips common URL artifacts
 */
function normalizeHandle(handle: string): string {
  try {
    return decodeURIComponent(handle).toLowerCase().trim();
  } catch {
    // If decoding fails, just lowercase
    return handle.toLowerCase().trim();
  }
}

/**
 * Catches dynamic /products/:handle routes and redirects to the correct product page.
 * Handles Shopify handles from Klaviyo, email campaigns, social media, etc.
 */
export const DynamicProductRoute = () => {
  const { handle } = useParams<{ handle: string }>();
  
  if (!handle) {
    return <Navigate to="/products" replace />;
  }

  const normalizedHandle = normalizeHandle(handle);
  
  // Check if we have a mapping for this Shopify handle
  const internalHandle = SHOPIFY_HANDLE_MAP[normalizedHandle];
  
  if (internalHandle) {
    // Redirect to our custom product page
    return <Navigate to={`/products/${internalHandle}`} replace />;
  }
  
  // Check if it's already one of our internal handles (shouldn't happen as specific routes take priority)
  if (INTERNAL_HANDLES.includes(normalizedHandle)) {
    return <Navigate to={`/products/${normalizedHandle}`} replace />;
  }
  
  // Unknown product - log for debugging and redirect to products index
  console.warn(`[DynamicProductRoute] Unknown product handle: "${handle}" (normalized: "${normalizedHandle}")`);
  console.info('[DynamicProductRoute] To add this product, update SHOPIFY_HANDLE_MAP in src/components/DynamicProductRoute.tsx');
  
  return <Navigate to="/products" replace />;
};
