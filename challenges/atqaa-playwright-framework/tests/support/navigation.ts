import { expect, Page } from '@playwright/test';

/**
 * Navigates to `url`, retrying while the staging server answers with a 5xx error.
 *
 * The free-tier backend sleeps when idle; the first requests after a pause return
 * Vercel's "504 MIDDLEWARE_INVOCATION_TIMEOUT" page instead of the storefront.
 * expect().toPass() retries the navigation until a non-5xx response arrives
 * (no hardcoded waitForTimeout).
 */
export async function gotoStorefront(page: Page, url: string, timeout = 120_000): Promise<void> {
  await expect(async () => {
    const response = await page.goto(url, { timeout: 45_000 });
    expect(response?.status(), `GET ${url} returned a server error`).toBeLessThan(500);
  }).toPass({ timeout });
}
