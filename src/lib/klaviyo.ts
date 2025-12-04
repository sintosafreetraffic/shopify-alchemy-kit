// Klaviyo tracking utility functions
// Safely handles cases where Klaviyo script hasn't loaded

declare global {
  interface Window {
    _klOnsite?: Array<unknown[]>;
  }
}

/**
 * Initialize Klaviyo queue if it doesn't exist
 */
const initKlaviyo = (): boolean => {
  if (typeof window === "undefined") return false;
  window._klOnsite = window._klOnsite || [];
  return true;
};

/**
 * Track "Viewed Product" event when a product detail page is loaded
 */
export const trackViewedProduct = (product: {
  id: string;
  title: string;
  price: number;
  sku?: string;
  imageUrl?: string;
}) => {
  if (!initKlaviyo()) return;

  try {
    window._klOnsite!.push([
      "trackViewedItem",
      {
        ProductID: product.id,
        SKU: product.sku || "",
        Name: product.title,
        Price: product.price,
        URL: window.location.href,
        ImageURL: product.imageUrl || "",
      },
    ]);
  } catch (error) {
    console.warn("Klaviyo trackViewedProduct failed:", error);
  }
};

/**
 * Track "Added to Cart" event when a product is added to cart
 */
export const trackAddedToCart = (product: {
  id: string;
  title: string;
  price: number;
  quantity: number;
  sku?: string;
  variantTitle?: string;
  imageUrl?: string;
}) => {
  if (!initKlaviyo()) return;

  try {
    window._klOnsite!.push([
      "track",
      "Added to Cart",
      {
        ProductID: product.id,
        SKU: product.sku || "",
        Name: product.title,
        Variant: product.variantTitle || "",
        Price: product.price,
        Quantity: product.quantity,
        URL: window.location.href,
        ImageURL: product.imageUrl || "",
      },
    ]);
  } catch (error) {
    console.warn("Klaviyo trackAddedToCart failed:", error);
  }
};

/**
 * Track "Started Sleep Quiz" event when user begins the quiz
 */
export const trackQuizStarted = () => {
  if (!initKlaviyo()) return;

  try {
    window._klOnsite!.push([
      "track",
      "Started Sleep Quiz",
      {
        URL: window.location.href,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.warn("Klaviyo trackQuizStarted failed:", error);
  }
};
