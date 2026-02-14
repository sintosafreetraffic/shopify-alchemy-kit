

## Fix Free Shipping Threshold for Currency Localization

### Problem
The "Free Shipping above X" amount is hardcoded as "50" everywhere, which is incorrect for currencies like SEK, NOK, DKK (where 50 is far too low -- should be ~500), and doesn't show the correct currency symbol in several places. There are also spots with hardcoded "euro50" text.

### Affected Files

| File | Issue |
|------|-------|
| `src/components/UrgencyBanner.tsx` | Shows `${symbol}50` -- correct symbol but wrong amount for Scandinavian currencies |
| `src/components/CartDrawer.tsx` | `FREE_SHIPPING_THRESHOLD = 50` and `SHIPPING_COST = 14.99` hardcoded |
| `src/components/EmptyCartCTA.tsx` | Hardcoded string "Free shipping on orders over euro50" |
| `src/pages/Home.tsx` | Hardcoded "Free Shipping on euro50+" in trust bar |

### Solution

**1. Create `src/lib/shippingThresholds.ts`** -- a shared utility mapping currency codes to the correct free-shipping threshold and shipping cost:

| Currency | Threshold | Shipping Cost |
|----------|-----------|---------------|
| USD, EUR, GBP, CAD, AUD, NZD | 50 | 14.99 |
| SEK | 500 | 149 |
| NOK | 500 | 149 |
| DKK | 350 | 99 |

Export a `getShippingConfig(currencyCode)` function returning `{ threshold, shippingCost }`.

**2. Create `src/hooks/useShippingConfig.ts`** -- a hook that combines buyer country detection with the threshold utility, returning the localized threshold and shipping cost.

**3. Update `src/components/UrgencyBanner.tsx`** -- use the new hook to get the correct threshold amount instead of hardcoded "50".

**4. Update `src/components/CartDrawer.tsx`** -- replace the hardcoded `SHIPPING_COST` and `FREE_SHIPPING_THRESHOLD` constants with values from the shipping config, based on the cart's currency.

**5. Update `src/components/EmptyCartCTA.tsx`** -- replace the hardcoded "euro50" string with a dynamic value using `useCurrencySymbol()` and the shipping threshold hook.

**6. Update `src/pages/Home.tsx`** -- replace "Free Shipping on euro50+" with a dynamically formatted string using the buyer's currency symbol and threshold.

### Technical Details

- The shipping config hook will use `getBuyerCountrySync()` / `getBuyerCountry()` to determine the country, then `getCurrencyForCountry()` to get the currency code, and finally `getShippingConfig()` to get the correct numbers.
- `formatPrice()` will be used where a fully formatted price string is needed (e.g., in the cart drawer progress bar).
- Simple `${symbol}${threshold}` concatenation will be used for short display strings (banner, trust bar).

