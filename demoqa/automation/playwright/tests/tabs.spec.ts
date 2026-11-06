import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-TA-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/tabs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'What' })).toBeVisible();
});

test.describe('Tabs', () => {
  test('UI-TA-001 What tab is selected at load', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'What' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('Lorem Ipsum is simply dummy text');
  });

  test('UI-TA-002 selecting Origin switches the visible panel', async ({ page }) => {
    await page.getByRole('tab', { name: 'Origin' }).click();
    await expect(page.getByRole('tab', { name: 'Origin' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'What' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tabpanel')).toContainText('Contrary to popular belief');
  });

  test('UI-TA-003 disabled More tab cannot be selected', async ({ page }) => {
    const more = page.getByRole('tab', { name: 'More' });
    await expect(more).toHaveAttribute('aria-disabled', 'true');
    // Playwright refuses to click a disabled control; dispatching the click mimics a user's attempt.
    await more.dispatchEvent('click');
    await expect(more).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'What' })).toHaveAttribute('aria-selected', 'true');
  });
});
