import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';

test('Verify guest customer can browse store and view Winter jacket details', async ({ page }) => {
  // Allow extra time in case the staging server is waking up from a cold start
  test.setTimeout(150_000);
  const productPage = new ProductPage(page);

  // STEP 1: Navigate to the Storefront homepage (uses baseURL from config)
  await productPage.navigateTo('/');

  // STEP 2: Open the navigation Menu and go to the Store catalog
  await expect(productPage.menuButton).toBeVisible({ timeout: 15_000 });
  await productPage.openStoreFromMenu();
  await expect(page).toHaveURL(/.*\/store/);

  // STEP 3: Select the "Winter jacket" product from the product list
  await expect(productPage.storeProductLink('Winter jacket')).toBeVisible({ timeout: 15_000 });
  await productPage.clickProductInStore('Winter jacket');

  // STEP 4: Web-First Assertions to verify the product detail page
  await expect(page).toHaveURL(/.*products/, { timeout: 15_000 });
  await expect(productPage.productTitle).toContainText(/winter jacket/i);
});
