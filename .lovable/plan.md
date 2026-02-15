
## Fix: Reactive Buyer Country Detection

### Root Cause
`getBuyerCountrySync()` reads from sessionStorage but is not reactive. On first visit, components render before country detection completes, fetch USD prices from Shopify, then apply the wrong currency symbol (e.g., A$119.99 instead of A$174.00). Nothing triggers a re-fetch once the real country is detected.

### Solution: Create a `useBuyerCountry` hook

Add a small reactive hook that:
1. Returns the cached country immediately (if available)
2. Subscribes to the async detection result
3. Triggers a React state update when country is resolved, causing `useShopifyProducts` to re-run with the correct cache key

### Changes

**1. New file: `src/hooks/useBuyerCountry.ts`**
- A hook that calls `getBuyerCountrySync()` for instant cached value
- Runs `getBuyerCountry()` (async) on mount and updates state when resolved
- Returns `{ country, isDetecting }` so components can optionally show loading states

**2. Update: `src/hooks/useShopifyProducts.ts`**
- Replace `getBuyerCountrySync() ?? "unknown"` with `useBuyerCountry()`
- When the hook's country changes from `null`/`"unknown"` to `"AU"`, React Query automatically sees a new cache key and re-fetches with the correct country
- This cascades to ALL components using `useShopifyProducts`

**3. Update: Components that read `buyerCountry` directly**
These components call `getBuyerCountrySync()` for currency symbol formatting. They also need to use the reactive hook so the currency symbol updates in sync with the price:
- `StickyAddToCart.tsx` (line 62)
- `Hero.tsx`
- `HeroVariantB.tsx`
- `CartDrawer.tsx`
- `SleepMaskHero.tsx`
- `KneePillowHero.tsx`
- `SleepBundleHero.tsx`
- `SleepBundleBenefits.tsx`
- `ProductGallery.tsx`
- `PostATCUpsellModal.tsx`

In each file, replace:
```
const buyerCountry = getBuyerCountrySync() || 'US';
```
with:
```
const { country: buyerCountry } = useBuyerCountry();
```

### How It Works

```text
First Visit Timeline (BEFORE fix):
  t=0ms   Component renders → getBuyerCountrySync() = null → fetch with US → USD prices
  t=2000ms  initializeBuyerContext() completes → AU cached → nothing happens
  Result: A$119.99 (USD price with AUD symbol)

First Visit Timeline (AFTER fix):
  t=0ms   Component renders → useBuyerCountry() = "US" (default) → fetch with US → USD prices
  t=2000ms  useBuyerCountry() detects AU → state update → re-render → new cache key "AU" → fetch with AU → AUD prices
  Result: A$174.00 (correct AUD price)
```

### Technical Details

The `useBuyerCountry` hook implementation:

```typescript
import { useState, useEffect } from 'react';
import { getBuyerCountry, getBuyerCountrySync } from '@/lib/buyerContext';
import type { CountryCode } from '@/lib/countryCode';

export function useBuyerCountry() {
  const [country, setCountry] = useState<CountryCode>(
    getBuyerCountrySync() || 'US'
  );

  useEffect(() => {
    let cancelled = false;
    getBuyerCountry().then((detected) => {
      if (!cancelled && detected !== country) {
        setCountry(detected);
      }
    });
    return () => { cancelled = true; };
  }, []); // runs once on mount

  return { country };
}
```

This is a minimal change -- one new 20-line hook file, one line changed in `useShopifyProducts`, and a simple import swap in ~10 components. No architectural changes needed.
