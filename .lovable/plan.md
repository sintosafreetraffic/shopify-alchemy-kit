
# Add Compare-at Price Fallback to Sleep Bundle Product Page

## Problem
The Sleep Bundle product page (`SleepBundleHero.tsx`) only checks `variant.compareAtPrice` for displaying the strikethrough price. When the Storefront API returns `null` for variant-level `compareAtPrice` (even though it exists in Shopify Admin), no strikethrough price is shown.

This was already fixed on the homepage `ProductGallery.tsx` by adding a fallback to `compareAtPriceRange` at the product level. The same fix needs to be applied here.

## Changes

### File: `src/components/SleepBundleHero.tsx`

**Single Bundle price section (lines 188-192):**
Replace the simple `compareAtPrice` check with a fallback that also checks `product.node.compareAtPriceRange`:

```
// Before: only checks variant compareAtPrice
{product?.node.variants.edges[0]?.node.compareAtPrice && (...)}

// After: also falls back to compareAtPriceRange
{(() => {
  const variantCompare = product?.node.variants.edges[0]?.node.compareAtPrice?.amount;
  const rangeCompare = product?.node.compareAtPriceRange?.minVariantPrice?.amount;
  const compareAmount = (variantCompare && parseFloat(variantCompare) > 0)
    ? variantCompare
    : (rangeCompare && parseFloat(rangeCompare) > 0)
    ? rangeCompare : null;
  return compareAmount ? (<strikethrough price>) : null;
})()}
```

**Double Bundle price section (lines 218-222):**
Same pattern for the second variant.

This matches the approach already working in `ProductGallery.tsx`.
