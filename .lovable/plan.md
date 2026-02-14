
# Redesign Sticky Add to Cart — Single Floating CTA Button

## Overview
Replace the current multi-element sticky bar (image + title + stars + two buttons) with a single floating "1+1" deal button at the bottom of the screen, styled with rounded corners like the reference screenshot.

## Changes

### File: `src/components/StickyAddToCart.tsx`

**For pillow products only** (the `isPillowProduct` path):

1. **Remove** the full-width bar layout (product image, title, stars, single-pillow CTA)
2. **Replace** with a single floating button centered at the bottom with:
   - Pink background (`bg-pink-500 hover:bg-pink-600`)
   - Fully rounded corners (`rounded-full`)
   - Larger size for easy tapping (`h-12 px-8`)
   - Text: "1+1 Deal — €119.99" (or dynamic price)
   - Bottom margin so it floats above the edge (`bottom-4`)
   - Centered horizontally (`left-1/2 -translate-x-1/2` or `mx-auto`)
3. **Outer wrapper** for pillow products changes from full-width bar to a floating container:
   - Remove `border-t`, `bg-background`, full-width styling
   - Use `w-auto` centered positioning with `rounded-full` and shadow

**Non-pillow products** (bundles, sleep mask) remain unchanged — they keep the current full-width bar.

### Technical Details

- Lines 276-283: Conditionally render a floating wrapper (no border-t, no full-width bg) when `isPillowProduct` is true
- Lines 289-324: Remove the image + title + stars block for pillow products
- Lines 487-523: Replace the two-button CTA section with a single full-width rounded button
- The button calls the existing `handleAddDeal` function
- Keep all existing show/hide logic (`shouldHide`, transitions)
