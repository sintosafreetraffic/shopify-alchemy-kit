
# Cart CRO Enhancements Implementation Plan

## Overview
This plan implements 5 key CRO improvements identified in the cart audit to boost conversion rates by adding urgency triggers, a discount code input, delivery estimates, a "Continue Shopping" button, and per-product scarcity indicators.

---

## Changes Summary

### 1. Urgency Triggers (Reservation Timer + Shipping Cutoff)

**What it does:**
- Displays "Items reserved for 10 minutes" countdown timer at the top of the cart when items are present
- Shows "Order within X:XX for delivery by [date]" based on a shipping cutoff time (e.g., 2 PM)

**Implementation:**
- Create a new component `CartUrgencyBanner.tsx` with:
  - A 10-minute countdown that starts when items are added
  - Shipping cutoff logic: if before 2 PM local time, show "Order within X hours X minutes for delivery by [estimated date]"
- Timer state stored in sessionStorage (resets per session, not persistent)
- Add to `CartDrawer.tsx` just below the free shipping progress bar

---

### 2. Collapsible Discount Code Input

**What it does:**
- Adds a "Have a promo code?" link that expands to reveal an input field
- Stays hidden by default to prevent customers from leaving to search for codes
- Input field with "Apply" button; validates codes (placeholder for now)

**Implementation:**
- Create a new component `DiscountCodeInput.tsx`
  - Collapsible design using `Collapsible` from Radix UI
  - Input + Apply button styling matching cart aesthetic
  - State for code input, loading, and error/success messages
- Place in the pricing summary section of `CartDrawer.tsx`, before the subtotal

---

### 3. Estimated Delivery Date per Product

**What it does:**
- Shows "Estimated delivery: 3-5 business days" below each product in the cart
- Uses the same logic already present on product pages

**Implementation:**
- Add a small delivery estimate line in the cart item rendering (around line 681-731 in `CartDrawer.tsx`)
- Display text: "Delivery: 3-5 business days" with a small truck icon
- Style: muted text, small font size to keep the cart clean

---

### 4. "Continue Shopping" Secondary Button

**What it does:**
- Adds a secondary CTA "Continue Shopping" that links to `/products`
- Currently only shown in the empty cart state; this adds it when cart has items too

**Implementation:**
- Add a secondary outline button below the main checkout button in `CartDrawer.tsx`
- Style: `variant="outline"` with shopping cart icon
- Links to `/products` and closes the cart drawer

---

### 5. Per-Product Scarcity Indicators

**What it does:**
- Shows "Only X left in stock" warning when inventory is low
- Leverages the existing `StockIndicator` logic from `UrgencyElements.tsx`

**Implementation:**
- Create a `CartItemScarcity` component or inline logic
- Use a static/deterministic calculation (similar to `StockIndicator`) since we don't have real-time inventory data from Shopify Storefront API
- Show scarcity badge in orange/red when stock count is below threshold (e.g., < 8)
- Add to each cart item display

---

## File Changes

### New Files
1. `src/components/cart/CartUrgencyBanner.tsx` - Reservation timer + shipping cutoff
2. `src/components/cart/DiscountCodeInput.tsx` - Collapsible promo code input

### Modified Files
1. `src/components/CartDrawer.tsx`:
   - Import and add `CartUrgencyBanner` below free shipping progress bar
   - Import and add `DiscountCodeInput` in pricing summary section
   - Add delivery estimate text to each cart item
   - Add "Continue Shopping" button below checkout button
   - Add scarcity indicator to each cart item

---

## Technical Details

### CartUrgencyBanner Component
```text
- Uses useState + useEffect for countdown timer
- sessionStorage key: 'cart-reservation-timestamp'
- Resets when cart is emptied
- Displays: "Your items are reserved for MM:SS"
- Secondary line: "Order within X:XX to get it by [date]"
```

### DiscountCodeInput Component
```text
- Uses Collapsible from Radix
- State: isOpen, code, isLoading, error, success
- Apply button validates against a list (can be extended later to check Shopify)
- Shows success checkmark or error message
```

### Delivery Estimate
```text
- Simple static text: "Delivery: 3-5 business days"
- Truck icon from Lucide
- Positioned below product variant info
```

### Scarcity Indicator
```text
- Calculation: deterministic based on product ID hash or date-based decrement
- Threshold: Show when stock < 8
- Display: "Only X left!" in orange/red
- Package or AlertTriangle icon
```

---

## Verification Steps

1. **Urgency Timer**
   - Add item to cart, verify 10-minute countdown appears
   - Wait or manually advance time, verify countdown updates
   - Empty cart, verify timer resets on next add

2. **Discount Code**
   - Open cart, verify "Have a promo code?" link is visible
   - Click to expand, enter code, verify UI feedback
   - Test invalid code shows error state

3. **Delivery Estimate**
   - Add item to cart, verify "Delivery: 3-5 business days" appears per item

4. **Continue Shopping**
   - With items in cart, verify "Continue Shopping" button appears
   - Click it, verify navigation to /products and cart closes

5. **Scarcity**
   - Add items to cart, verify scarcity badge appears on applicable items
   - Verify styling matches orange/red warning aesthetic

---

## Files to Create/Modify
- Create: `src/components/cart/CartUrgencyBanner.tsx`
- Create: `src/components/cart/DiscountCodeInput.tsx`
- Modify: `src/components/CartDrawer.tsx`
