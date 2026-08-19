import { test, expect } from '@playwright/test';

test.describe('Astro Portfolio End-to-End Tests', () => {

  // ── Test 1: Dark Mode Toggle and State Persistence ─────────────────────────
  test('locates theme-toggle button, toggles theme, and verifies persistence across reload', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Locate the theme toggle button
    const themeToggle = page.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Check initial state of the <html> element
    const htmlElement = page.locator('html');
    const initiallyDark = await htmlElement.evaluate((el) => el.classList.contains('dark'));

    // Click the toggle button to switch state
    await themeToggle.click();

    // Verify the class changed immediately on <html>
    if (initiallyDark) {
      await expect(htmlElement).not.toHaveClass(/dark/);
    } else {
      await expect(htmlElement).toHaveClass(/dark/);
    }

    // Verify localStorage has the newly saved theme preference
    const savedThemeAfterClick = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedThemeAfterClick).toBe(initiallyDark ? 'light' : 'dark');

    // Reload the page to test persistence
    await page.reload();

    // Assert that the theme state persisted after page reload
    if (initiallyDark) {
      await expect(htmlElement).not.toHaveClass(/dark/);
    } else {
      await expect(htmlElement).toHaveClass(/dark/);
    }

    const savedThemeAfterReload = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedThemeAfterReload).toBe(initiallyDark ? 'light' : 'dark');
  });


  // ── Test 2: Contact Form Submission & Success Message ─────────────────────
  test('fills out contact form, submits, and verifies success message appears', async ({ page }) => {
    // Intercept /api/contact to simulate a successful submission response
    await page.route('/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          message: 'Thanks. Your message was received.',
        }),
      });
    });

    // Navigate to contact page
    await page.goto('/contact');

    // Verify contact form and elements exist
    const form = page.locator('#contact-form');
    await expect(form).toBeVisible();

    const nameInput = page.locator('#name');
    const emailInput = page.locator('#email');
    const messageInput = page.locator('#message');
    const submitButton = page.locator('#submit-button');
    const statusMessage = page.locator('#form-status');

    // Fill out valid contact information
    await nameInput.fill('Sri Charan Test');
    await emailInput.fill('tester@example.com');
    await messageInput.fill('Hello! This is an automated end-to-end test verifying contact form submission.');

    // Click the submit button
    await submitButton.click();

    // Verify the success status message appears with positive confirmation
    await expect(statusMessage).toBeVisible();
    await expect(statusMessage).toContainText(/Thanks|received|success/i);

    // Verify the form fields were reset after successful submission
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');
    await expect(messageInput).toHaveValue('');
  });

});
