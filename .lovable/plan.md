
# Ergonomic Pillow PDP Updates

## 1. Reorder Product Images (1-3-2-6-4-5)

**File: `src/components/ProductImageCarousel.tsx`**

Current image order in the `images` array (lines 108-115):
1. Hero (neck/back variant)
2. Machine washable cover
3. Deeper sleep
4. Trusted/social proof
5. Couple image
6. Spine alignment

New order: 1-3-2-6-4-5 means:
1. Hero (stays)
2. Deeper sleep (was 3)
3. Machine washable (was 2)
4. Spine alignment (was 6)
5. Trusted/social proof (was 4)
6. Couple image (was 5)

Update both the `images` array and the `mobileImages` array to reflect this new order.

---

## 2. Fix Mini Reviews Size (Robert Johnson)

**File: `src/components/MiniReviewsCarousel.tsx`**

Robert Johnson's review (neck index 1) is the longest text. The carousel items use `text-sm sm:text-base` which auto-sizes, but longer text makes the card taller. To normalize height, add a `line-clamp-4` or similar max-height constraint to the review text `<p>` tag so all reviews render at the same visual height. Alternatively, slightly shorten Robert Johnson's review text to match the others.

Best approach: Add `line-clamp-4` to the review body text (line 158) so all cards have equal max height.

---

## 3. Make "6,247 verified product reviews" Not Bold

**File: `src/components/ab-testing/HeroVariantB.tsx`**

- Line 214 (mobile): Change `font-semibold` to `font-normal` in the span
- Line 359 (desktop): Change `font-semibold` to `font-normal` in the span

---

## 4. Change Image for "Join Our Happy Sleepers" Section

**File: `src/components/Features.tsx`**

The first feature uses `pillow-reviews-hero.webp`. Replace this import with the user's uploaded image. The uploaded image will be saved as a new asset and referenced in place of `pillow-reviews-hero.webp`.

---

## 5. Remove "40% OFF" Badge and Use Ratio-Based Compare-at Price

**File: `src/components/ab-testing/HeroVariantB.tsx`**

- Remove the "40% OFF" badge from both mobile (lines 231-233) and desktop (lines 376-378)
- The compare-at price (strikethrough) should use the ratio-based system already implemented -- currently `compareAtPrice` on line 183 falls back to `199.99`. Update to use `getCompareAtFromRatio` when variant compareAtPrice is missing/zero, ensuring the strikethrough is always 2x the selling price regardless of currency.

---

## 6. Country-Specific Free Shipping Text

**File: `src/components/ab-testing/HeroVariantB.tsx`**

Currently hardcoded as "Free shipping in US" (lines 255 and 400). Use `getBuyerCountrySync()` from `buyerContext.ts` and `COUNTRY_NAMES` from `countryCode.ts` to dynamically show the user's detected country name. For example: "Free shipping in Netherlands", "Free shipping in United Kingdom", etc.

Also update `src/components/Hero.tsx` (line 378) for consistency.

---

## 7. Fix Upper Sticky ATC (StickyProductNav) Overlapping Header

**File: `src/components/StickyProductNav.tsx`**

Currently uses `top-0` and `z-[90]`. The header is at `top-[36px]` (below 36px announcement bar) with `z-[75]` and height ~56-64px. The sticky nav needs to sit ABOVE the header stack, so change its `top` value to account for the announcement bar + header height:

- Change `top-0` to `top-[92px]` (36px announcement + 56px header) on mobile or use a dynamic approach with `useHeaderHeight`
- Alternatively, increase z-index and ensure proper stacking

---

## 8. Add Product Image and Reviews to Both Sticky Bars on Mobile

**File: `src/components/StickyProductNav.tsx`**

Currently hides the product image on mobile (only shows on `sm:` breakpoint). Show the product image on mobile too. Add star ratings and review count text on mobile similar to desktop.

**File: `src/components/StickyAddToCart.tsx`**

Currently hides product image (`hidden sm:block` on line 292) and product info (`hidden sm:block` on line 311) on mobile. Make these visible on mobile with compact sizing. Add star ratings row for mobile view.

---

## Summary of Files to Edit

| File | Changes |
|------|---------|
| `src/components/ProductImageCarousel.tsx` | Reorder images to 1-3-2-6-4-5 |
| `src/components/MiniReviewsCarousel.tsx` | Normalize review card heights |
| `src/components/ab-testing/HeroVariantB.tsx` | Un-bold reviews text, remove 40% badge, dynamic country shipping, ratio compare-at price |
| `src/components/Features.tsx` | Replace "Join Our Happy Sleepers" image |
| `src/components/StickyProductNav.tsx` | Fix overlap with header, add product image + reviews on mobile |
| `src/components/StickyAddToCart.tsx` | Show product image + reviews on mobile |
| `src/components/Hero.tsx` | Dynamic country shipping text |
