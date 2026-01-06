/**
 * Shopify integration utilities
 * 
 * HARDENED:
 * - Attribution pass-through via getAttributionForCheckout()
 * - Never throws on attribution failures
 * - Checkout always succeeds even if tracking fails
 * - Multi-currency support via @inContext directive
 */

import { toast } from 'sonner';
import { getAttributionForCheckout, getEpik, captureAttribution } from './attribution';
import { getBuyerCountry, getBuyerCountrySync } from './buyerContext';
import type { CountryCode } from './countryCode';

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

// Re-export buyer context utilities for external use
export { getBuyerCountry, getBuyerCountrySync, initializeBuyerContext, setCountryOverride, getCountryOverride } from './buyerContext';
export type { CountryCode } from './countryCode';
export { COUNTRY_CURRENCY_MAP, COUNTRY_NAMES } from './countryCode';

// Shopify Storefront API configuration
const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'lovable-project-swlbs.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'e40ec4b0f10582a9b6b921efb4e65bf8';

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

// GraphQL queries with @inContext for multi-currency localization
const STOREFRONT_QUERY = `
  query GetProducts($first: Int!, $query: String, $country: CountryCode!) @inContext(country: $country) {
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
  mutation cartCreate($input: CartInput!, $country: CountryCode!) @inContext(country: $country) {
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

// Storefront API request helper with buyer context
async function storefrontApiRequest(
  query: string, 
  variables: any = {},
  options: { country?: CountryCode } = {}
) {
  // Always include buyer country for localized pricing
  const country = options.country || getBuyerCountrySync() || 'US';
  const enrichedVariables = { ...variables, country };

  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables: enrichedVariables }),
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

// Fetch products with localized pricing
export async function fetchProducts(limit = 50, query?: string): Promise<ShopifyProduct[]> {
  try {
    // Ensure buyer context is available
    const country = await getBuyerCountry();
    const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: limit, query }, { country });
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

  // Build cart input with attribution and discount codes - NEVER throw on attribution failure
  const cartInput: any = { lines };
  
  // Add discount codes directly to cart input (single API call optimization)
  if (discountCodes.length > 0) {
    cartInput.discountCodes = discountCodes;
  }
  
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

  // Create cart with discount codes in single API call (with buyer context for localized pricing)
  const country = await getBuyerCountry();
  const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, { input: cartInput }, { country });

  if (cartData.data.cartCreate.userErrors.length > 0) {
    throw new Error(`Cart creation failed: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
  }

  const cart = cartData.data.cartCreate.cart;

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
