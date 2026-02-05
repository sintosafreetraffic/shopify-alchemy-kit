
# Plan: Consolidate Express Payment Icons into PaymentIcons

## Summary
Remove the separate `ExpressPaymentIcons` component usage from both hero sections and add Google Pay and Apple Pay directly to the existing `PaymentIcons` component.

---

## Changes Overview

### 1. Remove ExpressPaymentIcons from HeroVariantB.tsx

**Lines to remove:**
- Line 38: Remove import statement
- Lines 256-259: Remove mobile express payment section
- Lines 412-415: Remove desktop express payment section

### 2. Remove ExpressPaymentIcons from Hero.tsx

**Lines to remove:**
- Line 22: Remove import statement  
- Lines 308-311: Remove mobile express payment section

### 3. Add Google Pay and Apple Pay to PaymentIcons.tsx

**File:** `src/components/PaymentIcons.tsx`

Add Google Pay and Apple Pay SVG icons to the existing payment icons row (after Klarna). This consolidates all payment methods into one clean component.

**New icons to add:**
- Google Pay icon (with Google colors)
- Apple Pay icon (black/white)

---

## Technical Details

### PaymentIcons.tsx Changes

Add these two icons after the existing Klarna icon (line 27):

```tsx
{/* Google Pay */}
<svg xmlns="http://www.w3.org/2000/svg" className={iconClassName} width="48" height="30" viewBox="0 0 240 150" fill="none">
  {/* Google Pay SVG paths */}
</svg>

{/* Apple Pay */}
<svg xmlns="http://www.w3.org/2000/svg" className={iconClassName} width="48" height="30" viewBox="0 0 240 150" fill="none">
  {/* Apple Pay SVG - already exists in ExpressPaymentIcons, will reuse */}
</svg>
```

Note: The Apple Pay icon is already present in `PaymentIcons.tsx` (line 24), so only Google Pay needs to be added.

---

## Result

**Before:**
- PaymentIcons: Visa, Mastercard, Amex, PayPal, Apple Pay, Klarna
- ExpressPaymentIcons (separate): Apple Pay, Google Pay, PayPal, Cards

**After:**
- PaymentIcons: Visa, Mastercard, Amex, PayPal, Apple Pay, Klarna, **Google Pay**
- ExpressPaymentIcons: Removed from hero sections

This eliminates redundancy and keeps all payment trust signals in one consolidated row.
