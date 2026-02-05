
# Plan: Move Valentine's Offer Section Above the Fold on Mobile

## The Issue
Currently when `MOBILE_CTA_FIRST` is enabled and Valentine's offer is active, the mobile layout is:
```
Carousel → Reviews → Title → Price → [Top CTA to be hidden] → USPs → Badges → Installment → Valentine's Offer
```

If we hide the Top CTA during promotions, the Valentine's Offer (with its CTA) would be far below the fold.

## Solution: Replace Top CTA with Valentine's Section on Mobile

Instead of just hiding the Top CTA, we'll swap it with the Valentine's section during promotional periods.

### New Mobile Layout During Promotions
```
Carousel → Reviews → Title → Price → Valentine's Offer (with CTA) → Payment Icons → USPs
```

### New Mobile Layout When No Promotion
```
Carousel → Reviews → Title → Price → Top CTA → Payment Icons → USPs
```

---

## Technical Changes

### File: `src/components/ab-testing/HeroVariantB.tsx`

**Change 1: Modify the mobile CTA section (lines 224-257)**

Replace the simple "hide during promo" logic with a conditional render:
- When `valentinesOffer.isActive`: Show Valentine's section here (above fold)
- When NOT active: Show standard Top CTA

```tsx
{/* MOBILE CTA FIRST: Show CTA immediately after price when enabled */}
{mobileHeroConfig.MOBILE_CTA_FIRST && (
  <div className="mt-3">
    {valentinesOffer.isActive ? (
      // Valentine's offer section - shown above fold on mobile
      <ValentinesHeroSection
        onAddSingle={handleAddSingle}
        onAddCouple={handleAddCouple}
        isAdding={isCheckingOut}
        currencyCode={currencyCode}
        productPrice={productPrice}
      />
    ) : (
      // Standard CTA when no promotion
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

**Change 2: Hide duplicate Valentine's section on mobile (around line 345)**

Add `hidden md:block` to the desktop Valentine's section so it only shows on desktop:

```tsx
{/* Valentine's Day 1+1 Offer Section - Desktop Only */}
{valentinesOffer.isActive && (
  <div className="hidden md:block">
    <ValentinesHeroSection ... />
  </div>
)}
```

---

## Result

**Mobile During Promotion:**
```
Carousel → Reviews → Title → Price → Valentine's Offer (ABOVE FOLD) → USPs
```
- One CTA in the Valentine's section (above fold)
- Sticky CTA (on scroll)
- Total: 2 CTAs

**Mobile Without Promotion:**
```
Carousel → Reviews → Title → Price → Top CTA → Payment Icons → USPs
```
- Standard Top CTA (above fold)
- Sticky CTA (on scroll)
- Total: 2 CTAs

**Desktop (unchanged):**
Valentine's section remains in its current position in the right column.

---

## Benefits
1. Valentine's offer is now **above the fold** on mobile during promotions
2. Users see the quantity selector and savings immediately
3. Clean 2-CTA pattern maintained (primary + sticky)
4. Future-proof - works for renamed "1+1 Offer" after Valentine's Day
