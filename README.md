# Playwright Lab — Medusa Storefront

Playwright Web UI automation labs (Advanced Testing & QA Automation), built with the
**Page Object Model**. The project is in
[`challenges/atqaa-playwright-framework`](challenges/atqaa-playwright-framework).

```
challenges/atqaa-playwright-framework/
├── pages/                      # Locators + user actions only (no expect)
│   ├── BasePage.ts             # navigation (retries cold-start 504s), nav bar, cart badge
│   ├── ProductPage.ts          # catalog → product, size/color options, add to cart
│   ├── CartPage.ts             # slide-out drawer + /vn/cart (quantity, remove, subtotal)
│   └── CheckoutPage.ts         # address → delivery → payment → review → confirmation
├── api/MedusaAdminApi.ts       # Admin API client used to verify the order exists
└── tests/                      # Flows + web-first assertions (no raw selectors)
    ├── catalog-search.spec.ts          # Lab 02 Part 1
    ├── cart-workflow.spec.ts           # Lab 02 Part 2
    ├── cart-workflow-extended.spec.ts  # Lab 02 Part 3
    ├── product-pom.spec.ts             # POM Task 1.4
    ├── product-pom-v2.spec.ts          # POM Task 1.5 (TC01–TC04)
    ├── checkout.spec.ts                # Lab 03 – full guest checkout E2E
    └── data/checkout-data.ts           # fake guest shopper
```

## Run

```bash
cd challenges/atqaa-playwright-framework
npm install
npx playwright install chromium firefox
npx playwright test                                   # everything, Chromium + Firefox
npx playwright test tests/product-pom-v2.spec.ts --project=chromium --headed
npx playwright test -g "TC02" --headed
npx playwright test --ui
npx playwright show-report
```

The staging backend sleeps when idle; `BasePage.navigateTo()` retries 5xx responses and CI
warms the site up before testing.

### Admin verification (Lab 03, optional)

`tests/checkout.spec.ts` checks the new order in Medusa Admin when these are set
(never commit them — use GitHub Actions secrets or your shell):

```bash
export MEDUSA_BACKEND_URL=https://<medusa-backend-host>
export MEDUSA_ADMIN_EMAIL=<admin email>
export MEDUSA_ADMIN_PASSWORD=<admin password>
```

Without them the admin step is skipped and noted in the HTML report.

## Lab 03 team matrix

| Member | Deliverable | Where |
| --- | --- | --- |
| Student A (Lead QE) | `pages/CartPage.ts` & cart E2E flow | drawer, go to cart, quantity, remove, subtotal, checkout button |
| Student B (Automation Eng) | `pages/CheckoutPage.ts` & shipping flow | email, first/last name, address, Standard Shipping, Manual Payment, place order |
| Student C (CI/CD Lead) | `tests/checkout.spec.ts` & admin verification | full E2E on Chromium & Firefox, order ID, Admin API check, CI workflow |

## Critical thinking checkpoint

**Q1 — Test isolation: why is the cart empty when TC03 starts after TC02 added an item?**
Playwright gives every test a brand-new *browser context* — like a fresh incognito window
with its own cookies and storage. The guest cart is identified only by a cookie
(`_medusa_cart_id`), and TC03's context never sees TC02's cookie, so the storefront creates a
new, empty cart. `beforeEach` then re-runs the setup, so tests never depend on each other's
state or order.

**Q2 — Maintainability: if `/products/sweatshirt` becomes `/items/sweatshirt`, how many lines change?**
Products are opened by clicking their catalog card, so product URLs are never typed into
the tests. In the page objects only **2 lines in `ProductPage.ts`** know the route: the
`waitForURL(/\/products\//)` in `clickProductInStore()` and the `/products/` response filter
in `addToCart()`. The specs that call `openProductFromStore('Sweat Shirt')` don't change at
all. The only other edits are the 2 explicit `toHaveURL(/products/)` assertions in the Lab 02
specs, which check the route on purpose. Without POM, every spec that navigates to or
waits on a product page would need editing.

**Q3 — Locator resilience: why is `getByRole('button', { name: 'M', exact: true })` better than `button.btn-size-m-123`?**
The role + accessible name is what the user actually sees and what screen readers use, so it
only changes when the real UI changes. Generated CSS classes such as `btn-size-m-123` change
whenever styling or the build tooling changes, and they say nothing about meaning. Role
locators also double as an accessibility check and `exact: true` stops "M" from matching
"Menu".
