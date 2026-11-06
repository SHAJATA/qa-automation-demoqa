import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/alerts-frames-windows-observed-behavior.md (OBS-BW-*)
const MESSAGE = 'Knowledge increases by sharing but not by saving. Please share this website with your friends and in your organization.';

test.beforeEach(async ({ page }) => {
  await page.goto('/browser-windows', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#tabButton')).toBeVisible();
});

test.describe('Browser Windows', () => {
  test('UI-BW-001 New Tab opens the sample page', async ({ page, context }) => {
    const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('#tabButton').click()]);
    await expect(tab).toHaveURL('https://demoqa.com/sample');
    await expect(tab.locator('#sampleHeading')).toHaveText('This is a sample page');
    await expect(page).toHaveURL(/\/browser-windows$/);
  });

  test('UI-BW-002 New Window opens the sample page', async ({ page, context }) => {
    const [win] = await Promise.all([context.waitForEvent('page'), page.locator('#windowButton').click()]);
    await expect(win).toHaveURL('https://demoqa.com/sample');
    await expect(win.locator('#sampleHeading')).toHaveText('This is a sample page');
  });

  test('UI-BW-003 New Window Message shows the message text', async ({ page, context }) => {
    const [win] = await Promise.all([context.waitForEvent('page'), page.locator('#messageWindowButton').click()]);
    // This window is written into about:blank and never fires a normal load (OBS-BW-03), so assert on its content directly.
    await expect(win.locator('body')).toHaveText(MESSAGE);
  });

  test('UI-BW-004 original page stays usable after closing the new tab', async ({ page, context }) => {
    const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('#tabButton').click()]);
    await expect(tab.locator('#sampleHeading')).toBeVisible();
    await tab.close();
    const [win] = await Promise.all([context.waitForEvent('page'), page.locator('#windowButton').click()]);
    await expect(win.locator('#sampleHeading')).toHaveText('This is a sample page');
  });
});
