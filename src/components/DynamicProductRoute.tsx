import { useParams, Navigate } from "react-router-dom";

/**
 * Maps Shopify product handles (used by Klaviyo, emails, etc.) to internal route handles.
 * This ensures external integrations work seamlessly with our custom product pages.
 */
const SHOPIFY_HANDLE_MAP: Record<string, string> = {
  // Shopify handle → internal route
  "rise-by-night™-complete-sleep-bundle": "sleep-bundle",
  "risebynight-ergonomic-sleep-pillow": "ergonomic-pillow",
  "risebynight-ergonomic-knee-pillow": "knee-pillow",
  "risebynight-silk-deep-sleep-mask": "sleep-mask",
  // URL-decoded versions (browsers may decode before routing)
  "rise-by-night%E2%84%A2-complete-sleep-bundle": "sleep-bundle",
};

/**
 * Catches dynamic /products/:handle routes and redirects to the correct product page.
 * Handles Shopify handles from Klaviyo, email campaigns, etc.
 */
export const DynamicProductRoute = () => {
  const { handle } = useParams<{ handle: string }>();
  
  if (!handle) {
    return <Navigate to="/products" replace />;
  }

  // Decode URL-encoded characters (e.g., %E2%84%A2 → ™)
  const decodedHandle = decodeURIComponent(handle).toLowerCase();
  
  // Check if we have a mapping for this Shopify handle
  const internalHandle = SHOPIFY_HANDLE_MAP[decodedHandle] || SHOPIFY_HANDLE_MAP[handle.toLowerCase()];
  
  if (internalHandle) {
    // Redirect to our custom product page
    return <Navigate to={`/products/${internalHandle}`} replace />;
  }
  
  // If no mapping found, try using the handle as-is (might be one of our internal handles)
  // Check if it's already one of our internal handles
  const internalHandles = ["ergonomic-pillow", "knee-pillow", "sleep-mask", "sleep-bundle"];
  if (internalHandles.includes(handle.toLowerCase())) {
    // Already a valid internal handle, let it through (this shouldn't happen as specific routes take priority)
    return <Navigate to={`/products/${handle.toLowerCase()}`} replace />;
  }
  
  // Unknown product - redirect to products index
  console.warn(`[DynamicProductRoute] Unknown product handle: ${handle}`);
  return <Navigate to="/products" replace />;
};
