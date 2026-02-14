
# Add "the" for Netherlands Shipping + Localize Mini Review Names

## 1. Shipping Text: "Free shipping in the Netherlands"

Only the Netherlands needs the article "the" prepended. 

### Files: `src/components/ab-testing/HeroVariantB.tsx` and `src/components/Hero.tsx`

Update the shipping text rendering logic. Instead of:
```
Free shipping in {buyerCountryName}
```
Use a helper or inline check:
```
Free shipping in {buyerCountry === 'NL' ? 'the ' : ''}{buyerCountryName}
```

This affects 3 locations:
- `HeroVariantB.tsx` mobile (line 263) and desktop (line 409)
- `Hero.tsx` desktop (line 374)

---

## 2. Localize Mini Review Carousel Reviewers

Currently all 5 reviewers are US-based (Minneapolis, LA, St. Paul, New York, Duluth). The requirement is that at least 50% (3 out of 5) should have names and cities matching the buyer's country.

### Approach

Update `MiniReviewsCarousel.tsx` to:
- Accept `buyerCountry` as a prop
- Define country-specific reviewer overrides for the first 3 reviewers (names + cities typical for that country)
- Keep reviewers 4 and 5 as the existing US-based ones (David Patterson, Susan Miller)
- Default to all US reviewers for US visitors

### Country-specific reviewer sets (3 per country, both neck and back variants):

| Country | Name 1 | City 1 | Name 2 | City 2 | Name 3 | City 3 |
|---------|--------|--------|--------|--------|--------|--------|
| NL | Marijke de Vries | Amsterdam | Henk Bakker | Rotterdam | Anneke van Dijk | Utrecht |
| GB | Margaret Thompson | London | Robert Clarke | Manchester | Patricia Hughes | Edinburgh |
| AU | Margaret Thompson | Sydney | Robert Clarke | Melbourne | Patricia Hughes | Brisbane |
| NZ | Margaret Thompson | Auckland | Robert Clarke | Wellington | Patricia Hughes | Christchurch |
| SE | Margareta Lindqvist | Stockholm | Robert Eriksson | Gothenburg | Patricia Nilsson | Malmo |
| NO | Margareta Haugen | Oslo | Robert Bakke | Bergen | Patricia Larsen | Trondheim |
| DK | Margarete Jensen | Copenhagen | Robert Nielsen | Aarhus | Patricia Madsen | Odense |
| DE | Margarete Fischer | Berlin | Robert Muller | Munich | Patricia Weber | Hamburg |
| FR | Marguerite Dupont | Paris | Robert Martin | Lyon | Patricia Bernard | Marseille |
| CA | Margaret Thompson | Toronto | Robert Clarke | Vancouver | Patricia Hughes | Calgary |

The existing avatars (margaret, robert, patricia) are reused for these 3 slots since they are generic enough.

### Files affected:
- `src/components/MiniReviewsCarousel.tsx` -- add `buyerCountry` prop, add country reviewer map, swap first 3 reviewers
- `src/components/ab-testing/HeroVariantB.tsx` -- pass `buyerCountry` to MiniReviewsCarousel
- `src/components/Hero.tsx` -- pass `buyerCountry` to MiniReviewsCarousel

### Technical details

The component will build its review list dynamically:
1. Look up country-specific overrides for positions 1-3
2. If found, replace names and cities in the first 3 review objects (keeping the same review body text and avatars)
3. Keep positions 4-5 unchanged (US-based: David Patterson + Susan Miller)
4. If no override exists for the country, use the original US set
