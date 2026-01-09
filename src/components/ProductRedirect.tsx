import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect from old /product/:handle routes to new /products/:handle
 * Preserves SEO value and fixes integration compatibility (Klaviyo, Shopify, etc.)
 */
export const ProductRedirect = () => {
  const { handle } = useParams<{ handle: string }>();
  
  // Redirect to the new /products/ path (industry standard)
  return <Navigate to={`/products/${handle || ""}`} replace />;
};

/**
 * Redirect from /product to /products (index page)
 */
export const ProductIndexRedirect = () => {
  return <Navigate to="/products" replace />;
};
