

## Fix Duplicate Elements on Mobile & Add Spacing to Top USPs

### Problem
On mobile, Klarna installment, social proof badges ("X people viewing now", "X bought today"), and USPs appear **twice**:
1. Above the Valentine's promotional section (correct)
2. Below the Valentine's promotional section (duplicate - needs to be removed)

### Root Cause
The desktop section in `HeroVariantB.tsx` (lines 357-380) is missing `hidden md:block` classes, so it also shows on mobile alongside the dedicated mobile section (lines 224-247).

### Solution

**File: `src/components/ab-testing/HeroVariantB.tsx`**

1. **Hide desktop Klarna/Social Proof/USPs on mobile** (lines 357-380)
   - Add `hidden md:block` to the Installment Badge (line 358)
   - Add `hidden md:flex` to the Social Proof Badges container (line 361)
   - Add `hidden md:block` to the USPs Section container (line 367)

2. **Add more top padding to mobile USPs** (line 234)
   - Change `mt-2` to `mt-3` for extra spacing above the USPs section

3. **Left-align social proof badges with USP checkmarks** (from previous request)
   - Add `pl-6` (24px - icon 16px + gap 8px) to mobile social proof container (line 228)
   - Add `pl-7` (28px - icon 20px + gap 8px) to desktop social proof container (line 361)

### Technical Details

**Change 1** - Line 358:
```tsx
// Before
<InstallmentBadgeCompact price={productPrice} className="mb-2" />

// After
<InstallmentBadgeCompact price={productPrice} className="hidden md:block mb-2" />
```

**Change 2** - Line 361:
```tsx
// Before
<div className="flex flex-wrap items-center gap-3 mb-2">

// After
<div className="hidden md:flex flex-wrap items-center gap-3 mb-2 pl-7">
```

**Change 3** - Line 367:
```tsx
// Before
<div className="space-y-2 mb-3">

// After
<div className="hidden md:block space-y-2 mb-3">
```

**Change 4** - Line 228 (Mobile social proof left-align):
```tsx
// Before
<div className="flex flex-wrap items-center gap-3 mt-2">

// After
<div className="flex flex-wrap items-center gap-3 mt-2 pl-6">
```

**Change 5** - Line 234 (Mobile USPs more top spacing):
```tsx
// Before
<div className="space-y-1.5 mt-2">

// After
<div className="space-y-1.5 mt-3">
```

### Summary
- Desktop elements get `hidden md:block/md:flex` to hide on mobile
- Mobile USPs get slightly more top padding (`mt-3` instead of `mt-2`)
- Both social proof sections get left padding to align with checkmarks

