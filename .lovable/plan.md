
## Fix: Swedish (and Scandinavian) Currency Detection

### Problem
A visitor from Sweden sees **"kr"** in the announcement bar (shipping threshold) but **"$119.99"** as the product price. The announcement bar works because `useShippingConfig` has its own timezone-based fallback, but the main price system fails to detect Sweden because `Europe/Stockholm` is missing from the timezone map in `buyerContext.ts`.

Without detecting `SE`, the system defaults to `US`, sends `@inContext(country: US)` to Shopify, and gets USD prices back. The `shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency` fallback then keeps it as USD since the buyer country is also detected as US.

### Root Cause
In `src/lib/buyerContext.ts`, the `euTimezoneMap` object (line ~120) maps European timezones to country codes but is **missing all Scandinavian timezones**:
- `Europe/Stockholm` (Sweden)
- `Europe/Oslo` (Norway)  
- `Europe/Copenhagen` (Denmark)

### Fix
Add the three missing Scandinavian timezone entries to the `euTimezoneMap` in `buyerContext.ts`:

```
'Europe/Stockholm': 'SE',
'Europe/Oslo': 'NO',
'Europe/Copenhagen': 'DK',
```

This is a **one-file, three-line fix**. Once `SE` is detected:
1. `useBuyerCountry()` returns `SE`
2. `useShopifyProducts` cache key changes to `SE`
3. `fetchProducts` sends `@inContext(country: SE)` to Shopify
4. Shopify returns prices in SEK (e.g., 1,299 kr)
5. All components show `kr` symbol via the existing `formatPrice` logic

### Countries and Currencies Currently Supported

| Country | Currency | Symbol | Detection |
|---------|----------|--------|-----------|
| United States | USD | $ | Timezone (America/*) |
| Eurozone (20 countries) | EUR | euro sign | Timezone + IP |
| United Kingdom | GBP | pound sign | Europe/London |
| Australia | AUD | A$ | Australia/Sydney, Melbourne |
| New Zealand | NZD | NZ$ | Pacific/Auckland |
| Canada | CAD | C$ | IP only (no timezone mapping) |
| **Sweden** | **SEK** | **kr** | **Will add Europe/Stockholm** |
| **Norway** | **NOK** | **kr** | **Will add Europe/Oslo** |
| **Denmark** | **DKK** | **kr** | **Will add Europe/Copenhagen** |

### Technical Details

**File changed:** `src/lib/buyerContext.ts`

Add three lines to the `euTimezoneMap` object (around line 138), after the existing `'Europe/London': 'GB'` entry:

```typescript
// Scandinavian countries (non-Euro, own currencies)
'Europe/Stockholm': 'SE',
'Europe/Oslo': 'NO',
'Europe/Copenhagen': 'DK',
```

No other files need changes -- the existing reactive system (`useBuyerCountry` hook, `@inContext` directive, `formatPrice` with SEK/NOK/DKK support, shipping thresholds) already handles Scandinavian currencies correctly once the country is detected.
