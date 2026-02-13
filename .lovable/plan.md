

# Fix: Make Compare-At Prices Currency-Dynamic

## Problem

Several components hardcode the compare-at price as a fixed number (e.g. `199.99`) or a Euro string (`"€199.99"`), so visitors in the UK see "£199.99" (wrong conversion) or Denmark sees the same number when DKK prices should be much higher. Shopify already returns the correct localized compare-at price via `@inContext`, but the code ignores it in multiple places.

## Where Hardcoded Values Exist

| File | Hardcoded Value | What It Should Use |
|---|---|---|
| `src/components/Hero.tsx` (line 222) | `const compareAtPrice = 199.99` | Shopify variant's `compareAtPrice.amount` |
| `src/components/ab-testing/HeroVariantB.tsx` (line 183) | `const compareAtPrice = 199.99` | Shopify variant's `compareAtPrice.amount` |
| `src/components/ValentinesHeroSection.tsx` (line 39) | `const singleCompareAtPrice = 199.99` | Shopify variant's `compareAtPrice.amount` |
| `src/hooks/useTrackProductView.ts` (lines 53-79) | `"€199.99"`, `"€59.99"`, `"€39.99"` | These are static tracking data -- less critical but should also reflect the buyer's currency |

## Changes

### 1. `src/components/Hero.tsx`
- Replace the hardcoded `const compareAtPrice = 199.99` with reading from the Shopify variant: `variant?.compareAtPrice?.amount ? parseFloat(variant.compareAtPrice.amount) : 199.99`
- The variant already contains localized `compareAtPrice` data from the `@inContext` query, so a UK visitor will get the GBP value and a DKK visitor will get the DKK value
- The `199.99` remains only as a fallback if Shopify data isn't loaded yet

### 2. `src/components/ab-testing/HeroVariantB.tsx`
- Same fix as Hero.tsx: read `compareAtPrice` from the Shopify variant instead of hardcoding `199.99`

### 3. `src/components/ValentinesHeroSection.tsx`
- Currently receives `productPrice` as a prop but not the compare-at price
- Add a new prop `compareAtPrice: number` and pass it from the parent (Hero.tsx)
- Replace `const singleCompareAtPrice = 199.99` with the prop value (fallback to `199.99`)
- This makes the Valentine's savings calculation ("You save X") also correct per currency

### 4. `src/hooks/useTrackProductView.ts`
- The `STATIC_PRODUCT_DATA` has hardcoded `"€119.99"` / `"€199.99"` etc. These are used for recently-viewed tracking
- Update to not hardcode currency: either remove the static prices (they're overridden when actual Shopify data loads) or make them currency-aware using the buyer's detected currency
- Lower priority since this is tracking/display data, not purchase-critical

## How It Works After the Fix

Shopify's `@inContext(country: $country)` directive already returns localized compare-at prices. The GraphQL query already fetches `compareAtPrice { amount, currencyCode }` on each variant. The fix simply reads these values instead of ignoring them.

Example for a product with EUR compare-at of 199.99:
- **UK visitor**: Shopify returns `compareAtPrice: { amount: "159.99", currencyCode: "GBP" }` -- displayed as `£159.99`
- **DK visitor**: Shopify returns `compareAtPrice: { amount: "1499.00", currencyCode: "DKK" }` -- displayed as `kr1499.00`
- **AU visitor**: Shopify returns `compareAtPrice: { amount: "299.99", currencyCode: "AUD" }` -- displayed as `A$299.99`

The actual conversion rates are controlled in **Shopify Admin > Settings > Markets** -- no code changes needed for rate adjustments.

## Files to Modify

1. `src/components/Hero.tsx` -- Read compareAtPrice from variant
2. `src/components/ab-testing/HeroVariantB.tsx` -- Same
3. `src/components/ValentinesHeroSection.tsx` -- Accept compareAtPrice as prop
4. `src/hooks/useTrackProductView.ts` -- Remove hardcoded EUR prices (low priority)
