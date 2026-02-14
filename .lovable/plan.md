

## Full Price and Currency Localization Audit

### Overview

The site uses Shopify's `@inContext(country)` directive plus `formatPrice()` / `getCompareAtFromRatio()` utilities for most product prices. However, there are **8 distinct issues** where prices are hardcoded or not localized to the buyer's currency.

---

### Already Working Correctly

These areas dynamically use Shopify API prices with the correct currency:

- Hero product prices (selling + compare-at via ratio fallback)
- SleepBundleHero prices (both Single and Double variants)
- SleepBundleBenefits (dynamic savings calculation from live Shopify data)
- KneePillowHero, SleepMaskHero prices
- StickyAddToCart / StickyProductNav prices
- CartDrawer item prices
- PostATCUpsellModal prices
- ValentinesHeroSection (dynamic `formatPrice` with `currencyCode`)
- WishlistDrawer prices
- ProductGallery prices
- UrgencyBanner and CartDrawer shipping thresholds (recently fixed)

---

### Issues to Fix

#### Issue 1: RefLandingPage -- Hardcoded "$89" and "$129"
**File:** `src/pages/RefLandingPage.tsx` (lines 46-47)
```
price: "$89",
comparePrice: "$129",
```
Static USD strings shown to all visitors regardless of location.

**Fix:** Fetch the ergonomic pillow from Shopify using `useShopifyProducts()`, get the localized price and derive compare-at via `getCompareAtFromRatio()`, then format with `formatPrice()`.

---

#### Issue 2: Hero Toast -- Hardcoded "You save EUR30!"
**File:** `src/components/Hero.tsx` (line 192)
```
`2 pillows added with ${selectedMaskColor} sleep masks. You save €30!`
```
Always shows EUR30 regardless of buyer's currency.

**Fix:** Calculate savings dynamically from the product variant price (2x price minus actual charge) and format with `formatPrice(savings, currencyCode)`.

---

#### Issue 3: SleepBundleFAQ -- Hardcoded USD Prices in Text
**File:** `src/components/SleepBundleFAQ.tsx` (line 11)
```
"You save $30 when purchasing the Complete Sleep Bundle compared to buying each product separately. The regular combined price is $229.97, but the bundle is priced at just $199.99."
```

**Fix:** Rewrite the FAQ answer to remove specific dollar amounts. Use generic language like "You save when purchasing the Complete Sleep Bundle compared to buying each product separately. Check the product page for current pricing."

---

#### Issue 4: ExitIntentPopup -- Hardcoded "(worth $29.99)"
**File:** `src/components/ab-testing/ExitIntentPopup.tsx` (line 81)
```
(worth $29.99) absolutely FREE.
```

**Fix:** Fetch the sleep mask product, get its localized price, and format with `formatPrice()`. Or remove the specific dollar amount and just say "premium silk sleep mask absolutely FREE."

---

#### Issue 5: ProductSchema SEO Structured Data -- Hardcoded USD Prices
**Files:** 6 product pages pass hardcoded USD prices to `ProductSchema`:
- `ErgonomicPillowProductPrevious.tsx`: `price="59.99"`
- `ErgonomicPillowProductVariantB.tsx`: `price="59.99"`
- `KneePillowProduct.tsx`: `price="39.99"`
- `SleepMaskProduct.tsx`: `price="29.99"`
- `SleepBundleProduct.tsx`: `price="109.99"`
- `NoNumbnessPillowProduct.tsx`: `price="59.99"`

**Fix:** These are SEO structured data (JSON-LD) for Google. Google actually recommends using the base currency with `priceCurrency` field. This is **acceptable as-is** for SEO purposes -- Google handles currency conversion. However, if you want them localized, each page would need to pass the Shopify variant price and currency code to the schema component. **Recommendation: Leave these as-is** since they are not user-visible and Google prefers consistent base pricing.

---

#### Issue 6: Fallback Prices in Components (Low Priority)
Several components use hardcoded fallback values when Shopify data hasn't loaded yet:
- `StickyAddToCart.tsx`: `"59.99"`, `"39.99"`, `129.99`, `"199.99"`, `"109.99"`
- `SleepBundleHero.tsx`: `"109.99"`, `"199.99"`
- `SleepBundleBenefits.tsx`: `79.99`, `39.99`, `29.99`, `109.99`
- `HeroVariantB.tsx`: `59.99`
- `PostATCUpsellModal.tsx`: `39.99`
- `StickyProductNav.tsx`: `59.99`
- `ValentinesHeroSection.tsx`: `199.99`

**Assessment:** These are fallback values only shown briefly while Shopify data loads. They appear for a fraction of a second. Since the actual Shopify prices replace them almost immediately, these are **acceptable as-is**. Making them currency-aware would add complexity with minimal benefit.

---

### Recommended Action Plan

| Priority | Issue | Action |
|----------|-------|--------|
| High | Issue 1: RefLandingPage "$89/$129" | Fetch live Shopify prices |
| High | Issue 2: Hero toast "EUR30" | Calculate savings dynamically |
| High | Issue 3: SleepBundleFAQ "$30/$229.97/$199.99" | Remove specific dollar amounts from text |
| High | Issue 4: ExitIntentPopup "$29.99" | Localize or remove specific amount |
| Low | Issue 5: ProductSchema SEO prices | Leave as-is (SEO best practice) |
| Low | Issue 6: Fallback prices | Leave as-is (transient loading states) |

### Files to Modify
- `src/pages/RefLandingPage.tsx` -- fetch Shopify product, localize prices
- `src/components/Hero.tsx` -- dynamic savings in toast message
- `src/components/SleepBundleFAQ.tsx` -- rewrite FAQ text without specific amounts
- `src/components/ab-testing/ExitIntentPopup.tsx` -- localize or genericize sleep mask value
