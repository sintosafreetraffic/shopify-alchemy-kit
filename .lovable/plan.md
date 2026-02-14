

# Fix Compare-at Prices for All Global Markets

## Problem
Shopify only has compare-at prices configured for the US market. The `@inContext` directive correctly converts regular prices for all countries (UK, AU, NZ, Scandinavia, etc.), but returns `null` for `compareAtPrice` in non-US markets.

## Approach: Ratio-Based Conversion (No Hardcoded Exchange Rates)

Instead of maintaining a table of exchange rates, use the **price ratio** from Shopify's own USD data. Since Shopify already converts the regular price correctly via `@inContext`, we can derive the compare-at price mathematically:

```text
Known from Shopify Admin (USD):
  Ergonomic Pillow: price = $119.99, compare-at = $239.98 -> ratio = 2.0
  Sleep Bundle (single): price = $149.99, compare-at = $190.00 -> ratio ~1.267
  Sleep Bundle (double): price = $269.99, compare-at = $380.00 -> ratio ~1.407

For any country (e.g., UK):
  Shopify returns localized price = GBP 95.99
  Calculated compare-at = GBP 95.99 x 2.0 = GBP 191.98
```

This automatically works for all currencies without maintaining exchange rates.

## Files to Change

### 1. New file: `src/lib/compareAtPriceRatios.ts`
- A map of product handles to their USD compare-at / USD price ratios
- A helper function `getCompareAtFromRatio(handle, localPrice, variantIndex)` that returns the calculated compare-at price, or `null` if no ratio is defined

### 2. `src/components/ProductGallery.tsx` (lines 72-85)
- In `getCompareAtPrice`, add a third fallback: if both variant `compareAtPrice` and `compareAtPriceRange` are null/zero, call `getCompareAtFromRatio()` using the product's localized regular price
- Same for the bundle price display section

### 3. `src/components/SleepBundleHero.tsx` (lines 188-204, 226-242)
- In both single and double bundle price IIFEs, add the ratio fallback after the existing `compareAtPriceRange` check

### 4. `src/pages/Products.tsx` (lines 330-338)
- In the compareAtPrice calculation, add the ratio fallback after the variant `compareAtPrice` check

### 5. `src/pages/ErgonomicPillowProductVariantB.tsx` (lines 140-142)
- Add ratio fallback when `variant.compareAtPrice.amount` is missing

## Result
- USD and EUR visitors: see the same compare-at prices as before (from Shopify or calculated -- same result since the ratio is derived from those values)
- GBP visitors: see correctly converted compare-at prices (e.g., GBP 191.98)
- AUD/NZD visitors: see correctly converted compare-at prices
- SEK/NOK/DKK visitors: see correctly converted compare-at prices in kr
- No exchange rate maintenance needed -- ratios are stable product properties
