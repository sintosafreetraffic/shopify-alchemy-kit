/**
 * Shopify integration utilities
 * 
 * HARDENED:
 * - Attribution pass-through via getAttributionForCheckout()
 * - Never throws on attribution failures
 * - Checkout always succeeds even if tracking fails
 */

import { toast } from 'sonner';
import { getAttributionForCheckout, getEpik, captureAttribution } from './attribution';

// Storage keys (kept for backward compatibility)
const PINTEREST_EPIK_KEY = 'pinterest_epik';
const PINTEREST_LANDING_PAGE_KEY = 'pinterest_landing_page';

/**
 * Capture Pinterest click ID from URL - DEPRECATED, use captureAttribution() instead
 * Kept for backward compatibility with App.tsx
 */
export function capturePinterestClickId(): void {
  try {
    captureAttribution();
  } catch {
    // Silent fail - never block app initialization
  }
}

/**
 * Get Pinterest click ID from storage (legacy helper)
 */
function getPinterestClickId(): string | null {
  try {
    return getEpik();
  } catch {
    return null;
  }
}

/**
 * Get Pinterest landing page from storage (legacy helper)
 */
function getPinterestLandingPage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(PINTEREST_LANDING_PAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get Pinterest attribution data for Shopify cart
 * Wrapper that calls the standardized getAttributionForCheckout()
 * All legacy keys are now included in the base function
 */
export function getPinterestAttributionData(): { key: string; value: string }[] {
  try {
    return getAttributionForCheckout();
  } catch {
    return [];
  }
}

// Shopify Storefront API configuration
const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'lovable-project-swlbs.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'a5e3f02ae01f7e32b4be58dc48ad2e20';

// Product and page types
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
    compareAtPriceRange?: {
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
          compareAtPrice?: {
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

interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
}

// GraphQL queries
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
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 20) {
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

const PAGE_QUERY = `
  query GetPage($handle: String!) {
    page(handle: $handle) {
      id
      title
      handle
      body
      bodySummary
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
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
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
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

// Storefront API request helper
async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Shopify API access requires an active billing plan.",
    });
    throw new Error('Shopify payment required');
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

// Fetch products
export async function fetchProducts(limit = 50, query?: string): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: limit, query });
    return data.data.products.edges;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Fetch page by handle
export async function fetchPageByHandle(handle: string): Promise<ShopifyPage | null> {
  try {
    const data = await storefrontApiRequest(PAGE_QUERY, { handle });
    return data.data.page;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

// Free mask selection type
export interface FreeMaskSelection {
  variantId: string;
  color: string;
}

/**
 * Create Shopify checkout via Storefront API
 * 
 * HARDENED:
 * - Attribution always attached (never throws on failure)
 * - checkout_url always returned even if attribution fails
 */
export async function createStorefrontCheckout(
  items: Array<{
    variantId: string;
    quantity: number;
  }>,
  freeMaskVariants: FreeMaskSelection[] = [],
  discountCodes: string[] = []
): Promise<string> {
  // Build line items
  const lines = items.map(item => ({
    quantity: item.quantity,
    merchandiseId: item.variantId,
  }));

  // Add free sleep masks
  if (freeMaskVariants.length > 0) {
    const variantQuantities = freeMaskVariants.reduce((acc, selection) => {
      acc[selection.variantId] = (acc[selection.variantId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(variantQuantities).forEach(([variantId, quantity]) => {
      lines.push({ quantity, merchandiseId: variantId });
    });
  }

  // Build cart input with attribution - NEVER throw on attribution failure
  const cartInput: any = { lines };
  
  try {
    const attributionAttributes = getPinterestAttributionData();
    if (attributionAttributes.length > 0) {
      cartInput.attributes = attributionAttributes;
      console.log('[Shopify] Attribution attached:', attributionAttributes.map(a => a.key));
    }
  } catch (attrError) {
    // Log but continue - attribution failure must not block checkout
    console.warn('[Shopify] Attribution capture failed (non-blocking):', attrError);
  }

  // Create cart
  const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, { input: cartInput });

  if (cartData.data.cartCreate.userErrors.length > 0) {
    throw new Error(`Cart creation failed: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
  }

  let cart = cartData.data.cartCreate.cart;

  // Apply discount codes
  if (discountCodes.length > 0) {
    try {
      const discountData = await storefrontApiRequest(CART_DISCOUNT_CODES_UPDATE, {
        cartId: cart.id,
        discountCodes,
      });

      if (discountData.data.cartDiscountCodesUpdate.userErrors.length > 0) {
        console.error('Discount code failed:', discountData.data.cartDiscountCodesUpdate.userErrors);
      } else {
        cart = discountData.data.cartDiscountCodesUpdate.cart;
      }
    } catch (discountError) {
      console.error('Discount application error:', discountError);
      // Continue with checkout even if discount fails
    }
  }

  if (!cart.checkoutUrl) {
    throw new Error('No checkout URL returned from Shopify');
  }

  // Build final checkout URL
  const url = new URL(cart.checkoutUrl);
  url.searchParams.set('channel', 'online_store');

  // Append epik for attribution (non-blocking)
  try {
    const epik = getEpik();
    if (epik) {
      url.searchParams.set('epik', epik);
    }
  } catch {
    // Silent fail
  }

  return url.toString();
}
