

## Full Pricing Audit: Cart, Product Pages, and Storefront

I've reviewed all 19+ files with hardcoded price values. Since you've now set native GBP prices in Shopify, the Storefront API will return GBP amounts directly for UK visitors (no more conversion artifacts like £92.56). Here's the full status:

---

### CartDrawer.tsx -- FIXED (previous changes)
The cart drawer now correctly uses `currentPrices` for all items, recommendations, and free gift mask pricing. No remaining hardcoded EUR pricing logic.

One stale comment on line 184 still references "€119.99" but is cosmetic only -- no functional impact.

---

### Issues Found -- Hardcoded EUR Fallback Values

These are fallback values used when Shopify data hasn't loaded yet. They show briefly during loading. Since your base currency is now GBP in Shopify, these EUR fallbacks would briefly flash incorrect prices for *all* visitors, not just UK ones.

**Priority 1 -- Customer-Facing Product Pages (would show wrong price on slow load):**

| File | Line | Hardcoded Value | Used When |
|------|------|----------------|-----------|
| `StickyAddToCart.tsx` | 225 | `"59.99"` | Ergonomic pillow fallback |
| `StickyAddToCart.tsx` | 227 | `"39.99"` | Knee pillow fallback |
| `StickyAddToCart.tsx` | 228 | `129.99` | Generic product fallback |
| `StickyAddToCart.tsx` | 233 | `"199.99"` | Double bundle fallback |
| `StickyAddToCart.tsx` | 234 | `"109.99"` | Single bundle fallback |
| `ProductGallery.tsx` | 108 | `"39.99"` | Knee pillow gallery fallback |
| `ProductGallery.tsx` | 127 | `"29.99"` | Sleep mask gallery fallback |
| `Hero.tsx` | 105 | `29.99` | Sleep mask price fallback |
| `Hero.tsx` | 222 | `59.99` | Product price fallback |
| `HeroVariantB.tsx` | 182 | `59.99` | Variant B price fallback |
| `StickyProductNav.tsx` | 45 | `59.99` | Nav price fallback |
| `KneePillowHero.tsx` | 109 | `39.99` | Knee pillow hero fallback |
| `SleepMaskHero.tsx` | 157 | `29.99` | Sleep mask hero fallback |
| `PostATCUpsellModal.tsx` | 59 | `39.99` | Upsell modal fallback |
| `ValentinesHeroSection.tsx` | 41 | `199.99` | Compare-at fallback |
| `SleepBundleBenefits.tsx` | 43-48 | `79.99, 39.99, 29.99, 109.99` | Bundle savings calc fallbacks |
| `SleepBundleProduct.tsx` | 35-36 | `"149.99"` | Bundle product page fallback |
| `KneePillowProduct.tsx` | 45 | `"39.99"` | Knee pillow page fallback |
| `ErgonomicPillowProductVariantB.tsx` | 140-141 | `"59.99"` | Variant B page fallback |
| `RefLandingPage.tsx` | 95 | `59.99` | Referral landing fallback |
| `CartDrawer.tsx` | 269,271 | `29.99` | Sleep mask free gift fallback |
| `abProductConfig.ts` | 24,31 | `59.99` | A/B config static price |

**Priority 2 -- Analytics/Tracking (internal, not customer-facing):**

| File | Line | Value | Context |
|------|------|-------|---------|
| `useTrackProductView.ts` | 62,70,84 | `59.99, 39.99, 149.99` | Analytics base prices |
| `cartStore.ts` | 236,241 | `'EUR'` | Checkout tracking currency fallback |

**Priority 3 -- Internal/Admin only (no customer impact):**
- `shopify-profit-stats`, `chaos-webhook-replay`, `MetaSourceTruthSection`, `AttributionSourceTruthTab`, `PinterestEQSCard` -- all use EUR for internal reporting. No change needed unless you want reporting in GBP.

---

### Shipping Thresholds -- OK but worth noting
`shippingThresholds.ts` has GBP threshold at £50 with £14.99 shipping. These are intentional business values, not conversion artifacts. **No change needed** unless you want different GBP thresholds.

---

### Recommended Fix

**Update all Priority 1 fallback values from EUR to GBP equivalents.** Since these are only shown during the brief loading state before Shopify data arrives, they should match your new base currency (GBP). The fix is straightforward: replace each EUR fallback with its GBP equivalent (e.g., 59.99 -> the GBP price you set in Shopify for that product).

However, there's a cleaner architectural approach: since the Shopify data loads very quickly, these fallbacks rarely display. We could either:
1. **Update all fallbacks to GBP values** (quick, matches your new base currency)
2. **Show a loading skeleton instead of fallback prices** (prevents any incorrect price flash, but more work)

I'd recommend option 1: update the ~20 fallback values to match your new GBP Shopify prices. This is a single-file-per-component change, all mechanical.

For **Priority 2** (cartStore.ts), the `'EUR'` fallback on lines 236 and 241 should be changed to `'GBP'` since that's now your base currency.

The `abProductConfig.ts` price field (59.99) is used as a last-resort fallback in the A/B config. This should also be updated to the GBP price.

---

### What's Already Working Correctly
- Cart line item prices use `currentPrices` cache (localized by Shopify)
- Cart recommendation prices use `currentPrices` with `cartCurrency`
- Free gift mask pricing uses `currentPrices` lookup
- Valentine's 1+1 deal uses localized prices
- Checkout sends variant IDs only (Shopify calculates correct price server-side)
- Currency symbol resolution (`shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency`) works correctly
- Shipping thresholds are currency-aware
- Compare-at price ratio system works with any base currency

