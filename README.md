# Playwright Lab — Medusa Storefront

Playwright Web UI automation lab (Advanced Testing & QA Automation).

The project is in [`challenges/atqaa-playwright-framework`](challenges/atqaa-playwright-framework):

| Spec | Part |
| --- | --- |
| `tests/catalog-search.spec.ts` | Part 1 – browse store, open Winter jacket |
| `tests/cart-workflow.spec.ts` | Part 2 – variant selection, add to cart, drawer, quantity & subtotal |
| `tests/cart-workflow-extended.spec.ts` | Part 3 – multi-item cart, quantity update, remove item, checkout |

## Run

```bash
cd challenges/atqaa-playwright-framework
npm install
npx playwright install chromium firefox
npx playwright test            # Chromium + Firefox
npx playwright show-report
```

The staging backend sleeps when idle; if the first run gets a 504, run it again.
