
# Plan: Mobile CRO Optimizations

## Summary
Implement three key conversion rate optimization changes to improve mobile product page performance:
1. Enable "CTA First" on mobile to move Add to Cart above the fold
2. Add Express Payment Icons (Apple Pay, Google Pay, PayPal) to mobile hero
3. Display a specific delivery date instead of a generic range

---

## Changes Overview

### 1. Enable Mobile CTA First
**File:** `src/config/mobileHeroConfig.ts`

Change `MOBILE_CTA_FIRST` from `false` to `true`.

This moves the "Add to Cart" button immediately after the price on mobile, placing it above the fold before the USPs and included items sections.

**New mobile layout:**
Carousel → Reviews → Title → Price → **CTA** → USPs → Included Items

---

### 2. Add Express Payment Icons to Mobile
**File:** `src/components/ab-testing/HeroVariantB.tsx`

The `ExpressPaymentIcons` component currently only shows on desktop (lines 400-403). Add it to the mobile CTA section as well (around line 245-253).

**Changes:**
- Inside the `MOBILE_CTA_FIRST` conditional block, add `ExpressPaymentIcons` after `PaymentIcons`
- Use compact styling (`size="sm"`)

**Also sync to Variant A:**
**File:** `src/components/Hero.tsx`
- Add the same `ExpressPaymentIcons` to the mobile CTA section (around line 295-299)

---

### 3. Display Specific Delivery Date
**File:** `src/components/ab-testing/HeroVariantB.tsx`

Replace the generic "Arrives in 3-5 days" with a calculated specific date.

**Current (line 324):**
```
Free shipping in US • Arrives in 3-5 days
```

**New approach:**
Create a helper function to calculate a delivery date that's 5 days from today, then display:
```
Free shipping in US • Get it by [Month Day]
```

Example: "Free shipping in US • Get it by Feb 10"

**Implementation:**
- Add a `getDeliveryDate()` helper function (can be inline or in a utility)
- Use `date-fns` format function (already installed) to display "Feb 10" style date
- The calculation: `addDays(new Date(), 5)` for the estimated delivery

**Also sync to Variant A:**
**File:** `src/components/Hero.tsx`
- Add the same delivery date logic and update the USP text

---

## Technical Implementation Details

### Delivery Date Helper
```typescript
import { addDays, format } from 'date-fns';

const getDeliveryDate = () => {
  const deliveryDate = addDays(new Date(), 5);
  return format(deliveryDate, 'MMM d'); // e.g., "Feb 10"
};
```

### Files to Modify
1. `src/config/mobileHeroConfig.ts` - Enable flag
2. `src/components/ab-testing/HeroVariantB.tsx` - Express icons + delivery date
3. `src/components/Hero.tsx` - Express icons + delivery date (for A/B sync)

---

## Visual Impact

**Before (Mobile):**
- CTA buried below the fold
- No express checkout visibility on mobile
- "Arrives in 3-5 days" (generic)

**After (Mobile):**
- CTA visible immediately after price
- Apple Pay, Google Pay, PayPal badges visible on mobile
- "Get it by Feb 10" (specific, creates urgency)
