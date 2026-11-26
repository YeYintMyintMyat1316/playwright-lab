import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';

test.describe('Medusa Storefront - Product Detail & Variant Suite', () => {
  let productPage: ProductPage;
  let cartPage: CartPage;

  // Lifecycle Hook: runs before EACH test. Every test gets a fresh, isolated browser context,
  // so each one starts with an empty cart.
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    await productPage.openProductFromStore('Classic T-Shirt');
  });

  // TEST CASE 1: Metadata & Pricing Verification
  test('TC01: Product title and pricing render accurately', async () => {
    await expect(productPage.productTitle).toBeVisible({ timeout: 15_000 });
    await expect(productPage.productTitle).toContainText(/classic t-shirt/i);
    await expect(productPage.priceTag).toBeVisible();
    await expect(productPage.priceTag).toContainText(/₫\s?[\d,]+/);
    await expect(cartPage.cartBadge(0)).toBeVisible();
  });

  // TEST CASE 2: Single Variant Selection & Cart Injection
  test('TC02: Guest selects Size M, color White and adds item to bag', async () => {
    await productPage.selectSize('M');
    await productPage.selectColor('White');
    await productPage.addToCart();

    await expect(cartPage.cartDrawer).toBeVisible({ timeout: 20_000 });
    await expect(cartPage.cartBadge(1)).toBeVisible();
  });

  // TEST CASE 3: Dynamic Variant State Switching
  test('TC03: User can switch sizes from S to L and color from Black to White before adding to bag', async () => {
    await productPage.selectSize('S');
    await productPage.selectSize('L');
    await productPage.selectColor('Black');
    await productPage.selectColor('White');
    await productPage.addToCart();

    await expect(cartPage.cartDrawer).toBeVisible({ timeout: 20_000 });
    await expect(cartPage.cartBadge(1)).toBeVisible();
    // Only the LAST choices (L / White) end up in the bag
    await expect(cartPage.drawerItem('Classic T-Shirt')).toContainText(/variant:\s*L\s*\/\s*White/i);
  });

  // TEST CASE 4: Product & Cart Data Synchronization
  test('TC04: Added item details sync accurately into cart drawer', async () => {
    const productPrice = await productPage.priceTag.innerText();

    await productPage.selectSize('M');
    await productPage.selectColor('White');
    await productPage.addToCart();

    await expect(cartPage.cartDrawer).toBeVisible({ timeout: 20_000 });
    const item = cartPage.drawerItem('Classic T-Shirt');
    await expect(item).toHaveCount(1);
    await expect(item).toContainText(/variant:\s*M\s*\/\s*White/i);
    await expect(item).toContainText(/quantity:\s*1/i);
    await expect(item).toContainText(productPrice.trim());
    await expect(cartPage.drawerSubtotal).toContainText(productPrice.trim());
  });
});
