

# Fix Sticky Add to Cart - Keep Single Row, Prevent Overflow

## Problem
The sticky bar content overflows on narrow screens because the title, stars, and CTAs all compete for horizontal space with `flex-shrink-0`.

## Solution

### File: `src/components/StickyAddToCart.tsx` (lines 311-327)

Change the pillow product block to match the efficient pattern already used by non-pillow products (lines 329-341): wrap title and stars in a single `min-w-0 flex-shrink` container so they can shrink gracefully instead of forcing overflow.

**Changes:**
1. Replace the fragment (`<>...</>`) with a `div` using `min-w-0 flex-shrink` (allows the text block to shrink)
2. Keep title on one line with `line-clamp-1` and add `truncate` for safety
3. Move stars below the title (as a second line inside the same div), matching the non-pillow layout
4. Remove `flex-shrink-0` from both the title and the stars row so they yield space to CTAs

**Result:** Everything stays in one horizontal row -- `[Image] [Title + Stars stacked] [CTAs]` -- but the title/stars block shrinks instead of pushing CTAs off-screen.

```
Before: [Image] [Title(no-shrink)] [Stars(no-shrink)] [CTAs]  --> overflows

After:  [Image] [ Title (truncates) ] [CTAs]
                 [ Stars + Count     ]
```

This is the same pattern already working for the non-pillow sticky bar (lines 329-341), just applied to the pillow variant.
