import { toast } from "sonner";

const SHOPIFY_API_VERSION = '2025-01';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'lovable-project-swlbs.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'e40ec4b0f10582a9b6b921efb4e65bf8';

// Pinterest Click ID storage keys
const PINTEREST_EPIK_KEY = 'pinterest_epik';
const PINTEREST_LANDING_PAGE_KEY = 'pinterest_landing_page';

/**
 * Capture Pinterest click ID from URL on page load
 * Call this early in app initialization (e.g., App.tsx or main.tsx)
 */
export function capturePinterestClickId(): void {
  if (typeof window === 'undefined') return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const epik = urlParams.get('_ep') || urlParams.get('epik');
  
  if (epik) {
    // Store in localStorage for persistence
    localStorage.setItem(PINTEREST_EPIK_KEY, epik);
    localStorage.setItem(PINTEREST_LANDING_PAGE_KEY, window.location.href);
    
    // Also set as cookie for cross-domain tracking
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 day expiry
    document.cookie = `_epik=${encodeURIComponent(epik)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    
    console.log('[Pinterest] Click ID captured:', epik);
  }
}

/**
 * Retrieve Pinterest click ID from localStorage or cookie
 */
function getPinterestClickId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first (most reliable)
  const fromStorage = localStorage.getItem(PINTEREST_EPIK_KEY);
  if (fromStorage) return fromStorage;
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_epik' && value) {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * Get stored landing page URL
 */
function getPinterestLandingPage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PINTEREST_LANDING_PAGE_KEY);
}

/**
 * Get all Pinterest attribution data for cart attributes
 */
export function getPinterestAttributionData(): { key: string; value: string }[] {
  const attributes: { key: string; value: string }[] = [];
  
  const clickId = getPinterestClickId();
  if (clickId) {
    attributes.push({ key: '_ep', value: clickId });
    attributes.push({ key: 'pinterest_click_id', value: clickId });
  }
  
  const landingPage = getPinterestLandingPage();
  if (landingPage) {
    attributes.push({ key: 'pinterest_landing_page', value: landingPage });
  }
  
  // Add referrer if available
  if (typeof document !== 'undefined' && document.referrer) {
    attributes.push({ key: 'referrer', value: document.referrer });
  }
  
  return attributes;
}

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          compareAtPrice: {
            amount: string;
            currencyCode: string;
          } | null;
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

const STOREFRONT_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

export async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Shopify API access requires an active Shopify billing plan. Your store needs to be upgraded to a paid plan. Visit https://admin.shopify.com to upgrade.",
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Error calling Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

export async function fetchProducts(limit = 50, query?: string) {
  const data = await storefrontApiRequest(STOREFRONT_QUERY, {
    first: limit,
    query: query || null,
  });

  return data?.data?.products?.edges || [];
}

// Page fetching interface
export interface ShopifyPage {
  id: string;
  title: string;
  body: string;
  bodySummary: string;
  handle: string;
}

const PAGE_QUERY = `
  query getPage($handle: String!) {
    page(handle: $handle) {
      id
      title
      body
      bodySummary
      handle
    }
  }
`;

export async function fetchPageByHandle(handle: string): Promise<ShopifyPage | null> {
  try {
    const data = await storefrontApiRequest(PAGE_QUERY, { handle });
    
    if (!data?.data?.page) {
      console.warn(`Page with handle "${handle}" not found in Shopify`);
      return null;
    }
    
    return data.data.page;
  } catch (error) {
    console.error(`Error fetching page "${handle}":`, error);
    return null;
  }
}

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        discountCodes {
          code
          applicable
        }
        attributes {
          key
          value
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_DISCOUNT_CODES_UPDATE = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        checkoutUrl
        discountCodes {
          code
          applicable
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface FreeMaskSelection {
  variantId: string;
  color: string;
}

export async function createStorefrontCheckout(
  items: Array<{
    variantId: string;
    quantity: number;
  }>,
  freeMaskVariants: FreeMaskSelection[] = [],
  discountCodes: string[] = []
): Promise<string> {
  try {
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    // Add free sleep masks with selected variants
    if (freeMaskVariants.length > 0) {
      // Group variants by variantId to consolidate quantities
      const variantQuantities = freeMaskVariants.reduce((acc, selection) => {
        acc[selection.variantId] = (acc[selection.variantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Add each unique variant with its quantity
      Object.entries(variantQuantities).forEach(([variantId, quantity]) => {
        lines.push({
          quantity,
          merchandiseId: variantId,
        });
      });
    }

    // Build cart input with Pinterest attribution attributes
    const pinterestAttributes = getPinterestAttributionData();
    const cartInput: any = {
      lines,
    };
    
    // Add attributes if we have Pinterest data
    if (pinterestAttributes.length > 0) {
      cartInput.attributes = pinterestAttributes;
      console.log('[Shopify] Adding Pinterest attribution to cart:', pinterestAttributes.map(a => a.key));
    }

    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input: cartInput,
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Cart creation failed: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    let cart = cartData.data.cartCreate.cart;

    // Apply discount codes after cart creation if any are provided
    if (discountCodes.length > 0) {
      const discountData = await storefrontApiRequest(CART_DISCOUNT_CODES_UPDATE, {
        cartId: cart.id,
        discountCodes: discountCodes,
      });

      if (discountData.data.cartDiscountCodesUpdate.userErrors.length > 0) {
        console.error('Discount code application failed:', discountData.data.cartDiscountCodesUpdate.userErrors);
        // Continue with checkout even if discount fails
      } else {
        cart = discountData.data.cartDiscountCodesUpdate.cart;
      }
    }
    
    if (!cart.checkoutUrl) {
      throw new Error('No checkout URL returned from Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    
    // Append Pinterest click ID (epik) if available for attribution
    const epik = getPinterestClickId();
    if (epik) {
      url.searchParams.set('epik', epik);
    }
    
    const checkoutUrl = url.toString();
    return checkoutUrl;
  } catch (error) {
    console.error('Error creating storefront checkout:', error);
    throw error;
  }
}
