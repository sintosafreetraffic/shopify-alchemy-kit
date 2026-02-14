

# Fix Products Page: Image Container, Compare-at Prices, and Bundle Badge

## Changes

### 1. Tighter Image Container
The current product card image area uses `aspect-[4/3]` which creates a wide, tall container. Change it to `aspect-square` and reduce the inner padding from `p-4` to `p-2`, so the container hugs the product image more closely, resulting in a cleaner, more compact look.

### 2. Restrict Compare-at Price to Two Products Only
Currently, the compare-at price is pulled from Shopify data for every product. Add a whitelist so only the ergonomic pillow and the sleep bundle display the strikethrough price. The knee pillow and sleep mask will show only the current price.

**Whitelist handles:**
- `risebynight-ergonomic-sleep-pillow` (and its variant B copy)
- `rise-by-night™-complete-sleep-bundle`

### 3. Change Sleep Bundle Badge from "Save 20%" to "Best Offer"
Update the `PRODUCT_REVIEWS` static data entry for the sleep bundle handle, changing the `badge` value from `"Save 20%"` to `"Best Offer"`.

---

## Technical Details

**File: `src/pages/Products.tsx`**

- **Line 30**: Change `badge: "Save 20%"` to `badge: "Best Offer"` in `PRODUCT_REVIEWS`.
- **Line 118**: Change `aspect-[4/3]` to `aspect-square` on the image container div.
- **Line 123**: Reduce padding from `p-4` to `p-2` on the image element.
- **Lines 330-332**: Add a handle-based whitelist check so `compareAtPrice` is only passed for the two eligible products. For all others, force it to `null`.

