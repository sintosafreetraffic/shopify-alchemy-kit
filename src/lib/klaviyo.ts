// Klaviyo tracking utility functions
// Safely handles cases where Klaviyo script hasn't loaded

declare global {
  interface Window {
    _klOnsite?: Array<unknown[]>;
    _learnq?: Array<unknown[]>;
  }
}

/**
 * Initialize Klaviyo _klOnsite queue (for on-site tracking)
 */
const initKlaviyoOnsite = (): boolean => {
  if (typeof window === "undefined") return false;
  window._klOnsite = window._klOnsite || [];
  return true;
};

/**
 * Initialize Klaviyo _learnq queue (for event tracking / metrics)
 */
const initKlaviyoLearnq = (): boolean => {
  if (typeof window === "undefined") return false;
  window._learnq = window._learnq || [];
  return true;
};

/**
 * Track "Viewed Product" event when a product detail page is loaded
 * Uses _learnq for proper metric tracking in Klaviyo
 */
export const trackViewedProduct = (product: {
  id: string;
  title: string;
  price: number;
  sku?: string;
  imageUrl?: string;
}) => {
  if (!initKlaviyoLearnq()) return;

  try {
    // Use _learnq for event metrics
    window._learnq!.push([
      "track",
      "Viewed Product",
      {
        ProductID: product.id,
        SKU: product.sku || "",
        ProductName: product.title,
        ItemPrice: product.price,
        ProductURL: window.location.href,
        ImageURL: product.imageUrl || "",
      },
    ]);
    
    // Also push to _klOnsite for on-site features
    if (initKlaviyoOnsite()) {
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
    }
  } catch (error) {
    console.warn("Klaviyo trackViewedProduct failed:", error);
  }
};

/**
 * Track "Added to Cart" event when a product is added to cart
 * Uses _learnq for proper metric tracking in Klaviyo
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
  if (!initKlaviyoLearnq()) return;

  try {
    // Calculate item value
    const itemValue = product.price * product.quantity;
    
    // Use _learnq for event metrics - this is what shows up in Klaviyo metrics
    window._learnq!.push([
      "track",
      "Added to Cart",
      {
        "$value": itemValue,
        "ProductID": product.id,
        "SKU": product.sku || "",
        "ProductName": product.title,
        "Variant": product.variantTitle || "",
        "ItemPrice": product.price,
        "Quantity": product.quantity,
        "ProductURL": window.location.href,
        "ImageURL": product.imageUrl || "",
        "AddedAt": new Date().toISOString(),
      },
    ]);
    
    console.log("[Klaviyo] Added to Cart event tracked:", product.title);
  } catch (error) {
    console.warn("Klaviyo trackAddedToCart failed:", error);
  }
};

/**
 * Track "Started Checkout" event when user begins checkout
 */
export const trackStartedCheckout = (cart: {
  items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    variantTitle?: string;
    imageUrl?: string;
  }>;
  totalValue: number;
  currencyCode: string;
}) => {
  if (!initKlaviyoLearnq()) return;

  try {
    window._learnq!.push([
      "track",
      "Started Checkout",
      {
        "$value": cart.totalValue,
        "Currency": cart.currencyCode,
        "ItemCount": cart.items.reduce((sum, item) => sum + item.quantity, 0),
        "Items": cart.items.map(item => ({
          ProductID: item.id,
          ProductName: item.title,
          Variant: item.variantTitle || "",
          ItemPrice: item.price,
          Quantity: item.quantity,
          ImageURL: item.imageUrl || "",
        })),
        "CheckoutURL": window.location.href,
      },
    ]);
    
    console.log("[Klaviyo] Started Checkout event tracked");
  } catch (error) {
    console.warn("Klaviyo trackStartedCheckout failed:", error);
  }
};

/**
 * Track "Started Sleep Quiz" event when user begins the quiz
 */
export const trackQuizStarted = () => {
  if (!initKlaviyoLearnq()) return;

  try {
    window._learnq!.push([
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

/**
 * Track "Completed Sleep Quiz" event when user finishes the quiz
 */
export const trackQuizCompleted = (data: {
  personaCluster?: string;
  email?: string;
}) => {
  if (!initKlaviyoLearnq()) return;

  try {
    window._learnq!.push([
      "track",
      "Completed Sleep Quiz",
      {
        PersonaCluster: data.personaCluster || "",
        URL: window.location.href,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.warn("Klaviyo trackQuizCompleted failed:", error);
  }
};

/**
 * Track "Sleep Progress Shared" event when user shares their progress
 */
export const trackSleepProgressShared = (payload: {
  method: "download" | "native_share" | "copy_link";
  range: "7d" | "30d" | "90d" | "12m";
  metric: "both" | "quality" | "pain";
}) => {
  if (!initKlaviyoLearnq()) return;

  try {
    window._learnq!.push([
      "track",
      "Sleep Progress Shared",
      {
        method: payload.method,
        range: payload.range,
        metric: payload.metric,
        URL: window.location.href,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.warn("Klaviyo trackSleepProgressShared failed:", error);
  }
};

/**
 * Identify a user in Klaviyo (for logged-in users or after email capture)
 */
export const identifyUser = (user: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) => {
  if (!initKlaviyoLearnq()) return;

  try {
    const identifyData: Record<string, string> = {
      "$email": user.email,
    };
    
    if (user.firstName) identifyData["$first_name"] = user.firstName;
    if (user.lastName) identifyData["$last_name"] = user.lastName;
    if (user.phone) identifyData["$phone_number"] = user.phone;

    window._learnq!.push(["identify", identifyData]);
    
    console.log("[Klaviyo] User identified:", user.email);
  } catch (error) {
    console.warn("Klaviyo identifyUser failed:", error);
  }
};
