

# Cart CRO Enhancements Implementation

## Overview
Implementing 5 key CRO improvements to the cart drawer with the corrected delivery estimate of **5-7 working days**.

---

## Changes to Implement

### 1. Cart Urgency Banner (New Component)
**File:** `src/components/cart/CartUrgencyBanner.tsx`

Creates a new component displaying:
- **Reservation timer:** "Your items are reserved for 09:45" - 10-minute countdown stored in sessionStorage
- **Shipping cutoff:** "Order within 2h 30m for delivery by [estimated date]" - based on 2 PM cutoff time

Features:
- Timer resets when cart becomes empty
- Uses sessionStorage so timer persists across page refreshes but not browser sessions
- Clock and Truck icons from Lucide for visual appeal
- Amber/orange warning colors for urgency

---

### 2. Collapsible Discount Code Input (New Component)
**File:** `src/components/cart/DiscountCodeInput.tsx`

Creates a collapsible promo code section:
- Shows "Have a promo code?" link by default (collapsed)
- Expands to reveal input field + "Apply" button when clicked
- Uses Radix UI Collapsible component
- Placeholder validation (can be extended for Shopify discount codes later)
- Shows success/error states

---

### 3. Estimated Delivery Date per Product
**File:** `src/components/CartDrawer.tsx` (modification)

Adds delivery estimate below each cart item:
- Text: **"Delivery: 5-7 working days"**
- Small Truck icon
- Muted styling to keep cart clean
- Positioned below the product title/variant info

---

### 4. "Continue Shopping" Button
**File:** `src/components/CartDrawer.tsx` (modification)

Adds secondary CTA in the checkout footer section:
- Outline variant button with "Continue Shopping" text
- Links to `/products` page
- Closes the cart drawer on click
- Positioned below the main checkout button

---

### 5. Per-Product Scarcity Indicators
**File:** `src/components/CartDrawer.tsx` (modification)

Adds low-stock warnings to cart items:
- Shows "Only X left!" when stock is low (threshold < 8)
- Uses deterministic calculation based on product ID hash
- Orange/amber warning color with AlertTriangle icon
- Positioned near the product title

---

## Files to Create

### `src/components/cart/CartUrgencyBanner.tsx`
```
- useState for countdown timer
- useEffect for interval updates
- sessionStorage for persistence
- Calculates shipping cutoff (2 PM local time)
- Renders reservation timer + shipping deadline
```

### `src/components/cart/DiscountCodeInput.tsx`
```
- Uses Collapsible from @radix-ui/react-collapsible
- useState for isOpen, code, isLoading, error, success
- Input + Apply button
- Placeholder validation logic
```

---

## Files to Modify

### `src/components/CartDrawer.tsx`
Changes:
1. Import new components (`CartUrgencyBanner`, `DiscountCodeInput`)
2. Import `Link` from react-router-dom
3. Import `AlertTriangle` icon from lucide-react
4. Add `CartUrgencyBanner` below the free shipping progress bar
5. Add delivery estimate line (5-7 working days) in each cart item
6. Add scarcity indicator to each cart item
7. Add `DiscountCodeInput` in the pricing summary section
8. Add "Continue Shopping" button below checkout button

---

## Component Placement in Cart

```
┌─────────────────────────────────────┐
│ Cart Header + Close                  │
├─────────────────────────────────────┤
│ Free Shipping Progress Bar          │
├─────────────────────────────────────┤
│ 🕐 URGENCY BANNER (NEW)             │
│ • Items reserved for 09:45          │
│ • Order within 2h 30m for delivery  │
├─────────────────────────────────────┤
│ Cart Items (scrollable)             │
│ ┌─────────────────────────────────┐ │
│ │ [IMG] Product Title             │ │
│ │       Variant info              │ │
│ │       🚚 Delivery: 5-7 days     │ │
│ │       ⚠️ Only 3 left! (NEW)     │ │
│ │       Price    [- 1 +]          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Trust Badges (100-Night, Returns)   │
├─────────────────────────────────────┤
│ 💳 DISCOUNT CODE INPUT (NEW)        │
│ "Have a promo code?" [expand]       │
├─────────────────────────────────────┤
│ Pricing Summary                     │
│ Shipping: FREE                      │
│ Total: €119.99                      │
├─────────────────────────────────────┤
│ [CHECKOUT - €119.99]                │
│ [Continue Shopping] (NEW)           │
│ Payment icons                       │
└─────────────────────────────────────┘
```

---

## Technical Details

### Urgency Timer Logic
- On first cart item add: store timestamp in `sessionStorage('cart-reservation-timestamp')`
- Calculate remaining time from 10 minutes
- Display MM:SS format
- When timer expires: show "Items may sell out soon"
- When cart empties: clear sessionStorage key

### Shipping Cutoff Logic
- Define cutoff time: 2 PM (14:00) local time
- If current time < 2 PM: calculate hours/minutes until cutoff
- Add 5-7 working days to estimate delivery date
- If current time > 2 PM: show "Order tomorrow by 2 PM for..."

### Scarcity Calculation
- Use product variant ID hash to generate deterministic "stock" number
- Formula: `(hashCode(variantId) % 10) + 2` (gives 2-11 range)
- Show warning if calculated stock < 8
- Ensures same product always shows same stock level

---

## Verification Checklist
- [ ] Urgency timer starts when items added to cart
- [ ] Timer persists across page refreshes (sessionStorage)
- [ ] Timer resets when cart is emptied
- [ ] Discount code input is collapsed by default
- [ ] Discount code expands when clicked
- [ ] Delivery estimate shows "5-7 working days" for each item
- [ ] Scarcity badge appears on applicable items
- [ ] "Continue Shopping" button navigates to /products
- [ ] Cart drawer closes when "Continue Shopping" is clicked
- [ ] All new elements are properly styled and responsive

