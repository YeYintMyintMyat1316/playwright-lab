import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { MedusaAdminApi } from '../api/MedusaAdminApi';
import { guestShopper } from './data/checkout-data';

test.describe('Lab 03 - Guest checkout E2E (Product → Cart → Checkout → Order)', () => {
  test('Guest buys 2 Classic T-Shirts and the order is created', async ({ page, request }) => {
    test.setTimeout(420_000);

    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const shopper = guestShopper();
    let unitPrice = 0;

    await test.step('Product page: choose variant M / White and add to bag', async () => {
      await productPage.openProductFromStore('Classic T-Shirt');
      await expect(productPage.productTitle).toContainText(/classic t-shirt/i, { timeout: 15_000 });
      await productPage.selectSize('M');
      await productPage.selectColor('White');
      await productPage.addToCart();
    });

    await test.step('Cart drawer: item is shown, badge shows 1, go to cart', async () => {
      await expect(cartPage.cartDrawer).toBeVisible({ timeout: 20_000 });
      await expect(cartPage.cartBadge(1)).toBeVisible();
      await expect(cartPage.drawerItem('Classic T-Shirt')).toContainText(/M\s*\/\s*White/i);
      await cartPage.goToCartFromDrawer();
      await expect(cartPage.pageHeading).toBeVisible({ timeout: 20_000 });
    });

    await test.step('Cart page: change quantity 1 → 2 and the subtotal doubles', async () => {
      await expect(cartPage.lineItem('Classic T-Shirt')).toBeVisible();
      unitPrice = await cartPage.readUnitPrice('Classic T-Shirt');
      await expect.poll(() => cartPage.readSubtotal()).toBe(unitPrice);

      await cartPage.setQuantity('Classic T-Shirt', 2);
      await expect(cartPage.quantitySelect('Classic T-Shirt')).toHaveValue('2', { timeout: 20_000 });
      await expect.poll(() => cartPage.readSubtotal(), { timeout: 20_000 }).toBe(unitPrice * 2);

      await expect(cartPage.checkoutButton).toBeEnabled();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/vn\/checkout/);
    });

    await test.step('Checkout: shipping address', async () => {
      await expect(checkoutPage.shippingAddressHeading).toBeVisible({ timeout: 30_000 });
      await expect(checkoutPage.orderSummaryHeading).toBeVisible();
      await expect(checkoutPage.orderSummaryItem('Classic T-Shirt')).toContainText('2x');

      await checkoutPage.fillShippingAddress(shopper);
      await checkoutPage.continueToDelivery();
      await expect(checkoutPage.shippingAddressSummary).toContainText(shopper.address);
    });

    await test.step('Checkout: standard delivery', async () => {
      await checkoutPage.selectShippingMethod('Standard Shipping');
      await expect(checkoutPage.continueToPaymentButton).toBeEnabled({ timeout: 30_000 });
      await checkoutPage.continueToPayment();
      await expect(checkoutPage.deliverySummary).toBeVisible();
    });

    await test.step('Checkout: payment and review', async () => {
      await checkoutPage.selectPaymentMethod('Manual Payment');
      await expect(checkoutPage.continueToReviewButton).toBeEnabled({ timeout: 30_000 });
      await checkoutPage.continueToReview();
      await expect(checkoutPage.paymentMethodSummary).toContainText(/manual payment/i);

      // Order summary total = 2 × unit price + shipping
      await expect.poll(() => checkoutPage.readSubtotal()).toBe(unitPrice * 2);
      await expect(checkoutPage.placeOrderButton).toBeEnabled();
    });

    let orderId = '';
    await test.step('Place order: confirmation page shows the order number', async () => {
      await checkoutPage.placeOrder();
      await expect(checkoutPage.orderConfirmation).toBeVisible({ timeout: 30_000 });
      await expect(checkoutPage.orderNumber).toHaveText(/\d+/);
      orderId = checkoutPage.orderIdFromUrl();
      expect(orderId).toMatch(/^order_/);
      test.info().annotations.push({ type: 'order', description: `${orderId} (${shopper.email})` });
    });

    await test.step('Admin: order exists in the Medusa back office', async () => {
      if (!MedusaAdminApi.isConfigured()) {
        test.info().annotations.push({
          type: 'admin-check-skipped',
          description: 'Set MEDUSA_BACKEND_URL, MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD to verify the order in Medusa Admin.',
        });
        return;
      }
      const admin = new MedusaAdminApi(request);
      await admin.login();
      const order = await admin.getOrder(orderId);
      expect(order.id).toBe(orderId);
      expect(order.email).toBe(shopper.email);
      expect(order.items.find((i) => /classic t-shirt/i.test(i.product_title ?? i.title))?.quantity).toBe(2);
    });
  });
});
