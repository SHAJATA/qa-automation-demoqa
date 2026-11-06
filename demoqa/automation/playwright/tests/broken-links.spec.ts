import { test, expect, type Locator } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-BL-*)

async function loadedWidth(img: Locator) {
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete)).toBe(true);
  return img.evaluate((i: HTMLImageElement) => i.naturalWidth);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/broken', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Click Here for Valid Link')).toBeVisible();
});

test.describe('Broken Links - Images', () => {
  test('UI-BL-001 image labelled valid renders', async ({ page }) => {
    // Expected to fail today: suspected product defect OBS-BL-01 (see test-cases/failure-triage.csv).
    expect(await loadedWidth(page.locator('img[src="/images/Toolsqa.jpg"]'))).toBeGreaterThan(0);
  });

  test('UI-BL-002 image labelled broken does not render', async ({ page }) => {
    expect(await loadedWidth(page.locator('img[src="/images/Toolsqa_1.jpg"]'))).toBe(0);
  });

  test('UI-BL-003 valid link navigates to the DemoQA home page', async ({ page }) => {
    await page.getByText('Click Here for Valid Link').click();
    await expect(page).toHaveURL('https://demoqa.com/');
  });

  test('UI-BL-004 broken link target responds with HTTP 500 (external dependency)', async ({ page }) => {
    const link = page.getByText('Click Here for Broken Link');
    await expect(link).toHaveAttribute('href', 'http://the-internet.herokuapp.com/status_codes/500');
    // Third-party site (OBS-BL-04): a network failure here is an environment issue, not a DemoQA result.
    const response = await page.request.get((await link.getAttribute('href'))!, { timeout: 45_000 });
    expect(response.status()).toBe(500);
  });
});
