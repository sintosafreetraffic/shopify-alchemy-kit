
# Plan: Move Valentine's Offer Above the Fold on Mobile

## Summary
Replace the mobile Top CTA with the Valentine's offer section during promotional periods, ensuring the 1+1 deal is visible immediately after price. The desktop layout remains unchanged.

---

## Technical Changes

### File: `src/components/ab-testing/HeroVariantB.tsx`

**Change 1: Modify mobile CTA section (lines 224-257)**

Replace the current mobile Top CTA with a conditional render:
- When `valentinesOffer.isActive` is true → Show Valentine's section (above fold)
- When `valentinesOffer.isActive` is false → Show standard Top CTA button

```tsx
{/* MOBILE CTA FIRST: Show CTA or Valentine's offer immediately after price */}
{mobileHeroConfig.MOBILE_CTA_FIRST && (
  <div className="mt-3">
    {valentinesOffer.isActive ? (
      // Valentine's offer section - shown above fold on mobile during promotions
      <ValentinesHeroSection
        onAddSingle={handleAddSingle}
        onAddCouple={handleAddCouple}
        isAdding={isCheckingOut}
        currencyCode={currencyCode}
        productPrice={productPrice}
      />
    ) : (
      // Standard CTA when no promotion is active
      <>
        <Button ...>ADD TO CART</Button>
        <div className="pt-2">
          <PaymentIcons />
        </div>
      </>
    )}
  </div>
)}
```

**Change 2: Hide Valentine's section on mobile in desktop grid (lines 344-353)**

Add `hidden md:block` wrapper to prevent duplicate rendering on mobile:

```tsx
{/* Valentine's Day 1+1 Offer Section - Desktop Only (mobile shows above fold) */}
{valentinesOffer.isActive && (
  <div className="hidden md:block">
    <ValentinesHeroSection ... />
  </div>
)}
```

---

## Layout Result

**Mobile During Promotion:**
```
Carousel → Reviews → Title → Price → Valentine's Offer (ABOVE FOLD with quantity selector) → USPs → Sticky CTA
```
- 2 CTAs total: Valentine's CTA (above fold) + Sticky CTA

**Mobile Without Promotion:**
```
Carousel → Reviews → Title → Price → Top CTA → Payment Icons → USPs → Sticky CTA
```
- 2 CTAs total: Top CTA (above fold) + Sticky CTA

**Desktop (unchanged):**
Valentine's section remains in the right column in its current position.

---

## Benefits
1. **Valentine's offer visible above the fold** on mobile
2. **Quantity selector accessible immediately** - users can choose 1 or 2 pillows
3. **No duplicate CTAs** during promotions - clean 2-CTA pattern
4. **Future-proof** - works when renamed to "1+1 Offer" after Valentine's Day
