import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';

test('E2E Cart Workflow: Select variant, add to cart, verify drawer & update quantity', async ({ page }) => {
  // Add-to-cart and quantity updates go through the Render Cloud backend, which can be slow on cold start.
  test.setTimeout(240_000);
  const productPage = new ProductPage(page);
  const cartPage = new CartPage(page);

  // 1. Open the product from the catalog (/vn/store)
  await productPage.openProductFromStore('Classic T-Shirt');
  await expect(page).toHaveURL(/.*\/products\/classic-t-shirt/);
  await expect(productPage.productTitle).toContainText(/classic t-shirt/i, { timeout: 15_000 });

  // 2. Select product variants (role-based locators inside the page object)
  await productPage.selectSize('L');
  await productPage.selectColor('Black');

  // 3. Add to cart
  await expect(productPage.addToCartButton).toBeEnabled({ timeout: 15_000 });
  await productPage.addToCart();

  // 4. Verify cart state: the slide-out drawer opens and the cart badge shows 1
  await expect(cartPage.cartDrawer).toBeVisible({ timeout: 20_000 });
  await expect(cartPage.cartBadge(1)).toBeVisible();
  await expect(cartPage.drawerItem('Classic T-Shirt')).toContainText(/variant:\s*L\s*\/\s*Black/i);

  // The drawer auto-closes after a few seconds, so go to the cart straight away
  await cartPage.goToCartFromDrawer();
  await expect(page).toHaveURL(/.*\/cart/);

  // 5. Update quantity from 1 to 2 and validate the subtotal
  await expect(cartPage.lineItem('Classic T-Shirt')).toBeVisible({ timeout: 15_000 });
  const unitPrice = await cartPage.readUnitPrice('Classic T-Shirt');
  await expect.poll(() => cartPage.readSubtotal()).toBe(unitPrice);
  await expect(cartPage.quantitySelect('Classic T-Shirt')).toHaveValue('1');

  await cartPage.setQuantity('Classic T-Shirt', 2);

  await expect(cartPage.quantitySelect('Classic T-Shirt')).toHaveValue('2', { timeout: 20_000 });
  await expect.poll(() => cartPage.readSubtotal(), { timeout: 20_000 }).toBe(unitPrice * 2);
});
