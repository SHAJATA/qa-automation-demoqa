import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-MN-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  // #nav itself has zero height (floated items), so wait on a visible link instead.
  await expect(page.locator('#nav a').first()).toBeVisible();
});

const visibleItems = (page: import('@playwright/test').Page) => page.locator('#nav a').filter({ visible: true });

test.describe('Menu', () => {
  test('UI-MN-001 only the three main items are visible at load', async ({ page }) => {
    await expect(visibleItems(page)).toHaveText(['Main Item 1', 'Main Item 2', 'Main Item 3']);
  });

  test('UI-MN-002 hovering Main Item 2 reveals its submenu', async ({ page }) => {
    await page.locator('#nav a', { hasText: /^Main Item 2$/ }).hover();
    await expect(visibleItems(page)).toHaveText(['Main Item 1', 'Main Item 2', 'Sub Item', 'Sub Item', 'SUB SUB LIST »', 'Main Item 3']);
  });

  test('UI-MN-003 hovering SUB SUB LIST reveals the nested submenu', async ({ page }) => {
    await page.locator('#nav a', { hasText: /^Main Item 2$/ }).hover();
    await page.locator('#nav a', { hasText: 'SUB SUB LIST' }).hover();
    await expect(page.locator('#nav a', { hasText: /^Sub Sub Item 1$/ })).toBeVisible();
    await expect(page.locator('#nav a', { hasText: /^Sub Sub Item 2$/ })).toBeVisible();
  });
});
