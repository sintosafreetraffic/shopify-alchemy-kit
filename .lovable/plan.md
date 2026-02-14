

# Knee Pillow Page Updates

## 1. Remove images 3 and 7 from the gallery

**File: `src/components/KneePillowImageCarousel.tsx`**

Remove two images from the `images` array:
- Image 3 (index 2): `kneePillowMain` ("knee-pillow-main-new.webp")
- Image 7 (index 6): `kneePillowDesignFeatures` ("knee-pillow-design-features.webp")

This leaves 6 images. The desktop gallery layout (large-2up-large-2up) will be adjusted to work with 6 images instead of 8. Remove the unused imports as well.

## 2. Add contour/border around small thumbnail images

**File: `src/components/KneePillowImageCarousel.tsx`**

Add a visible border/outline around each thumbnail indicator in the mobile carousel (the small images at the bottom). Currently only the active thumbnail has a ring. The change adds a subtle border (`border border-gray-200 rounded-lg`) to all thumbnails so they each have a visible contour, matching the reference screenshot.

## 3. Remove the Guarantees section

**File: `src/pages/KneePillowProduct.tsx`**

Remove the `<GuaranteeSection />` component from the knee pillow page (line 62). This removes the "Free Shipping", "100 nights risk free", and "Easy Returns" icons section from the bottom of the page.

