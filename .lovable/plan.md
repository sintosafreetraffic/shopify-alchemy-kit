
# Add Compare Price and 1+1 Badge to Price Display

## Changes

### File: `src/components/ab-testing/HeroVariantB.tsx`

**Mobile price display (lines 233-235):**
- Add the strikethrough compare-at price (`compareAtPrice`) next to the selling price
- Add a small badge with a Heart icon + "1+1" text, styled in the Valentine's pink accent color

**Desktop price display (lines 372-374):**
- Same changes: strikethrough compare-at price + Heart "1+1" badge

The compare-at price is already dynamically calculated from Shopify at line 190 (`compareAtPrice`), so this just needs to be rendered in the UI.

### Result
The price area will look like:

**€119.99** ~~€239.98~~ `[Heart] 1+1`

- Strikethrough price uses `text-muted-foreground line-through text-sm`
- Badge uses Valentine's pink styling with the existing `Heart` icon from lucide-react (already imported at line 19)
