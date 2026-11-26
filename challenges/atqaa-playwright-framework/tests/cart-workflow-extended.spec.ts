import { test, expect, Page } from '@playwright/test';
import { gotoStorefront } from './support/navigation';

/** Converts a price label such as "₫1,000,000" into the number 1000000. */
const toNumber = (text: string): number => Number(text.replace(/[^\d]/g, ''));

/** Reads the cart subtotal as a number. */
async function readSubtotal(page: Page): Promise<number> {
  return toNumber(await page.getByTestId('cart-subtotal').first().innerText());
}

/** Opens a product from the /vn/store catalog by its visible name. */
async function openProductFromStore(page: Page, name: RegExp) {
  await gotoStorefront(page, '/vn/store');
  const productCard = page.getByRole('link', { name }).first();
  await expect(productCard).toBeVisible({ timeout: 15000 });
  await productCard.click();
  await expect(page).toHaveURL(/.*\/products\//, { timeout: 15000 });
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 15000 });
}

/** Clicks "Add to cart" and waits until the cart badge shows the expected item count. */
async function addToCart(page: Page, expectedCount: number) {
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
  await expect(page.getByRole('link', { name: new RegExp(`cart\\s*\\(${expectedCount}\\)`, 'i') }))
    .toBeVisible({ timeout: 20000 });
}

test('E2E Extended Cart Lifecycle: multiple items, update quantity, remove item, proceed to checkout', async ({ page }) => {
  // This flow makes several round trips to the Render Cloud backend.
  test.setTimeout(360_000);

  // 1. ADD THE FIRST PRODUCT (with variants): Classic T-Shirt, size L, color Black
  await openProductFromStore(page, /classic t-shirt/i);

  const sizeLButton = page.getByRole('button', { name: 'L', exact: true });
  await expect(sizeLButton).toBeEnabled({ timeout: 15000 });
  await sizeLButton.click();
  await page.getByRole('button', { name: 'Black', exact: true }).click();

  await addToCart(page, 1);

  // 2. GO BACK TO THE CATALOG AND ADD A SECOND, DIFFERENT PRODUCT: Winter jacket (no variants)
  await openProductFromStore(page, /winter jacket/i);
  await addToCart(page, 2);

  // Go to the cart and check that both line items are listed
  await gotoStorefront(page, '/vn/cart');
  await expect(page.getByRole('heading', { name: 'Cart', level: 1 })).toBeVisible({ timeout: 15000 });

  const cartRows = page.getByTestId('product-row');
  const tshirtRow = cartRows.filter({ hasText: /classic t-shirt/i });
  const jacketRow = cartRows.filter({ hasText: /winter jacket/i });

  await expect(cartRows).toHaveCount(2, { timeout: 15000 });
  await expect(tshirtRow).toBeVisible();
  await expect(jacketRow).toBeVisible();

  const tshirtPrice = toNumber(await tshirtRow.getByTestId('product-unit-price').innerText());
  const jacketPrice = toNumber(await jacketRow.getByTestId('product-unit-price').innerText());
  await expect.poll(() => readSubtotal(page)).toBe(tshirtPrice + jacketPrice);

  // 3. INCREMENT THE T-SHIRT QUANTITY FROM 1 TO 2 (scoped to its own row)
  const tshirtQuantity = tshirtRow.getByTestId('product-select-button');
  await expect(tshirtQuantity).toHaveValue('1');
  await tshirtQuantity.selectOption('2');

  await expect(tshirtQuantity).toHaveValue('2', { timeout: 20000 });
  // Subtotal goes up to include both T-shirts plus the jacket
  await expect.poll(() => readSubtotal(page), { timeout: 20000 }).toBe(tshirtPrice * 2 + jacketPrice);

  // 4. REMOVE THE WINTER JACKET (the trash icon is the only button inside its row)
  await jacketRow.getByRole('button').click();

  await expect(jacketRow).toBeHidden({ timeout: 20000 });
  await expect(cartRows).toHaveCount(1);
  await expect(tshirtRow).toBeVisible();
  // Subtotal goes down to just the remaining T-shirts
  await expect.poll(() => readSubtotal(page), { timeout: 20000 }).toBe(tshirtPrice * 2);

  // 5. VERIFY THE CART SUMMARY AND PROCEED TO CHECKOUT
  const goToCheckoutBtn = page.getByRole('button', { name: /go to checkout/i });
  await expect(goToCheckoutBtn).toBeVisible();
  await expect(goToCheckoutBtn).toBeEnabled();
  await goToCheckoutBtn.click();

  await expect(page).toHaveURL(/.*\/vn\/checkout/, { timeout: 20000 });

  // The shipping address form is shown
  await expect(page.getByRole('heading', { name: /shipping address/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('shipping-first-name-input')).toBeVisible();
  await expect(page.getByTestId('shipping-last-name-input')).toBeVisible();
  await expect(page.getByTestId('shipping-address-input')).toBeVisible();
  await expect(page.getByTestId('shipping-email-input')).toBeVisible();

  // The order summary panel lists only the remaining item with the correct quantity and subtotal
  await expect(page.getByRole('heading', { name: /in your cart/i })).toBeVisible();
  const summaryItems = page.getByTestId('items-table').getByTestId('product-row');
  await expect(summaryItems).toHaveCount(1);
  await expect(summaryItems.filter({ hasText: /classic t-shirt/i })).toContainText('2x');
  await expect(summaryItems.filter({ hasText: /winter jacket/i })).toHaveCount(0);
  await expect.poll(() => readSubtotal(page)).toBe(tshirtPrice * 2);
});
