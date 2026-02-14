

# Update Sleep Mask Image and Verify Compare-at Pricing

## Changes

### 1. Replace Sleep Mask Image for Recently Viewed
Copy the uploaded image (`user-uploads://image-11.png`) to `src/assets/` as the new sleep mask product shot. Then update `src/hooks/useTrackProductView.ts` to import this new image for the `sleep-mask` static entry. Bump the cache version in `RecentlyViewedItems.tsx` from 3 to 4 so all users see the new image.

### 2. Replace Sleep Mask Image on the Product Page
Update `src/components/SleepMaskHero.tsx` (or the relevant image carousel component) to use this new image as the primary hero/product shot for the sleep mask, replacing the current `sleep-mask-product-shot.webp`.

### 3. Replace Sleep Mask Image on the Products Listing Page
The `/products` page pulls images from Shopify. The first image shown is the Shopify product image. If the Shopify image should also change, that needs to be done in Shopify admin. However, if a static override is needed, we can map the sleep mask handle to use this new local image instead.

### 4. Verify Compare-at Pricing on Individual Product Pages
The ergonomic pillow (`HeroVariantB`) and sleep bundle (`SleepBundleHero`) already display compare-at prices dynamically from Shopify with a strikethrough. No changes needed there. The `/products` listing page also already shows compare-at prices for these two products via the whitelist. This will be confirmed with no code changes required.

---

## Technical Details

**Files to modify:**

1. **Copy image**: `user-uploads://image-11.png` to `src/assets/sleep-mask-product-shot-new.webp` (or `.png`)
2. **`src/hooks/useTrackProductView.ts`**: Update the sleep-mask entry's image import to use the new asset
3. **`src/components/home/RecentlyViewedItems.tsx`**: Bump `CURRENT_VERSION` from 3 to 4
4. **`src/components/SleepMaskHero.tsx`** or **`src/components/SleepMaskImageCarousel.tsx`**: Update primary product image reference to the new asset

**No changes needed for compare-at prices** -- the ergonomic pillow and sleep bundle product pages already show dynamic Shopify compare-at prices with strikethrough styling.

