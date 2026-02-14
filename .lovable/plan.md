
## Ensure Mini Reviews Fit Without Truncation

### Problem
The MiniReviewsCarousel component (`src/components/MiniReviewsCarousel.tsx`, line 250) uses `line-clamp-4` CSS, which truncates review text with "..." if it exceeds 4 lines. On some screen sizes (especially at the `sm:text-base` breakpoint at 640px+), the longer reviews can get cut off.

### Solution
Two changes to guarantee reviews always display fully:

1. **Remove `line-clamp-4`** from line 250 in `MiniReviewsCarousel.tsx` so text is never artificially truncated.

2. **Shorten the two longest neck-pain reviews** to keep the carousel cards compact:

   - **Robert Johnson** (line 33): Currently ~200 chars. Shorten to:  
     *"My neck pain was every day from side sleeping. This keeps my head level and the neck pain stopped. No more sharp morning neck thing."*

   - **Margaret Williams** (line 25): Currently ~195 chars. Shorten to:  
     *"I'm 61 and was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that."*

   Back-pain reviews are already short enough and need no changes.

3. **Update matching localized review texts** (GB, AU, NZ, CA country overrides) to keep them similarly concise.

### Technical Details
- File: `src/components/MiniReviewsCarousel.tsx`
- Line 250: Remove `line-clamp-4` from the paragraph class
- Lines 25, 33: Shorten the `body` text for neck reviews 1 and 2
- Lines 114-156: Trim corresponding `neckBody` strings in country overrides (GB, AU, NZ, CA) to match
- No layout or structural changes needed
