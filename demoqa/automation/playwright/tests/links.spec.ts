import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-LK-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/links', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#simpleLink')).toBeVisible();
});

test.describe('Links', () => {
  test('UI-LK-001 home link opens the DemoQA home page in a new tab', async ({ page, context }) => {
    const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('#simpleLink').click()]);
    await tab.waitForLoadState('domcontentloaded');
    await expect(tab).toHaveURL('https://demoqa.com/');
    await expect(page).toHaveURL(/\/links$/);
  });

  test('UI-LK-002 dynamic home link opens the home page in a new tab', async ({ page, context }) => {
    const link = page.locator('#dynamicLink');
    await expect(link).toHaveText(/^Home[A-Za-z0-9]{5}$/);
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.waitForLoadState('domcontentloaded');
    await expect(tab).toHaveURL('https://demoqa.com/');
  });

  for (const [id, linkId, path, status, text] of [
    ['UI-LK-003', 'created', '/created', 201, 'Created'],
    ['UI-LK-004', 'no-content', '/no-content', 204, 'No Content'],
    ['UI-LK-005', 'moved', '/moved', 301, 'Moved Permanently'],
    ['UI-LK-006', 'bad-request', '/bad-request', 400, 'Bad Request'],
    ['UI-LK-007', 'unauthorized', '/unauthorized', 401, 'Unauthorized'],
    ['UI-LK-008', 'forbidden', '/forbidden', 403, 'Forbidden'],
    ['UI-LK-009', 'invalid-url', '/invalid-url', 404, 'Not Found'],
  ] as const) {
    test(`${id} ${text} link reports status ${status}`, async ({ page }) => {
      // Match the exact API path: the page also makes unrelated ad-network requests.
      const response = page.waitForResponse(r => new URL(r.url()).pathname === path);
      await page.locator(`#${linkId}`).click();
      expect((await response).status()).toBe(status);
      // Assert the code and status text; the surrounding wording has a typo ("staus", OBS-LK-03) that is not the point of the test.
      await expect(page.locator('#linkResponse')).toHaveText(new RegExp(`\\b${status}\\b and status text ${text}$`));
    });
  }
});
