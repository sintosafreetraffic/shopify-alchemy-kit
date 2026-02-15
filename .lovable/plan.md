

## Full Currency Audit Results

After scanning every file in the codebase, here is the current status:

---

### Already Fixed (no action needed)
All 10 files that previously used the broken `isEU` pattern now correctly use the `buyerCurrency = getCurrencyForCountry(buyerCountry)` resolution. This covers:
- StickyAddToCart, StickyProductNav, ProductGallery, Hero, HeroVariantB, CartDrawer, SleepMaskHero, KneePillowHero, PostATCUpsellModal, RefLandingPage, SleepBundleHero, SleepBundleBenefits, Products.tsx

---

### Remaining Issues Found

#### Issue 1: SleepBundleBenefits -- Hardcoded EUR fallback
**File:** `src/components/SleepBundleBenefits.tsx` (line 57)
**Problem:** When Shopify data is unavailable, the fallback is `formatPrice("109.99", "EUR")` -- a UK visitor would see a EUR price instead of GBP.
**Fix:** Change to `formatPrice("109.99", buyerCurrency)` so the fallback also respects the detected country.

#### Issue 2: Meta Pixel tracking -- EUR fallback in 5 files
**Files:**
- `src/components/Hero.tsx` (line 131)
- `src/components/ab-testing/HeroVariantB.tsx` (line 116)
- `src/components/SleepMaskHero.tsx` (line 74)
- `src/components/KneePillowHero.tsx` (line 54)
- `src/components/SleepBundleHero.tsx` (line 47)

**Problem:** The Meta Pixel `ViewContent` event uses `currencyCode || "EUR"` as fallback. If Shopify returns no currency, a UK visitor's conversion would be tracked as EUR instead of GBP. This does not affect what users see, but it does skew Meta ad reporting (ROAS calculations, revenue attribution).
**Fix:** Change fallback from `"EUR"` to `buyerCurrency` in all 5 files. Since `buyerCurrency` is already computed in each of these components, this is a one-word change per file.

#### Issue 3: InstallmentBadge -- EUR default (low priority)
**File:** `src/components/InstallmentBadge.tsx` (lines 21, 47)
**Problem:** The default `currencyCode` prop is `"EUR"`. If any caller forgets to pass currency, it defaults to EUR. Currently the component is commented out / disabled in usage, so this is cosmetic.
**Fix:** Change default from `"EUR"` to `"USD"` (standard fallback) for safety, though it has no current impact since the badge is disabled.

#### Issue 4: SEO ProductSchema -- Hardcoded USD prices (acceptable)
**Files:** All product pages pass hardcoded prices like `price="59.99"` and `currency` defaults to `"USD"`.
**Verdict:** This is **acceptable** and should NOT be changed. Google structured data / Schema.org prices should be in a single consistent currency. Changing this per-visitor would create invalid/fluctuating structured data.

---

### Summary of Changes

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `SleepBundleBenefits.tsx` | `formatPrice("109.99", "EUR")` to `formatPrice("109.99", buyerCurrency)` | User-facing fallback price |
| 2 | `Hero.tsx` | `currencyCode \|\| "EUR"` to `currencyCode \|\| buyerCurrency` | Meta Pixel accuracy |
| 3 | `HeroVariantB.tsx` | Same as above | Meta Pixel accuracy |
| 4 | `SleepMaskHero.tsx` | Same as above | Meta Pixel accuracy |
| 5 | `KneePillowHero.tsx` | Same as above | Meta Pixel accuracy |
| 6 | `SleepBundleHero.tsx` | Same as above | Meta Pixel accuracy |
| 7 | `InstallmentBadge.tsx` | Default `"EUR"` to `"USD"` (2 places) | Safety net only (badge disabled) |

All 7 changes are single-line fixes. No architectural changes needed.

### Not flagged (acceptable)
- `SEOSchemas.tsx`: Hardcoded USD prices for Google structured data -- correct behavior
- `WeeklyReviewTab.tsx`: Internal dashboard, `$0.00` is fine
- `EntityPerformanceTable.tsx` / `AdsReportingSection.tsx` / `EndTestDialog.tsx`: Internal admin tools with hardcoded EUR -- not customer-facing
- `UrgencyAnnouncementBar.tsx`: No prices, just text
- Code comments referencing specific prices/currencies: Not displayed to users
