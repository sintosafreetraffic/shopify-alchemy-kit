
# Remove Top Sticky ATC & Fix Bottom Sticky Product Title

## Changes

### 1. Remove StickyProductNav (top sticky bar)
**File: `src/pages/ErgonomicPillowProductVariantB.tsx`**
- Remove the import of `StickyProductNav`
- Remove the `<StickyProductNav />` component from the JSX

The `src/components/StickyProductNav.tsx` file itself will be kept in the codebase (it may be used elsewhere in the future), but it will no longer render on the ergonomic pillow page.

### 2. Verify bottom sticky (StickyAddToCart) shows product title
**File: `src/components/StickyAddToCart.tsx`**
- The product title "RiseByNight Ergonomic Sleep Pillow" is already present at line 314-316
- However, it may be getting truncated or hidden on mobile due to `flex-shrink` and `line-clamp-1` combined with all the other elements competing for space
- Increase the title's minimum width slightly and ensure it renders visibly by giving it `flex-shrink-0` on mobile or adjusting the text size to `text-[11px] sm:text-sm` so it fits within the single-line layout without being crushed to zero width
