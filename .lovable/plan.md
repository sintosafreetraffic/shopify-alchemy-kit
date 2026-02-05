
# Plan: Remove Email Link and Clean Up Layout

## Summary
Remove the "Questions? Email us" section from below payment icons on both mobile and desktop, and ensure USPs remain cleanly positioned directly under the payment icons.

---

## Changes Overview

### 1. Remove EmailContactLink from Mobile CTA Section
**File:** `src/components/ab-testing/HeroVariantB.tsx`

**Lines 257-261** - Remove the email contact link block in the mobile CTA section:
```tsx
// REMOVE this block:
{/* Email contact link - mobile */}
<div className="pt-2 flex justify-center">
  <EmailContactLink />
</div>
```

### 2. Remove EmailContactLink from Desktop CTA Section  
**File:** `src/components/ab-testing/HeroVariantB.tsx`

**Lines 409-412** - Remove the email contact link block in the desktop CTA section:
```tsx
// REMOVE this block:
{/* Email contact link - desktop */}
<div className="pt-2 flex justify-center">
  <EmailContactLink />
</div>
```

### 3. Remove EmailContactLink Import
**File:** `src/components/ab-testing/HeroVariantB.tsx`

**Line 36** - Remove the unused import:
```tsx
// REMOVE:
import { EmailContactLink } from "@/components/EmailContactLink";
```

---

## Layout Result

**Before (Mobile):**
```
Price → Add to Cart → Payment Icons → "Questions? Email us" → USPs
```

**After (Mobile):**
```
Price → Add to Cart → Payment Icons → USPs
```

This creates a cleaner flow from CTA to trust signals without the intermediate email link.

---

## On the Three Add to Cart Question

**Current CTAs:**
1. **Top CTA** (Mobile CTA First) - Immediately after price
2. **Valentine's CTA** ("Claim This Deal Now") - Inside promotional section with quantity selector  
3. **Sticky CTA** - Fixed bottom bar on scroll

**Recommendation: Keep all three** ✓

This is actually optimal CRO practice:
- **Top CTA** = Captures immediate intent (above fold)
- **Valentine's CTA** = Contextual with bundle options and urgency (not just a duplicate)
- **Sticky CTA** = Catches users who scroll past

The Valentine's CTA is *inside* a promotional container with quantity selection, pricing comparison, and countdown - it's contextual, not redundant.

**Note:** Since you mentioned the offer will change after Valentine's Day, the middle Valentine's section will be replaced. At that point, you'll naturally have only:
1. Top CTA (above fold)
2. Sticky CTA (on scroll)

This two-CTA pattern is also highly effective for non-promotional periods.

---

## Files to Modify
- `src/components/ab-testing/HeroVariantB.tsx` - Remove EmailContactLink import and usage (3 locations)
