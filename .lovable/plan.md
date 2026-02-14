

# Fix Sticky Add to Cart Layout

## Problem
The sticky bottom bar currently renders the product title and star ratings side-by-side in a single row, which causes the bar to overflow/fall off on smaller screens. The title should be stacked **above** the stars.

## Solution

### File: `src/components/StickyAddToCart.tsx` (lines 311-327)

Wrap the product title and star ratings in a vertical flex container (`flex-col`) instead of rendering them as siblings in the horizontal row:

**Current structure (flat row):**
```text
[Image] [Title] [Stars + Count] [CTAs]
```

**New structure (title above stars):**
```text
[Image] [ Title          ] [CTAs]
         [ Stars + Count ]
```

Specifically, replace the current `isPillowProduct` block (lines 312-327) with a `div` wrapper using `flex flex-col` that contains:
1. The product title (`span`)
2. The star rating row (`div` with stars + count)

This matches the non-pillow product layout pattern already used at lines 329-341 and prevents horizontal overflow on narrow viewports.
