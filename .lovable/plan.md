

# Fix: UK visitors seeing `$` instead of `£`

## Root Cause

The `useCurrencySymbol` hook (used by `UrgencyBanner` and available for other components) has a binary return type: `€` or `$`. UK visitors are not in the EU list, so they get `$`.

The `useIsEU` hook used across 12 components is a separate concern -- it's used to override Shopify's currency code when Shopify returns USD for EU users. UK users are correctly handled by Shopify's `@inContext` directive (returns GBP), so `useIsEU` doesn't cause the pound issue.

The bug is specifically in `useCurrencySymbol` and any component that uses it directly.

## Affected Components

- **`UrgencyBanner.tsx`** -- Shows "Free Shipping above $50" to UK users instead of "£50"
- Any future component that calls `useCurrencySymbol()`

## Changes

### 1. `src/hooks/useCurrencySymbol.ts`

Expand the hook to return the actual currency symbol instead of just `€` or `$`:

- Change return type from `'€' | '$'` to `string`
- Import `getCurrencyForCountry` from `countryCode.ts` and `getCurrencySymbol` from `formatPrice.ts`
- Replace the binary EU check with: `getCurrencySymbol(getCurrencyForCountry(country))`
- This means UK users get `£`, AU users get `A$`, CA users get `C$`, etc.
- Keep `useIsEU` unchanged (it serves a different purpose)

### 2. `src/components/UrgencyBanner.tsx`

Update the shipping threshold logic:

- Currently: `currencySymbol === '€' ? '€50' : '$50'`
- Change to: `${currencySymbol}50` so it dynamically shows `£50`, `A$50`, `C$50`, etc.

### 3. `src/lib/buyerContext.ts`

Add `Europe/London` to the timezone map so UK users are correctly detected even when IP geolocation is blocked:

- Add `'Europe/London': 'GB'` to the timezone fallback map (currently only EU timezones are mapped, so UK users with blocked IP fall back to US)

## What stays the same

- `formatPrice.ts` -- already has GBP/£ mapping, no changes needed
- `countryCode.ts` -- already has GB mapped to GBP, no changes needed
- All 12 components using `useIsEU` -- they work correctly as-is for the EU/USD override logic
- Shopify `@inContext` queries -- already pass GB correctly and return GBP prices

## Expected result

| Visitor from | Before | After |
|---|---|---|
| UK | "Free Shipping above $50" | "Free Shipping above £50" |
| Australia | "Free Shipping above $50" | "Free Shipping above A$50" |
| Canada | "Free Shipping above $50" | "Free Shipping above C$50" |
| EU | "Free Shipping above €50" | "Free Shipping above €50" (unchanged) |
| US | "Free Shipping above $50" | "Free Shipping above $50" (unchanged) |

