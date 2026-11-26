import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

test('E2E Extended Cart Lifecycle: multiple items, update quantity, remove item, proceed to checkout', async ({ page }) => {
  // This flow makes several round trips to the Render Cloud backend.
  test.setTimeout(360_000);
  const productPage = new ProductPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // 1. Add the first product (with variants): Classic T-Shirt, size L, color Black
  await productPage.openProductFromStore('Classic T-Shirt');
  await productPage.selectSize('L');
  await productPage.selectColor('Black');
  await productPage.addToCart();
  await expect(cartPage.cartBadge(1)).toBeVisible({ timeout: 20_000 });

  // 2. Go back to the catalog and add a second, different product: Winter jacket (no variants)
  await productPage.openProductFromStore('Winter jacket');
  await expect(productPage.productTitle).toContainText(/winter jacket/i, { timeout: 15_000 });
  await productPage.addToCart();
  await expect(cartPage.cartBadge(2)).toBeVisible({ timeout: 20_000 });

  // Both line items are listed on /vn/cart
  await cartPage.open();
  await expect(cartPage.pageHeading).toBeVisible({ timeout: 15_000 });
  await expect(cartPage.lineItems).toHaveCount(2, { timeout: 15_000 });
  await expect(cartPage.lineItem('Classic T-Shirt')).toBeVisible();
  await expect(cartPage.lineItem('Winter jacket')).toBeVisible();

  const tshirtPrice = await cartPage.readUnitPrice('Classic T-Shirt');
  const jacketPrice = await cartPage.readUnitPrice('Winter jacket');
  await expect.poll(() => cartPage.readSubtotal()).toBe(tshirtPrice + jacketPrice);

  // 3. Increment the T-shirt quantity from 1 to 2 (scoped to its own row)
  await expect(cartPage.quantitySelect('Classic T-Shirt')).toHaveValue('1');
  await cartPage.setQuantity('Classic T-Shirt', 2);
  await expect(cartPage.quantitySelect('Classic T-Shirt')).toHaveValue('2', { timeout: 20_000 });
  await expect.poll(() => cartPage.readSubtotal(), { timeout: 20_000 }).toBe(tshirtPrice * 2 + jacketPrice);

  // 4. Remove the Winter jacket
  await cartPage.removeItem('Winter jacket');
  await expect(cartPage.lineItem('Winter jacket')).toBeHidden({ timeout: 20_000 });
  await expect(cartPage.lineItems).toHaveCount(1);
  await expect(cartPage.lineItem('Classic T-Shirt')).toBeVisible();
  await expect.poll(() => cartPage.readSubtotal(), { timeout: 20_000 }).toBe(tshirtPrice * 2);

  // 5. Verify the cart summary and proceed to checkout
  await expect(cartPage.checkoutButton).toBeVisible();
  await expect(cartPage.checkoutButton).toBeEnabled();
  await cartPage.proceedToCheckout();
  await expect(page).toHaveURL(/.*\/vn\/checkout/);

  // The shipping address form is shown
  await expect(checkoutPage.shippingAddressHeading).toBeVisible({ timeout: 20_000 });
  await expect(checkoutPage.firstNameInput).toBeVisible();
  await expect(checkoutPage.lastNameInput).toBeVisible();
  await expect(checkoutPage.addressInput).toBeVisible();
  await expect(checkoutPage.emailInput).toBeVisible();

  // The order summary panel lists only the remaining item with the right quantity and subtotal
  await expect(checkoutPage.orderSummaryHeading).toBeVisible();
  await expect(checkoutPage.orderSummaryItems).toHaveCount(1);
  await expect(checkoutPage.orderSummaryItem('Classic T-Shirt')).toContainText('2x');
  await expect(checkoutPage.orderSummaryItem('Winter jacket')).toHaveCount(0);
  await expect.poll(() => checkoutPage.readSubtotal()).toBe(tshirtPrice * 2);
});
