
# Cart Drawer Cleanup and Best Value Badge Enhancement

## Changes

### 1. Remove "Delivery: 5-7 working days" from cart items
Remove the delivery estimate line shown under each product in the cart (the truck icon + "Delivery: 5-7 working days" text).

**File: `src/components/CartDrawer.tsx`**
- Remove lines 709-713 (the delivery estimate div with Truck icon and "5-7 working days" text)

### 2. Remove "Order within...for delivery by" from urgency banner
Remove the shipping cutoff countdown from the CartUrgencyBanner, keeping only the "Items may sell out soon" / reservation timer message.

**File: `src/components/cart/CartUrgencyBanner.tsx`**
- Remove lines 126-138 (the shipping cutoff section with Truck icon and "Order within X for delivery by Y")
- Remove the shipping cutoff calculation logic (lines 48-92) and the `shippingInfo` state (line 15) since they are no longer needed
- Remove unused imports (`Truck`, `addBusinessDays`, `format`)

### 3. Make "Best Value" badge more prominent on the sleep bundle recommendation
The current badge for the sleep bundle in the recommendations section uses `text-[10px]` with subtle background colors. Make it stand out more with bolder styling.

**File: `src/components/CartDrawer.tsx`**
- For the mobile recommendation badge (around line 1010): when `badge.variant === 'value'`, apply a more prominent style -- larger text (`text-xs`), bold font, and a stronger color scheme (e.g., `bg-pink-500 text-white` to match the Valentine's promo styling already used elsewhere in the cart)
- This targets only the "Best Value" badge on the sleep bundle recommendation card, keeping other badges (Most Popular, Recommended) at their current size
