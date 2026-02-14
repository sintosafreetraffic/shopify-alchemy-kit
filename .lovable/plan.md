

# Fix Recently Viewed: Dynamic Pricing and Remove "40% Off" Text

## Changes

### 1. Make Sleep Bundle and Ergonomic Pillow Prices Dynamic (from Shopify)
Currently, `STATIC_PRODUCT_DATA` in `useTrackProductView.ts` hardcodes prices (e.g., sleep bundle at 109.99/199.99), but Shopify has different values (149.99/190). Instead of updating hardcoded values again, the product pages should fetch live Shopify data and pass it to `useTrackProductView`, ensuring correct prices in all currencies.

**Approach**: On the product detail pages (`SleepBundleProduct.tsx` and `ErgonomicPillowProductVariantB.tsx`), fetch the Shopify product data using the existing `useShopifyProducts` hook, then pass the live price and compareAtPrice to `useTrackProductView` instead of using `STATIC_PRODUCT_DATA`. For the knee pillow and sleep mask pages (which already work correctly with static data and have no compareAtPrice), keep using `STATIC_PRODUCT_DATA`.

**File: `src/hooks/useTrackProductView.ts`**
- Update the `sleep-bundle` static entry to use fallback prices matching Shopify (149.99 / 190) instead of 109.99 / 199.99
- Update the `ergonomic-pillow` static entry to match current Shopify pricing as well
- These static values serve as fallbacks only; the real fix is dynamic fetching on the product pages

**File: `src/pages/SleepBundleProduct.tsx`**
- Import `useShopifyProducts` hook and `formatPrice`
- Find the sleep bundle product from Shopify data
- Build a dynamic `ProductViewData` object with live price/compareAtPrice
- Pass it to `useTrackProductView` instead of `STATIC_PRODUCT_DATA["sleep-bundle"]`

**File: `src/pages/ErgonomicPillowProductVariantB.tsx`**
- Same approach: fetch Shopify data, find the ergonomic pillow product, pass dynamic pricing to `useTrackProductView`

### 2. Remove "40% Off" from Recently Viewed for Ergonomic Sleep Pillow
The ergonomic pillow currently shows a pink "1+1 FREE + 40%" badge and "Buy 1, Get 1 Free + 40% Off!" text in the Recently Viewed section. Remove the "+ 40%" from the badge and the "+ 40% Off!" from the subtitle text.

**File: `src/components/home/RecentlyViewedItems.tsx`**
- Line 103: Change badge text from `1+1 FREE + 40%` to `1+1 FREE`
- Line 138: Change subtitle from `Buy 1, Get 1 Free + 40% Off!` to `Buy 1, Get 1 Free!`

### 3. Bump Cache Version
Increment `CURRENT_VERSION` from 2 to 3 in `RecentlyViewedItems.tsx` so all users get fresh data with corrected prices on their next visit.

---

## Files to Change

1. **`src/hooks/useTrackProductView.ts`** -- Update static fallback prices for sleep-bundle and ergonomic-pillow
2. **`src/pages/SleepBundleProduct.tsx`** -- Fetch Shopify data and pass dynamic pricing to tracking hook
3. **`src/pages/ErgonomicPillowProductVariantB.tsx`** -- Fetch Shopify data and pass dynamic pricing to tracking hook
4. **`src/components/home/RecentlyViewedItems.tsx`** -- Remove "+ 40%" from badge and text; bump cache version to 3

