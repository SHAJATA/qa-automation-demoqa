import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/alerts-frames-windows-observed-behavior.md (OBS-FR-*, OBS-NF-*)

test.describe('Frames', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/frames', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#frame1')).toBeAttached();
  });

  test('UI-FR-001 large frame shows the sample heading', async ({ page }) => {
    await expect(page.frameLocator('#frame1').locator('#sampleHeading')).toHaveText('This is a sample page');
  });

  test('UI-FR-002 small frame shows the sample heading', async ({ page }) => {
    await expect(page.frameLocator('#frame2').locator('#sampleHeading')).toHaveText('This is a sample page');
  });

  test('UI-FR-003 frame content is isolated from the main document', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Frames' })).toBeVisible();
    await expect(page.frameLocator('#frame1').locator('#sampleHeading')).toBeVisible();
    await expect(page.locator('#sampleHeading')).toHaveCount(0);
  });
});
