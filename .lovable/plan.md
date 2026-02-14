

## Fix: Broken Currency Override Pattern Across 9 Files

### Root Cause

Every component that displays prices uses this pattern to determine currency:

```
const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;
```

This is broken because:
- **UK (GB)**: GB is not in the `EU_COUNTRIES` list, so `isEU` is `false`. If Shopify returns USD (which it often does for non-US visitors), it stays as USD instead of becoming GBP.
- **Denmark (DK)**: DK is in `EU_COUNTRIES`, so `isEU` is `true`. The override converts USD to EUR -- but Denmark uses DKK, not EUR.
- **Sweden (SE)**: Same problem as Denmark -- gets EUR instead of SEK.

Meanwhile, components like the announcement bar, footer trust badges, and shipping config work correctly because they use `getCurrencyForCountry(buyerCountry)` which properly maps each country to its actual currency (GB to GBP, DK to DKK, SE to SEK, etc.).

### The Fix

Replace the broken `isEU` override pattern in all 9 files with a proper buyer-country-aware currency resolution:

```
const buyerCountry = getBuyerCountrySync() || 'US';
const buyerCurrency = getCurrencyForCountry(buyerCountry);
const currencyCode = shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency;
```

This means: if Shopify returns the correct localized currency, use it. If Shopify returns USD (fallback), use the currency we know the buyer should see based on their detected country.

### Files to Update

All 9 files that use the `(isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency` pattern:

| # | File | Current (broken) | After fix |
|---|------|-------------------|-----------|
| 1 | `StickyAddToCart.tsx` | `isEU && shopifyCurrency === 'USD'` overrides to EUR | Uses `getCurrencyForCountry` for proper GBP/DKK/SEK |
| 2 | `StickyProductNav.tsx` | Same broken pattern | Same fix |
| 3 | `ProductGallery.tsx` | Same broken pattern | Same fix |
| 4 | `SleepMaskHero.tsx` | Same broken pattern | Same fix |
| 5 | `PostATCUpsellModal.tsx` | Same broken pattern | Same fix |
| 6 | `RefLandingPage.tsx` | Same broken pattern | Same fix |
| 7 | `Hero.tsx` | Same broken pattern | Same fix |
| 8 | `CartDrawer.tsx` | Same broken pattern | Same fix |
| 9 | `KneePillowHero.tsx` | Same broken pattern | Same fix |

### What stays the same
- `useIsEU` hook itself is fine and can remain for non-currency logic
- `getCurrencyForCountry` already handles all country-to-currency mappings correctly
- `getBuyerCountrySync` is already imported in several of these files

### Expected Results After Fix
- **UK**: All prices in GBP (pounds)
- **Denmark**: All prices in DKK (kr)
- **Sweden**: All prices in SEK (kr)
- **Germany/Ireland**: All prices in EUR (unchanged, still works)
- **USA**: All prices in USD (unchanged)
- **Australia/NZ/Canada**: Correct local currencies

