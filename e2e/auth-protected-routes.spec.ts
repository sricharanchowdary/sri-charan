import { test, expect } from '@playwright/test';

test.describe('Auth Route Protection Middleware', () => {
  test('allows public read access to /academy without redirect', async ({ page }) => {
    const response = await page.goto('/academy');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('Security Academy');
  });

  test('allows public access to /verify certificate portal', async ({ page }) => {
    const response = await page.goto('/verify');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('Certificate Verification');
  });
});
