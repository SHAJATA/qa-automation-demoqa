import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-DP-*)
// Changes happen ~5 s after load, so assertions wait up to 10 s for the new state instead of sleeping.
const AFTER_DELAY = { timeout: 10_000 };

test.beforeEach(async ({ page }) => {
  await page.goto('/dynamic-properties', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#enableAfter')).toBeAttached();
});

test.describe('Dynamic Properties', () => {
  test('UI-DP-001 delayed button starts disabled and becomes enabled', async ({ page }) => {
    const button = page.locator('#enableAfter');
    await expect(button).toBeDisabled();
    await expect(button).toBeEnabled(AFTER_DELAY);
  });

  test('UI-DP-002 Color Change button turns to the danger colour', async ({ page }) => {
    const button = page.locator('#colorChange');
    await expect(button).not.toHaveClass(/text-danger/);
    await expect(button).toHaveClass(/text-danger/, AFTER_DELAY);
    await expect(button).toHaveCSS('color', 'rgb(220, 53, 69)');
  });

  test('UI-DP-003 hidden button appears after the delay', async ({ page }) => {
    const button = page.locator('#visibleAfter');
    await expect(button).toHaveCount(0);
    await expect(button).toBeVisible(AFTER_DELAY);
  });

  test('UI-DP-004 random-id text is found by its text and has a non-empty id', async ({ page }) => {
    const text = page.getByText('This text has random Id', { exact: true });
    await expect(text).toBeVisible();
    await expect(text).toHaveAttribute('id', /\S+/);
  });
});
