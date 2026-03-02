

## Fix: Cart pricing bug for non-EUR visitors

### Problem
Two locations in `CartDrawer.tsx` hardcode `119.99` (an EUR value) for the ergonomic pillow price. For non-EUR visitors (UK, AUS, NZ, Scandinavia), this EUR number gets displayed with the local currency symbol (e.g., "£119.99" instead of "£91").

### Root Cause
The Valentine's/BOGO override in `getItemPrice()` bypasses Shopify's localized pricing and returns a fixed EUR number.

### Changes (single file: `src/components/CartDrawer.tsx`)

**1. Fix `getItemPrice` function (lines 185-190)**
Replace the hardcoded `return 119.99` with the actual Shopify-localized price:
```ts
if (valentinesOffer.isActive && 
    item.product.node.title.toLowerCase().includes('ergonomic sleep pillow')) {
  // Use Shopify's localized price (already currency-correct for UK/AUS/etc.)
  const currentPrice = currentPrices[item.variantId];
  return currentPrice ? parseFloat(currentPrice.price) : parseFloat(item.price.amount);
}
```
This removes the EUR override entirely. The 1+1 deal discount logic downstream already handles "buy 2 pay for 1" by subtracting one pillow's price -- it just needs that price to be the correct localized one.

**2. Fix `ergonomicPillowPrice` fallback (line 222)**
Replace `return 119.99` with the localized price from `currentPrices` or the cart item's stored price:
```ts
// Try to get price from currentPrices for any ergonomic pillow variant
const ergoPriceEntry = Object.entries(currentPrices).find(([_, p]) => 
  items.some(i => i.variantId === _ && 
    i.product.node.title.toLowerCase().includes('ergonomic sleep pillow'))
);
if (ergoPriceEntry) return parseFloat(ergoPriceEntry[1].price);
return parseFloat(items[0]?.price.amount || '0');
```

### How the 1+1 deal still works
The Valentine's discount calculation (lines 227-235) computes `pairs * ergonomicPillowPrice`. With the fix, `ergonomicPillowPrice` will be ~91 for GBP visitors, so the discount correctly subtracts £91 (not €119.99). The customer sees:
- Subtotal: 2 x £91 = £182
- 1+1 Discount: -£91
- Total: £91

### No other files affected
The search confirmed `119.99` only appears as a pricing value in `CartDrawer.tsx`. The `compareAtPriceRatios.ts` file uses it only in comments for ratio documentation.

