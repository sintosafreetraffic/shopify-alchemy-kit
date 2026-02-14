
# Arm Numbness Focus for No-Numbness Pillow Page

## 1. Rewrite "back" reviews to focus on arm numbness

### File: `src/components/MiniReviewsCarousel.tsx`

The `backPainReviews` array (lines 63-104) currently talks about "back pain" and "lower back pain." These will be rewritten to focus on **arm numbness, dead arm, and shoulder compression** -- matching the page's "Stop Waking Up With a Numb Arm" positioning.

Example rewrites:
- "I used to wake up with lower back pain" --> "I used to wake up with a completely numb arm and tingling fingers"
- "back sore when I got up" --> "dead arm every morning from side sleeping"
- "back pain stopped" --> "arm numbness is gone"

The `backBody` strings in the `COUNTRY_REVIEWERS` localization map (all 10 countries) will also be updated to match the arm numbness theme, translated appropriately per language.

## 2. Change image sequence for "back" focus to 1-6-2-4-3-5

### File: `src/components/ProductImageCarousel.tsx`

Current sequence (both desktop and mobile): 1-2-3-4-5-6
```
images[0] = Hero
images[1] = Deeper sleep
images[2] = Machine washable
images[3] = Spine alignment
images[4] = Social proof
images[5] = Couple image
```

New sequence for `back` focus: **1-6-2-4-3-5**
```
images[0] = Hero (stays first)
images[5] = Couple image (moves to 2nd)
images[1] = Deeper sleep (moves to 3rd)
images[3] = Spine alignment (moves to 4th)
images[2] = Machine washable (moves to 5th)
images[4] = Social proof (moves to 6th)
```

The `mobileImages` array (lines 121-128) will be updated with the same reordered sequence when `pillowFocus === 'back'`. The desktop `images` array will also be conditionally reordered.

### Technical approach

After building the `images` array, add a conditional reorder block for "back" focus:
```typescript
const orderedImages = pillowFocus === 'back'
  ? [images[0], images[5], images[1], images[3], images[2], images[4]]
  : images;
```

Then use `orderedImages` for both desktop rendering and mobile `mobileImages`.
