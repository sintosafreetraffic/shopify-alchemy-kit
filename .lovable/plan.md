

# Knee Pillow Page: Remove Guarantees + Fix Thumbnail Borders

## 1. Remove the guarantees grid from the hero

**File: `src/components/KneePillowHero.tsx`** (lines 296-309)

Remove the entire `grid grid-cols-3` block containing "2-Year Warranty", "100 nights risk free trial", and "Easy Returns" icons and text.

## 2. Fix thumbnail image borders

**File: `src/components/KneePillowImageCarousel.tsx`** (line 90)

The border on the button is visible but the image inside overflows the rounded corners. Add `rounded-lg` to the `<img>` element so the image respects the button's border radius. This ensures the contour is fully visible around each thumbnail.

