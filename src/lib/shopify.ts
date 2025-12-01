import { toast } from "sonner";

const SHOPIFY_API_VERSION = '2025-01';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'lovable-project-swlbs.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'e40ec4b0f10582a9b6b921efb4e65bf8';

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

export async function createStorefrontCheckout(
  items: Array<{
    variantId: string;
    quantity: number;
  }>,
  freeMasks: number = 0,
  discountCodes: string[] = []
): Promise<string> {
  try {
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    // Add free sleep masks if applicable
    if (freeMasks > 0) {
      // Fetch the free gift sleep mask product specifically
      try {
        const products = await fetchProducts(10);
        const freeGiftMask = products.find(p => 
          p.node.title.toLowerCase().includes('free gift') && 
          p.node.title.toLowerCase().includes('mask')
        );
        
        if (freeGiftMask && freeGiftMask.node.variants.edges[0]?.node) {
          lines.push({
            quantity: freeMasks,
            merchandiseId: freeGiftMask.node.variants.edges[0].node.id,
          });
        }
      } catch (error) {
        console.error('Failed to add free gift to checkout:', error);
        // Continue with checkout even if free gift addition fails
      }
    }

    const cartInput: any = {
      lines,
    };

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
    const checkoutUrl = url.toString();
    return checkoutUrl;
  } catch (error) {
    console.error('Error creating storefront checkout:', error);
    throw error;
  }
}
