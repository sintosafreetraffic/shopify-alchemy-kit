
# Plan: Align Product Image with Breadcrumbs

## Summary
Adjust the product image carousel on the desktop layout so that it visually aligns at the same top level as the breadcrumbs in the right column.

## Current Situation
- **Left column** (images): Uses `space-y-4` for internal spacing
- **Right column** (details with breadcrumbs): Has `mb-3` on the breadcrumb wrapper
- Both columns use `items-start` on the parent grid, so they should theoretically start at the same top position
- The section has `pt-2 md:pt-4` padding at the top

The visual misalignment happens because the breadcrumb area is relatively compact (small text), while the image carousel appears to have more visual weight, making them look slightly off.

## Proposed Solution

### Option A: Remove Breadcrumb Bottom Margin (Recommended)
Remove the `mb-3` from the breadcrumb wrapper to bring the product info (stars, title) closer to the breadcrumbs. This won't move the image up, but will make the right column content start closer to the top.

### Option B: Add Negative Top Margin to Image Column
Add a small negative top margin to the image column (e.g., `-mt-1` or `-mt-2`) to visually shift it up and align with the breadcrumb text baseline.

### Option C: Reduce Section Top Padding
Reduce the `pt-2 md:pt-4` section padding to `pt-0 md:pt-2` to bring everything up closer to the header.

## Recommended Approach
**Combine Options A and B**: 
1. Remove `mb-3` from the breadcrumb wrapper (line 274 in HeroVariantB.tsx)
2. Add a small negative margin to the left image column to fine-tune alignment

## Technical Changes

### File: `src/components/ab-testing/HeroVariantB.tsx`

**Change 1**: Adjust breadcrumb wrapper margin (line 274)
```tsx
// Before
<div className="hidden md:block mb-3">

// After  
<div className="hidden md:block mb-1">
```

**Change 2**: Add subtle negative top margin to the left image column (line 261)
```tsx
// Before
<div className="hidden md:block relative order-2 md:order-1 space-y-4 overflow-hidden">

// After
<div className="hidden md:block relative order-2 md:order-1 space-y-4 overflow-hidden -mt-1">
```

This combination will:
- Pull the image carousel up by 0.25rem (4px)
- Reduce the gap between breadcrumbs and stars/title
- Create a tighter, more aligned visual appearance

## Notes
- The Hero.tsx component (Variant A) may need similar adjustments if used
- This is a desktop-only change; mobile layout is unaffected since breadcrumbs are hidden on mobile
