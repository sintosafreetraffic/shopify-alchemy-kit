

# Shorten Mini Reviews for No-Numbness Pillow Page

## Problem
The review texts in the `backPainReviews` array are too long, causing them to overflow or get clipped (via `line-clamp-4`) in the mini reviews carousel on the `/products/no-numbness-pillow` page.

## Solution

### File: `src/components/MiniReviewsCarousel.tsx`

Shorten all 5 `backPainReviews` body texts to fit comfortably within the 4-line clamp. Each review will be trimmed to roughly 1-2 concise sentences while keeping the arm numbness focus intact.

**Revised review texts:**

1. **Margaret Williams**: "I used to wake up with a completely numb arm and tingling fingers. After a week on this pillow it's basically gone."
2. **Robert Johnson**: "Side sleeping gave me a dead arm every morning. This pillow stops the shoulder compression — no more shaking my hand to get feeling back."
3. **Patricia Anderson**: "Turns out my old pillow was compressing my shoulder all night. This one takes the pressure off and the arm numbness is gone."
4. **David Patterson**: "I was stacking pillows trying to stop the dead arm. This one fixed it fast — no more pins and needles in the morning."
5. **Susan Miller**: "I sleep on my side and don't wake up with a numb arm anymore. This pillow keeps my shoulder from getting crushed all night."

### Localized reviews (COUNTRY_REVIEWERS)

The `backBody` strings for all 10 locales (NL, GB, AU, NZ, SE, NO, DK, DE, FR, CA) will also be shortened to match the same concise length, preserving the translated arm-numbness messaging.
