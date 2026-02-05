
Goal
- Fix the breadcrumb visual misalignment so “Products” sits on the exact same baseline as the other crumbs (e.g., “Home” and the current page label).

What I audited (and what the previous attempts missed)
1) The breadcrumb UI primitives (src/components/ui/breadcrumb.tsx)
- We already forced a single-row breadcrumb (flex-nowrap + whitespace-nowrap + horizontal scroll). That addresses wrapping, not vertical alignment.
- The primitives do not currently enforce a consistent “display/line-height” for all crumbs.

2) The breadcrumb composer (src/components/Breadcrumbs.tsx)
- “Home” crumb is rendered as a flex container:
  - Link className includes: "flex items-center ..."
- “Products” crumb is rendered as a normal text link (no flex/inline-flex on the <Link> itself).
- We also introduced `leading-none` only on the non-Home crumbs (Products/current page), which can create subtle baseline differences.

3) Global CSS affecting anchors (src/index.css) — root cause amplifier
- There is a global rule:
  - `button, a, input, select, textarea { min-height: 44px; min-width: 44px; }`
- Important nuance: CSS min-height/min-width do not affect inline elements in the way people expect, but they do affect elements once they become flex/inline-flex/block.
- Result in our breadcrumb:
  - The Home link becomes `display:flex` (due to `flex` class) → it is forced to be at least 44px tall.
  - The “Products” link remains effectively inline → it’s not forced to that same height.
  - Inside a flex breadcrumb row, mixing a “tall flex link” with “inline text links” produces the visual misalignment you’re still seeing (the centering math differs per item).

Why the previous fixes didn’t work
- We fixed wrapping (“Products” dropping to its own line) and invalid <li> nesting (separator placement).
- But the remaining issue is baseline/vertical alignment, driven by inconsistent link display modes + a global touch-target CSS rule that only “kicks in” for some crumbs.

Implementation approach (make alignment deterministic)
A) Normalize how every breadcrumb link is laid out
- Update src/components/ui/breadcrumb.tsx:
  - Make BreadcrumbLink always render as `inline-flex items-center` (instead of a plain inline anchor), and enforce consistent line-height.
  - Explicitly override the global touch-target minimums for breadcrumbs only:
    - add `min-h-0 min-w-0` to BreadcrumbLink
  - Add `leading-none` (or a single consistent leading value) in the primitive so every crumb shares the same text metrics.
  - Do the same for BreadcrumbPage (span) so the current page label matches the link crumbs.

Concretely, in BreadcrumbLink classes, include (exact final set may vary slightly):
- `inline-flex items-center leading-none min-h-0 min-w-0 whitespace-nowrap transition-colors hover:text-foreground`

And in BreadcrumbPage classes, include:
- `inline-flex items-center leading-none ...`

B) Stop giving “Home” special layout rules that conflict with the rest
- Update src/components/Breadcrumbs.tsx:
  - Remove `flex items-center` from the Home <Link> (or keep it minimal), because the primitive will now handle layout consistently.
  - If we still want icon + label spacing, use `gap-1` but keep display consistent (rely on BreadcrumbLink’s `inline-flex items-center`).
  - Ensure truncation/width constraints are applied consistently:
    - Prefer putting truncation classes on BreadcrumbLink/BreadcrumbPage (where possible) rather than mixing between Slot + child Link, to avoid any class merge edge cases.

Verification steps (to ensure it’s truly fixed)
1) Desktop
- Go to /products/ergonomic-pillow
- Confirm breadcrumb row reads: Home > Products > Neck Pain Relief Pillow
- Visually verify:
  - “Products” baseline matches “Home” and the current page label.
  - Chevron separators are centered relative to text.

2) Narrow widths
- Shrink viewport until crumbs would normally wrap
- Confirm it remains one line and horizontally scrolls (no mid-crumb wrap).

3) Regression checks
- Check any other page rendering <Breadcrumbs /> (if any get added later) still looks correct.
- Confirm breadcrumb links remain clickable (desktop-only in the hero, but still functional).

Files to change (when you approve)
- src/components/ui/breadcrumb.tsx
  - Normalize BreadcrumbLink + BreadcrumbPage display/line-height
  - Add `min-h-0 min-w-0` to opt breadcrumbs out of the global 44px min touch target rule
- src/components/Breadcrumbs.tsx
  - Simplify Home link classes to match the standardized primitive behavior
  - Apply truncation/leading consistently across crumbs

Expected outcome
- “Products” will align perfectly in the breadcrumb line because every crumb (including Home) will share:
  - the same display mode (inline-flex),
  - the same vertical centering (items-center),
  - the same line-height,
  - and the global min-size rule will no longer distort only some crumbs.
