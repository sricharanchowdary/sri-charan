import { test, expect } from '@playwright/test';

test.describe('Copy Email to Clipboard Feature', () => {
  test('should render copy button, copy email on click, and provide visual feedback', async ({ page, context }) => {
    // 1. Grant clipboard read/write permissions to browser context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 2. Navigate to the contact page
    await page.goto('/contact');

    // 3. Locate the Copy Email button
    const copyButton = page.locator('#copy-email-btn');
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText(/Copy Email/i);

    // 4. Click the copy button
    await copyButton.click();

    // 5. Assert button displays temporary visual confirmation
    await expect(copyButton).toHaveText(/Copied!/i);

    // 6. Assert the clipboard contains the actual email text
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/@|cc6391538@gmail\.com/i);
  });
});
