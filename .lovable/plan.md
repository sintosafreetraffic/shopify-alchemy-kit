

## Fix: Price Discrepancy Between Product Page and Sticky ATC

### Root Cause

The Hero component (product page price) uses `useShopifyProducts()` -- a React Query hook that includes the buyer's country in its cache key. When the country is detected asynchronously, React Query re-fetches with the correct country, getting properly localized prices from Shopify (e.g., A$174.00 for Australia).

The StickyAddToCart (and several other components) uses `fetchProducts(20)` directly inside a `useEffect`. This runs once on mount. At that moment, `getBuyerCountrySync()` may still return `null` (country not yet detected), so `fetchProducts` falls back to `'US'` and gets USD prices (e.g., $59.99). The currency symbol override then slaps "A$" onto the USD amount, producing "A$119.99" (which is 2x $59.99 for the 1+1 deal) instead of the correct AUD-localized price.

In short: **same product, two different API calls, one gets AUD prices, the other gets USD prices with an AUD symbol.**

### The Fix

Replace direct `fetchProducts()` calls with the centralized `useShopifyProducts()` hook in all 5 affected components. This ensures:

1. All components share the same cached product data (single source of truth)
2. When the country is detected, React Query re-fetches and all components update together
3. Prices are always consistent across the page

Additionally, since Shopify returns the correct localized currency via `@inContext`, the manual `shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency` override becomes a safety net only -- the API should already return AUD for Australian visitors.

### Files to Update

| # | File | Current | After |
|---|------|---------|-------|
| 1 | `StickyAddToCart.tsx` | `fetchProducts(20)` in useEffect, manages own state | `useShopifyProducts(20)` hook, removes local product-fetching state |
| 2 | `SleepMaskHero.tsx` | `fetchProducts(10)` in useEffect | `useShopifyProducts(10)` hook |
| 3 | `SleepBundleHero.tsx` | `fetchProducts()` in useEffect | `useShopifyProducts()` hook |
| 4 | `SleepBundleBenefits.tsx` | `fetchProducts()` in useEffect | `useShopifyProducts()` hook |
| 5 | `ProductGallery.tsx` | `fetchProducts()` in useEffect | `useShopifyProducts()` hook |

### What Changes in Each File

For each file, the pattern is the same:

**Remove:**
- The `fetchProducts` import
- The `useState` for product(s)
- The `useEffect` that calls `fetchProducts`

**Add:**
- Import `useShopifyProducts` from `@/hooks/useShopifyProducts`
- Use the hook directly: `const { data: products } = useShopifyProducts(20);`
- Derive the specific product from the cached data using `useMemo` or inline find

### Why This Works

The `useShopifyProducts` hook already:
- Includes `getBuyerCountrySync()` in its React Query cache key
- Calls `fetchProducts()` under the hood (same API)
- Re-fetches when the country changes
- Caches results for 1 minute (stale) / 30 minutes (gc)

So all components will share one API call and always display the same localized prices.
