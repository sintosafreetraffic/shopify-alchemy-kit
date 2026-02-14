

## Fix: Knee Pillow Sticky CTA Shows "1+1 Deal" Instead of "ADD TO CART"

### Problem
The floating sticky button at the bottom of the page shows "1+1 Deal -- price" for **all pillow products**, including the Knee Pillow. The 1+1 deal should only apply to the Ergonomic Pillow. The Knee Pillow should display a simple "ADD TO CART" button.

### Root Cause
In `src/components/StickyAddToCart.tsx`, line 43 defines `isPillowProduct = isErgonomicPillow || isKneePillow`. The floating button block (lines 277-306) checks `if (isPillowProduct)` and renders the "1+1 Deal" button with `handleAddDeal` (which adds quantity 2) for both products.

### Solution
Update the floating button section to differentiate between the Ergonomic Pillow (gets "1+1 Deal") and the Knee Pillow (gets "ADD TO CART"):

- **Ergonomic Pillow**: Keep the current pink "1+1 Deal -- price" button calling `handleAddDeal` (adds 2)
- **Knee Pillow**: Show a pink "ADD TO CART" button (uppercase) calling `handleAddToCart` (adds 1)

Both still use the floating pill-shaped style. Only the label and handler differ.

### File to Modify
- `src/components/StickyAddToCart.tsx` -- Update the `isPillowProduct` floating button block (lines 286-301) to conditionally render different text/handler based on `isErgonomicPillow` vs `isKneePillow`

