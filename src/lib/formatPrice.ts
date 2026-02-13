/**
 * Price Formatting Utility
 * 
 * Formats prices with the correct currency symbol based on currency code.
 * Used throughout the storefront to display localized pricing.
 * Handles locale-specific number formats (comma vs dot decimal separators).
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || '$';
}

/**
 * Parse a localized number string to a float
 * Handles both dot-decimal (1,234.56) and comma-decimal (1.234,56) formats
 */
export function parseLocalizedNumber(value: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === 'number') return value;

  let str = String(value).trim();

  // Remove currency symbols and whitespace
  str = str.replace(/[¤$€£¥\s]/g, "");

  // Auto-detect format: if comma appears after the last dot, comma is the decimal separator
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  const isCommaDecimal = lastComma > lastDot;

  if (isCommaDecimal) {
    // Comma as decimal: e.g., "1.234,56"
    str = str.replace(/\./g, ""); // Remove thousand separators (dots)
    str = str.replace(",", "."); // Convert decimal separator (comma) to dot
  } else {
    // Dot as decimal: e.g., "1,234.56"
    str = str.replace(/,/g, ""); // Remove thousand separators (commas)
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a price with the correct currency symbol
 * @param amount - The numeric amount or string amount (supports locale formats)
 * @param currencyCode - The currency code (USD, EUR, etc.)
 * @returns Formatted price string (e.g., "€49.99")
 */
export function formatPrice(amount: number | string, currencyCode: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseLocalizedNumber(amount) : amount;
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${numericAmount.toFixed(2)}`;
}

/**
 * Format a price from Shopify price object
 */
export function formatShopifyPrice(price: { amount: string; currencyCode: string }): string {
  return formatPrice(price.amount, price.currencyCode);
}
