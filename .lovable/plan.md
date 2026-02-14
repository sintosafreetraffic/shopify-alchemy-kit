

## Full Price Localization Audit -- Remaining Issues

After a thorough scan of the codebase, here are the remaining hardcoded or non-converting price/text values that need fixing:

---

### Issue 1: FooterTrustBadges -- Hardcoded "On orders EUR50+"
**File:** `src/components/FooterTrustBadges.tsx` (line 24)
**Problem:** The shipping threshold sublabel is hardcoded as `"On orders EUR50+"` instead of using the localized `useShippingConfig()` hook.
**Fix:** Import `useShippingConfig` and display `On orders {formattedThreshold}+` so visitors in Sweden see "On orders 500 kr+" and UK visitors see "On orders GBP50+", etc.

---

### Issue 2: PolicyAccordion -- Hardcoded "within the United States"
**File:** `src/components/PolicyAccordion.tsx` (line 18)
**Problem:** Shipping policy text says "within the United States" regardless of the visitor's country.
**Fix:** Use buyer country detection to dynamically insert the country name (e.g., "within Sweden", "within the United Kingdom"), matching the pattern already used in `Hero.tsx` with `buyerCountryName`.

---

### Issue 3: InstallmentBadge -- Hardcoded EUR symbol
**File:** `src/components/InstallmentBadge.tsx` (lines 25, 48)
**Problem:** Klarna installment amounts always show `EUR` symbol (e.g., "4x EUR14.99") regardless of the buyer's currency. The component receives a numeric `price` but has no currency awareness.
**Fix:** Add an optional `currencyCode` prop (defaulting to buyer's detected currency). Use `formatPrice(installmentAmount, currencyCode)` instead of the hardcoded `EUR{amount}` string.

---

### Issue 4: Products.tsx -- Hardcoded "$0.00" fallback
**File:** `src/pages/Products.tsx` (line 330)
**Problem:** If a variant is missing, the fallback price is hardcoded `"$0.00"` instead of using `formatPrice(0, currencyCode)`.
**Fix:** Replace `"$0.00"` with `formatPrice(0, currencyCode)` for consistency.

---

### Issue 5: Deprecated STATIC_PRODUCT_DATA still exported
**File:** `src/hooks/useTrackProductView.ts` (lines 109-149)
**Problem:** The deprecated `STATIC_PRODUCT_DATA` constant with hardcoded `"$59.99"`, `"$39.99"`, etc. is still exported and imported by all product pages (used as fallback). While `getStaticProductData()` now exists, the old constant is still actively referenced as a fallback.
**Fix:** Update the product pages to use `getStaticProductData(handle, currencyCode)` as fallback instead of the deprecated `STATIC_PRODUCT_DATA[handle]`. This ensures even the fallback path is localized.

---

### Summary of files to modify:

| File | Issue | Fix |
|------|-------|-----|
| `FooterTrustBadges.tsx` | "On orders EUR50+" hardcoded | Use `useShippingConfig().formattedThreshold` |
| `PolicyAccordion.tsx` | "within the United States" hardcoded | Use buyer country name dynamically |
| `InstallmentBadge.tsx` | EUR symbol hardcoded in Klarna text | Add `currencyCode` prop, use `formatPrice` |
| `Products.tsx` | `"$0.00"` fallback | Use `formatPrice(0, currencyCode)` |
| `SleepMaskProduct.tsx` | Fallback uses `STATIC_PRODUCT_DATA` | Use `getStaticProductData("sleep-mask", currencyCode)` |
| `KneePillowProduct.tsx` | Fallback uses `STATIC_PRODUCT_DATA` | Use `getStaticProductData("knee-pillow", currencyCode)` |
| `ErgonomicPillowProductVariantB.tsx` | Fallback uses `STATIC_PRODUCT_DATA` | Use `getStaticProductData("ergonomic-pillow", currencyCode)` |
| `SleepBundleProduct.tsx` | Fallback uses `STATIC_PRODUCT_DATA` | Use `getStaticProductData("sleep-bundle", currencyCode)` |
| `useTrackProductView.ts` | Remove deprecated `STATIC_PRODUCT_DATA` export | Clean up after all references updated |

**Not flagged** (acceptable):
- `ai-brain.ts` edge function: USD prices in AI prompt context are fine (not user-facing)
- `compareAtPriceRatios.ts`: USD comment is documentation only
- `WeeklyReviewTab.tsx`: Internal dashboard, "$0.00" is acceptable
- `CartDrawer.tsx` comments referencing EUR: These are code comments, not displayed
- `Hero.tsx` / `HeroVariantB.tsx`: Already properly localized with `buyerCountryName`

