

## Consolidate USPs Section: One Version for Both Mobile and Desktop

### Problem
There are currently two separate sections for Klarna, social proof badges, and USPs:
- Mobile-only section (lines 236-261) with smaller styling
- Desktop section (lines 377-405) that shows on both breakpoints, causing duplication

### Solution

**File: `src/components/ab-testing/HeroVariantB.tsx`**

1. **Remove the mobile-specific section entirely** (lines 236-261)
   - Delete the `{/* Mobile: Klarna installment */}`, `{/* Mobile: Social proof badges */}`, and `{/* Mobile: USPs */}` sections

2. **Keep the unified section** (lines 377-405) that already has responsive text sizing (`text-xs sm:text-sm lg:text-sm xl:text-base`)

3. **Add spacing to the unified section** to match the mobile spacing requirements
   - Ensure `mb-5` on the USPs container for proper spacing before Valentine's offer

### Technical Details

**Lines to Remove** (236-261):
```tsx
// DELETE these entire sections:
{/* Mobile: Klarna installment - right after price */}
<InstallmentBadgeCompact price={productPrice} className="mt-1" />

{/* Mobile: Social proof badges */}
<div className="flex flex-wrap items-center gap-3 mt-2">
  <LiveViewerBadge />
  <RecentPurchasesBadge variant="compact" />
</div>

{/* Mobile: USPs */}
<div className="space-y-2 mt-4 mb-5">
  ... (all 3 USP items)
</div>
```

**Keep** the unified section (lines 377-405) which already has:
- Responsive icon sizes (`w-5 h-5`)
- Responsive text sizing (`text-xs sm:text-sm lg:text-sm xl:text-base`)
- Proper `mb-5` spacing before Valentine's offer

### Result
- Single source of truth for Klarna, social proof, and USPs
- Works on both mobile and desktop with responsive sizing
- No duplication
- Proper spacing maintained above Valentine's offer

