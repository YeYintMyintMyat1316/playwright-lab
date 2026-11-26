import { test, expect, Page } from '@playwright/test';

/** Converts a price label such as "₫1,000,000" into the number 1000000. */
const toNumber = (text: string): number => Number(text.replace(/[^\d]/g, ''));

/** Reads the cart subtotal as a number. */
async function readSubtotal(page: Page): Promise<number> {
  return toNumber(await page.getByTestId('cart-subtotal').first().innerText());
}

test('E2E Cart Workflow: Select variant, add to cart, verify drawer & update quantity', async ({ page }) => {
  // Add-to-cart and quantity updates go through the Render Cloud backend, which can be slow on cold start.
  test.setTimeout(120_000);

  // 1. NAVIGATE TO THE PRODUCT LIST (/vn/store) AND SELECT A PRODUCT
  await page.goto('/vn/store');

  const productCard = page.getByRole('link', { name: /classic t-shirt/i }).first();
  await expect(productCard).toBeVisible({ timeout: 15000 });
  await productCard.click();

  await expect(page).toHaveURL(/.*\/products\/classic-t-shirt/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /classic t-shirt/i })).toBeVisible({ timeout: 15000 });

  // 2. SELECT PRODUCT VARIANTS (role-based locators, no CSS classes)
  // Option buttons render disabled until product data loads, so wait for them to be enabled first.
  const sizeLButton = page.getByRole('button', { name: 'L', exact: true });
  await expect(sizeLButton).toBeEnabled({ timeout: 15000 });
  await sizeLButton.click();

  const colorBlackButton = page.getByRole('button', { name: 'Black', exact: true });
  await expect(colorBlackButton).toBeEnabled({ timeout: 15000 });
  await colorBlackButton.click();

  // 3. ADD TO CART
  const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCartBtn).toBeEnabled({ timeout: 15000 });

  // Wait for the add-to-cart Server Action (a POST to the product page) to finish.
  // The free-tier backend can take 20s+ to answer when several tests run at once.
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.request().method() === 'POST' && resp.url().includes('/products/'),
      { timeout: 60000 },
    ),
    addToCartBtn.click(),
  ]);

  // 4. VERIFY CART STATE: the slide-out drawer opens and the cart badge shows 1
  const cartDrawer = page.getByTestId('nav-cart-dropdown');
  await expect(cartDrawer).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('link', { name: /cart\s*\(1\)/i })).toBeVisible();
  await expect(cartDrawer.getByRole('heading', { name: /classic t-shirt/i })).toBeVisible();
  await expect(cartDrawer.getByText(/variant:\s*l\s*\/\s*black/i)).toBeVisible();

  // The drawer auto-closes after a few seconds, so click "Go to cart" inside it straight away
  const goToCartBtn = cartDrawer.getByRole('button', { name: /go to cart/i });
  await goToCartBtn.click();

  await expect(page).toHaveURL(/.*\/cart/, { timeout: 15000 });

  // 5. UPDATE QUANTITY FROM 1 TO 2 AND VALIDATE THE SUBTOTAL
  // Scope everything to the T-shirt's row so the locators stay strict-mode safe
  const tshirtRow = page.getByTestId('product-row').filter({ hasText: /classic t-shirt/i });
  await expect(tshirtRow).toBeVisible({ timeout: 15000 });

  const subtotalLocator = page.getByTestId('cart-subtotal').first();
  await expect(subtotalLocator).toBeVisible({ timeout: 15000 });
  const unitPrice = toNumber(await tshirtRow.getByTestId('product-unit-price').innerText());
  expect(await readSubtotal(page)).toBe(unitPrice);

  const quantitySelect = tshirtRow.getByTestId('product-select-button');
  await expect(quantitySelect).toHaveValue('1');
  await quantitySelect.selectOption('2');

  // Web-first assertions wait for the server action to finish and the UI to re-render
  await expect(quantitySelect).toHaveValue('2', { timeout: 20000 });
  await expect.poll(() => readSubtotal(page), { timeout: 20000 }).toBe(unitPrice * 2);
});
