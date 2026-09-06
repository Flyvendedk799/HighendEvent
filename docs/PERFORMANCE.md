# Storefront performance budget

Targets for Rentora storefront (mobile mid-tier, production build):

| Metric | Budget | Notes |
| --- | --- | --- |
| LCP | ≤ 2.5s | Hero + first catalog paint |
| CLS | ≤ 0.1 | Reserve image/calendar space |
| INP | ≤ 200ms | Calendar range select, add-to-cart |
| JS (route) | ≤ 250KB gzip | Product + checkout critical path |

Measure with Lighthouse CI or PageSpeed on staging after each polish pass. Prefer server components + streaming for catalog/home; keep client islands to calendar, cart, and checkout forms.
