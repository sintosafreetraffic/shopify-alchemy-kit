

## Fix: All products showing EUR/wrong currency in slide cart

### Problem
Two issues remain in `CartDrawer.tsx`:

1. **Recommendation products (lines 544, 1029)** use `variant.price.currencyCode` directly from Shopify's raw response, which sometimes returns `USD` even for non-US visitors. The rest of the cart correctly uses `cartCurrency` (which applies the `shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency` fix). This means recommendations can show "$92.56" instead of "£92.56" for UK visitors.

2. **Sleep mask price fallback (line 269, 271)** hardcodes `29.99` (EUR). If the free gift mask product isn't found, UK visitors would see "£29.99" instead of the correct GBP value.

3. **Price amounts from Shopify conversion**: The `@inContext(country)` directive makes Shopify return converted prices (e.g., GBP equivalent of EUR 119.99 = ~£92.56). This is Shopify's automatic currency conversion -- the amounts are correct for the currency, but they may look "odd" compared to round EUR prices. This is expected behavior from Shopify's multi-currency feature and can only be changed by setting specific GBP prices in Shopify's Markets settings.

### Changes (single file: `src/components/CartDrawer.tsx`)

**1. Desktop recommendation prices (line 544)**
Replace `variant.price.currencyCode` with `cartCurrency`, and use `currentPrices` lookup for amount:
```
Before: {formatPrice(variant.price.amount, variant.price.currencyCode)}
After:  {formatPrice(currentPrices[variant.id]?.price ?? variant.price.amount, cartCurrency)}
```

**2. Mobile recommendation prices (line 1029)**  
Same fix as desktop.

**3. Sleep mask price (lines 268-272)**
Use `currentPrices` lookup for the mask variant instead of raw `variant.price.amount`, and update the `29.99` fallback to pull from localized data:
```ts
const variant = freeGiftMaskProduct.node.variants.edges[0]?.node;
const variantId = variant?.id;
if (variantId && currentPrices[variantId]) {
  return parseFloat(currentPrices[variantId].price);
}
return variant ? parseFloat(variant.price.amount) : 29.99;
```

### About the £92.56 "odd" price
The ~£92.56 GBP price (instead of a round £91 or £90) comes from Shopify's automatic currency conversion of EUR 119.99 at the current exchange rate. To get round GBP prices, you'd need to set manual GBP prices in Shopify's Markets settings rather than relying on auto-conversion. This is a Shopify configuration change, not a code fix.

### Impact
After these changes, every price in the slide cart (items, recommendations, free gift values, discount text) will consistently use the correct localized currency symbol and the Shopify-converted amount for the visitor's region.

