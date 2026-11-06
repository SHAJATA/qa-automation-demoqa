import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/alerts-frames-windows-observed-behavior.md (OBS-NF-*)

test.describe('Nested Frames', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nestedframes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#frame1')).toBeAttached();
  });

  test('UI-NF-001 parent frame shows its text and one child frame', async ({ page }) => {
    const parent = page.frameLocator('#frame1');
    await expect(parent.locator('body')).toHaveText(/^\s*Parent frame\s*$/);
    await expect(parent.locator('iframe')).toHaveCount(1);
  });

  test('UI-NF-002 child frame inside the parent shows its text', async ({ page }) => {
    await expect(page.frameLocator('#frame1').frameLocator('iframe').locator('body')).toHaveText('Child Iframe');
  });
});
