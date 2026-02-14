
# Fix Compare Price Logic in ValentinesHeroSection

## Problem
The 1 Pillow option still shows a strikethrough compare-at price (e.g., EUR 239.98). Per the requirement:
- **1 Pillow**: No compare price, just the selling price
- **2 Pillows**: Compare price = 2x the selling price (e.g., EUR 239.98 for EUR 119.99 each)

## Changes

### File: `src/components/ValentinesHeroSection.tsx`

**Pricing logic (lines 40-47):**
- Change `regularTwoPrice` from `singleCompareAtPrice * 2` to `productPrice * 2` (dynamic from Shopify)
- Update savings: `savings = (productPrice * 2) - couplesDealPrice`

**1 Pillow card (lines 97-104):**
- Remove the strikethrough compare-at price span (lines 101-103)
- Keep only the selling price

**2 Pillows card (lines 128-135):**
- The strikethrough price stays, but now uses `productPrice * 2` instead of `singleCompareAtPrice * 2`
- This ensures it's always dynamic from Shopify (e.g., EUR 119.99 x 2 = EUR 239.98)

### Result
- 1 Pillow: **EUR 119.99** (no strikethrough)
- 2 Pillows: **EUR 119.99** ~~EUR 239.98~~ Save EUR 119.99
