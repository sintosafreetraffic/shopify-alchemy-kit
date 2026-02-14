
## Price Localization Audit -- Full Fix Plan

### Issues Found

**1. Recently Viewed: Hardcoded USD prices, no currency symbol**
In `src/hooks/useTrackProductView.ts`, the `STATIC_PRODUCT_DATA` stores raw numbers like `"24.99"` without any currency formatting. The `RecentlyViewedItems.tsx` component renders `{product.price}` directly, producing "24.99" instead of "kr24.99" or equivalent.

This is the issue visible in screenshot 4 where the Sleep Mask shows just "24.99" with no "kr" prefix.

**2. Recently Viewed stores stale prices at view-time**
When a product page is visited, `addToRecentlyViewed` saves the price string to localStorage. If the user later returns from a different country/currency context, the old cached price/symbol displays incorrectly.

**3. Products collection page uses single currency for all products**
In `src/pages/Products.tsx` line 267, the currency is derived once from the first product, then applied to all products. This works in practice (Shopify returns same currency per session), but the EU override logic (`isEU ? 'EUR'`) should use each product's own variant currency as a base check.

---

### Fix Plan

#### File 1: `src/hooks/useTrackProductView.ts`
- Make `STATIC_PRODUCT_DATA` a function that accepts a `currencyCode` parameter
- Instead of storing raw price strings like `"24.99"`, store them as formatted strings using `formatPrice(24.99, currencyCode)`
- Or better: store only numeric values and format at render time

**Recommended approach**: Change the `price` field in `STATIC_PRODUCT_DATA` to be formatted with `formatPrice()` at call time. Since `useTrackProductView` is a hook called in product pages where we already know the currency, pass the live currency code through.

#### File 2: `src/components/home/RecentlyViewedItems.tsx`
- The component already renders `{product.price}` which will now contain the formatted string (with currency symbol)
- No changes needed if we fix the data at the source

#### File 3: Product pages that call `useTrackProductView`
Update all product pages to pass live Shopify prices instead of static data:
- `SleepMaskProduct.tsx` -- pass live price from Shopify variant with correct currency
- `ErgonomicPillowProductVariantB.tsx` -- same
- `KneePillowProduct.tsx` -- same  
- `SleepBundleProduct.tsx` -- same

Each page already fetches Shopify data. The fix is to compute the formatted price from live data and pass it to `useTrackProductView` instead of using `STATIC_PRODUCT_DATA`.

---

### Technical Details

**Step 1**: Update `useTrackProductView.ts`
- Keep `STATIC_PRODUCT_DATA` as fallback but add `formatPrice` to format the prices
- Export a helper `getProductViewData(handle, variant, currencyCode)` that builds the tracking data from live Shopify data with proper formatting

**Step 2**: Update each product page
- In `SleepMaskProduct.tsx`, `SleepMaskHero.tsx` already has the variant and currency. Lift the tracking call to include live price data.
- Same pattern for other product pages.

**Step 3**: Handle localStorage staleness
- Add `currencyCode` to the stored `ViewedProduct` interface
- On render in `RecentlyViewedItems`, if the stored currency doesn't match the current buyer's currency, either hide the price or re-format using the stored numeric amount

**Simplest robust fix**: Store both the raw numeric price and currency code in localStorage, then format at render time using `formatPrice()` in `RecentlyViewedItems.tsx`. This ensures returning visitors always see correctly localized prices regardless of when they last visited.

### Files to modify:
1. `src/hooks/useTrackProductView.ts` -- add `rawPrice` (number) and `currencyCode` fields; format with `formatPrice` at call time
2. `src/components/home/RecentlyViewedItems.tsx` -- update interface to include `rawPrice`/`currencyCode`; render using `formatPrice()` instead of raw string; bump `CURRENT_VERSION` to invalidate stale cache
3. `src/pages/SleepMaskProduct.tsx` -- pass live Shopify price data to tracking hook
4. `src/pages/ErgonomicPillowProductVariantB.tsx` -- pass live Shopify price data to tracking hook
5. `src/pages/KneePillowProduct.tsx` -- pass live Shopify price data to tracking hook (if using static data)
6. `src/pages/SleepBundleProduct.tsx` -- pass live Shopify price data to tracking hook (if using static data)
