import { test, expect } from '@playwright/test';

test.describe('FlowExplorer Sequence Diagram Component E2E', () => {
  test('navigates to /academy, interacts with stepper buttons, and tests auto-play & reset', async ({ page }) => {
    await page.goto('/academy');

    // Verify FlowExplorer container is mounted
    const flowExplorer = page.locator('#oauth-flow');
    await expect(flowExplorer).toBeVisible();

    // Check initial step state (Step 1)
    const currentStepNum = flowExplorer.locator('.current-step-num');
    await expect(currentStepNum).toHaveText('1');

    const prevBtn = flowExplorer.locator('.btn-prev');
    const nextBtn = flowExplorer.locator('.btn-next');
    const resetBtn = flowExplorer.locator('.btn-reset');
    const autoPlayBtn = flowExplorer.locator('.btn-autoplay');

    // Prev button should be disabled at step 1
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // Click Next button -> Step 2
    await nextBtn.click();
    await expect(currentStepNum).toHaveText('2');
    await expect(prevBtn).toBeEnabled();

    // Click Next button -> Step 3
    await nextBtn.click();
    await expect(currentStepNum).toHaveText('3');

    // Click Reset button -> Step 1
    await resetBtn.click();
    await expect(currentStepNum).toHaveText('1');
    await expect(prevBtn).toBeDisabled();

    // Test Auto-Play toggle
    await autoPlayBtn.click();
    await expect(flowExplorer.locator('.autoplay-text')).toHaveText('Pause');

    // Click Auto-Play again to pause
    await autoPlayBtn.click();
    await expect(flowExplorer.locator('.autoplay-text')).toHaveText('Auto-play');

    // Test direct dot jumping
    const dots = flowExplorer.locator('.step-dot');
    await dots.nth(3).click(); // Click 4th dot (Step 4)
    await expect(currentStepNum).toHaveText('4');
  });

  test('copies code snippet to clipboard when present', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/academy');
    const flowExplorer = page.locator('#oauth-flow');
    await expect(flowExplorer).toBeVisible();

    const snippetDrawer = flowExplorer.locator('.snippet-container');
    await expect(snippetDrawer).toBeVisible();

    const copyBtn = flowExplorer.locator('.btn-copy-snippet');
    await copyBtn.click();

    await expect(flowExplorer.locator('.copy-text')).toHaveText('Copied!');
  });
});
