import { test, expect, type Page, type Locator } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-TT-*)

/** Hover until the tooltip shows. The first hover after load can be missed while handlers attach (OBS-TT-02). */
async function hoverForTooltip(page: Page, target: Locator) {
  const tip = page.getByRole('tooltip');
  await expect(async () => {
    await page.mouse.move(0, 0);
    await target.hover();
    await expect(tip).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 10_000 });
  return tip;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tool-tips', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#toolTipButton')).toBeVisible();
});

test.describe('Tool Tips', () => {
  for (const [id, label, target, text] of [
    ['UI-TT-001', 'button', '#toolTipButton', 'You hovered over the Button'],
    ['UI-TT-002', 'text field', '#toolTipTextField', 'You hovered over the text field'],
    ['UI-TT-003', 'Contrary link', '#texToolTopContainer a >> text=Contrary', 'You hovered over the Contrary'],
    ['UI-TT-004', 'section link', '#texToolTopContainer a >> text=1.10.32', 'You hovered over the 1.10.32'],
  ] as const) {
    test(`${id} ${label} shows its tooltip on hover`, async ({ page }) => {
      const tip = await hoverForTooltip(page, page.locator(target));
      await expect(tip).toHaveText(text);
    });
  }

  test('UI-TT-005 tooltip disappears when the pointer leaves', async ({ page }) => {
    const tip = await hoverForTooltip(page, page.locator('#toolTipTextField'));
    await page.mouse.move(0, 0);
    await expect(tip).toHaveCount(0);
  });
});
