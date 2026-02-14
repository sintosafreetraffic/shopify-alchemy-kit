
# Remove "+ 40% Off!" and Fix Pricing Display

## Changes

### 1. Update `src/configs/valentines_offer.json`
- Change `heroOfferLine` from `"Buy 1, Get 1 Free + 40% Off!"` to `"Buy 1, Get 1 Free"`

### 2. Update `src/components/ab-testing/HeroVariantB.tsx`
**Single pillow price (no strikethrough):**
- Mobile (lines 233-238): Remove the strikethrough `compareAtPrice` span, keep only the selling price
- Desktop (lines 374-380): Remove the strikethrough `compareAtPrice` span, keep only the selling price

**2 pillows (Valentine's section) keeps strikethrough** -- this is handled separately in ValentinesHeroSection and will be addressed in the previously approved pricing plan.

### 3. Update `src/components/Hero.tsx`
- Remove the "40% OFF" badge from mobile (lines 276-278) and desktop (lines 369-371), plus the strikethrough compare-at price spans on lines 275 and 368

### Files affected
| File | Change |
|------|--------|
| `src/configs/valentines_offer.json` | Update `heroOfferLine` to remove "+ 40% Off!" |
| `src/components/ab-testing/HeroVariantB.tsx` | Remove strikethrough price from single-pillow display (mobile + desktop) |
| `src/components/Hero.tsx` | Remove "40% OFF" badge and strikethrough price |
