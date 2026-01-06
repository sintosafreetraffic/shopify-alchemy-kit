/**
 * Price Formatting Utility
 * 
 * Formats prices with the correct currency symbol based on currency code.
 * Used throughout the storefront to display localized pricing.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || '$';
}

/**
 * Format a price with the correct currency symbol
 * @param amount - The numeric amount or string amount
 * @param currencyCode - The currency code (USD, EUR, etc.)
 * @returns Formatted price string (e.g., "€49.99")
 */
export function formatPrice(amount: number | string, currencyCode: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${numericAmount.toFixed(2)}`;
}

/**
 * Format a price from Shopify price object
 */
export function formatShopifyPrice(price: { amount: string; currencyCode: string }): string {
  return formatPrice(price.amount, price.currencyCode);
}
