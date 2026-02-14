
# Align Bottom Sticky ATC with Upper Sticky Layout

## Goal
Make the bottom sticky bar (StickyAddToCart) match the upper sticky bar (StickyProductNav) layout: everything on one single line with product image, title, 1+1 badge, stars, reviews, and two CTA buttons. Also add the product title to the upper sticky bar.

## Changes

### 1. `src/components/StickyAddToCart.tsx` (pillow product section, lines 289-335)
Restructure the pillow product layout to match StickyProductNav's single-line format:

**Current layout (two rows):**
- Row 1: Image + title + badge/stars/reviews
- Row 2: Two CTA buttons (full width on mobile)

**New layout (one row, matching upper sticky):**
- Image (w-9 h-9) | Title "RiseByNight Ergonomic Sleep Pillow" | 1+1 Deal badge | Stars | "6,247 reviews" | [Add single CTA] [1+1 Deal CTA]

Key changes:
- Remove `flex-wrap` from the outer container and use `flex-nowrap`
- Show product title as `text-sm font-semibold line-clamp-1`
- Keep badge, stars, reviews inline
- Move CTAs to `ml-auto` like StickyProductNav
- Size buttons to match upper sticky (h-8, text-[11px] sm:text-xs)

### 2. `src/components/StickyProductNav.tsx` (line 138-168)
Add the product title "RiseByNight Ergonomic Sleep Pillow" between the image and star ratings:

- Add `<span className="font-semibold text-sm line-clamp-1 hidden sm:block">RiseByNight Ergonomic Sleep Pillow</span>` after the image
- On mobile, the title will be hidden to keep things compact (image + stars + CTAs is enough)
- Actually, looking at the screenshot reference, the title IS shown on mobile too in the upper sticky. So show it on all screens with truncation.

## Visual Result (both bars)
```
[img] RiseByNight Ergonomic Sleep Pillow  [1+1 Deal] ★★★★★ 6,247  [€119.99] [1+1 €119.99]
```
