import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-PB-*)
// Playwright's fake clock drives the page timers, so progress is controlled without real-time sleeps.

const bar = (page: Page) => page.getByRole('progressbar');
const value = async (page: Page) => Number(await bar(page).getAttribute('aria-valuenow'));

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/progress-bar', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#startStopButton')).toHaveText('Start');
});

test.describe('Progress Bar', () => {
  test('UI-PB-001 progress starts at 0 percent', async ({ page }) => {
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '0');
    await expect(bar(page)).toHaveText('0%');
  });

  test('UI-PB-002 Start advances progress and offers Stop', async ({ page }) => {
    await page.locator('#startStopButton').click();
    await expect(page.locator('#startStopButton')).toHaveText('Stop');
    await page.clock.runFor(2_000);
    await expect.poll(() => value(page)).toBeGreaterThan(0);
    expect(await value(page)).toBeLessThan(100);
  });

  test('UI-PB-003 Stop pauses progress', async ({ page }) => {
    await page.locator('#startStopButton').click();
    await page.clock.runFor(2_000);
    await page.locator('#startStopButton').click();
    await expect(page.locator('#startStopButton')).toHaveText('Start');
    const paused = await value(page);
    expect(paused).toBeGreaterThan(0);
    await page.clock.runFor(3_000);
    expect(await value(page)).toBe(paused);
  });

  test('UI-PB-004 completed progress turns green and Reset returns to 0', async ({ page }) => {
    await page.locator('#startStopButton').click();
    await page.clock.runFor(20_000);
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '100');
    await expect(bar(page)).toHaveText('100%');
    await expect(bar(page)).toHaveClass(/bg-success/);
    await page.locator('#resetButton').click();
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#startStopButton')).toHaveText('Start');
  });
});
