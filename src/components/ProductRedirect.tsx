import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect from old /product/:handle routes to new /products/:handle
 * Preserves SEO value and fixes integration compatibility (Klaviyo, Shopify, etc.)
 * 
 * NOTE: For fastest redirects, use server-side redirects in:
 * - public/_redirects (Netlify)
 * - vercel.json (Vercel)
 * 
 * This React component is a fallback for direct navigation or SPA transitions.
 */
export const ProductRedirect = () => {
  const { handle } = useParams<{ handle: string }>();
  const newPath = `/products/${handle || ""}`;
  
  // Attempt immediate redirect using window.location for faster response
  // This helps Pinterest in-app browser and other slow-hydrating environments
  useEffect(() => {
    // Use replace to avoid adding to history stack
    window.location.replace(newPath);
  }, [newPath]);
  
  // Fallback to React Navigate (may not fire if window.location works first)
  return <Navigate to={newPath} replace />;
};

/**
 * Redirect from /product to /products (index page)
 */
export const ProductIndexRedirect = () => {
  useEffect(() => {
    window.location.replace("/products");
  }, []);
  
  return <Navigate to="/products" replace />;
};
