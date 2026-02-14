

# Fix Knee Pillow Thumbnail Borders

## Problem
The `overflow-hidden` on the thumbnail button clips the active state `ring-2 ring-primary ring-offset-1`, causing the blue selection border to be cut off. But removing `overflow-hidden` causes the image to overflow the rounded corners.

## Solution

**File: `src/components/KneePillowImageCarousel.tsx`** (lines 80-84)

Replace the `ring` approach with `outline` for the active state, since CSS `outline` is not clipped by `overflow-hidden`:

- Keep `overflow-hidden` on the button (needed to clip the image to rounded corners)
- Replace `ring-2 ring-primary ring-offset-1` with `outline outline-2 outline-offset-1 outline-primary`
- This achieves the same visual effect without being clipped

