import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-AC-*)
const HEADERS = ['What is Lorem Ipsum?', 'Where does it come from?', 'Why do we use it?'];
const body = (page: Page, i: number) => page.locator('.accordion-item').nth(i).locator('.accordion-collapse');

test.beforeEach(async ({ page }) => {
  await page.goto('/accordian', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: HEADERS[0] })).toBeVisible();
});

test.describe('Accordian', () => {
  test('UI-AC-001 first section is open at load and the others are closed', async ({ page }) => {
    await expect(body(page, 0)).toBeVisible();
    await expect(body(page, 1)).toBeHidden();
    await expect(body(page, 2)).toBeHidden();
  });

  test('UI-AC-002 opening another section closes the open one', async ({ page }) => {
    await page.getByRole('button', { name: HEADERS[1] }).click();
    await expect(body(page, 1)).toBeVisible();
    await expect(body(page, 0)).toBeHidden();
    await expect(body(page, 1)).toContainText('Contrary to popular belief');
  });

  test('UI-AC-003 clicking the open section collapses it', async ({ page }) => {
    await page.getByRole('button', { name: HEADERS[0] }).click();
    for (const i of [0, 1, 2]) await expect(body(page, i)).toBeHidden();
  });
});
