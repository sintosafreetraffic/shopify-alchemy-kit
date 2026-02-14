

# Fix: Sleep Mask Image and Fractional Star Ratings

## Problem 1: Wrong Sleep Mask Image
The homepage product gallery shows a marketing banner image (with text overlay like "The power to feel your best again...") for the Silk Sleep Mask. It should show a clean product-only photo.

**Root cause**: `ProductGallery.tsx` imports `eye-mask-gift-new.webp` (a marketing banner) instead of `sleep-mask-product-shot.webp` (a clean product photo).

**Fix**: Change the import on line 18 from `eye-mask-gift-new.webp` to `sleep-mask-product-shot.webp`.

---

## Problem 2: Stars Only Show 3 Filled Instead of 4.8
The fractional star rendering is broken -- a 4.8 rating displays as roughly 3 filled stars.

**Root cause**: The `StarRating` component places a lucide `Star` component (which renders its own `<svg>` element) inside a parent `<svg>`. This nested-SVG situation causes the `clipPath` to not apply correctly, resulting in broken rendering.

**Fix**: Replace the nested lucide `Star` components in the partial-star branch with raw SVG `<path>` elements using the actual star path data (`d` attribute from the lucide star icon). This avoids nested SVGs and allows the `clipPath` to work correctly.

For full and empty stars (non-partial), the existing lucide `Star` component works fine and can stay as-is.

---

## Files to Change

1. **`src/components/ProductGallery.tsx`** -- Update the sleep mask image import
2. **`src/components/ui/star-rating.tsx`** -- Fix the partial star rendering by using raw SVG path instead of nested lucide `Star` components

## Technical Details

The lucide star path data is: `M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z`

For partial stars, the component will render a single `<svg>` containing:
- A background path (gray/muted fill for the empty portion)
- A `<clipPath>` with a `<rect>` sized to `width = 24 * fillFraction`
- A foreground path clipped to show only the filled portion in amber/yellow
