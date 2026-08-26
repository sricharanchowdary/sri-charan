import { test, expect } from '@playwright/test';

test.describe('Exam Submission & Dynamic Certificate Verification Portal', () => {
  test('displays certificate details correctly on /verify/[serial]', async ({ page }) => {
    // Navigate to a valid serial verification URL
    await page.goto('/verify/IA-SEC-8942A');

    await expect(page.locator('main h1')).toContainText('Credential Verification Registry');
    await expect(page.locator('text=Certificate of Competency')).toBeVisible();
    await expect(page.locator('text=IA-SEC-8942A')).toBeVisible();
    await expect(page.locator('text=ACTIVE & VERIFIED')).toBeVisible();
    await expect(page.locator('text=SHA-256 Tamper-Evident Seal')).toBeVisible();
  });

  test('displays revoked / not found state on invalid serial', async ({ page }) => {
    // Navigate to an invalid/non-existent serial
    await page.goto('/verify/INVALID_SERIAL_123');

    await expect(page.locator('main h1')).toContainText('Certificate Not Found or Revoked');
    await expect(page.locator('text=INVALID_SERIAL_123')).toBeVisible();
  });
});
