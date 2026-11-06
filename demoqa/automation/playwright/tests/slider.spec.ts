import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-SL-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/slider', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('slider')).toBeVisible();
});

test.describe('Slider', () => {
  test('UI-SL-001 slider starts at 25 with matching value box', async ({ page }) => {
    const slider = page.getByRole('slider');
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '100');
    await expect(slider).toHaveValue('25');
    await expect(page.locator('#sliderValue')).toHaveValue('25');
  });

  test('UI-SL-002 arrow key moves the slider by one', async ({ page }) => {
    await page.getByRole('slider').press('ArrowRight');
    await expect(page.getByRole('slider')).toHaveValue('26');
    await expect(page.locator('#sliderValue')).toHaveValue('26');
  });

  test('UI-SL-003 Home and End reach the minimum and maximum (boundary)', async ({ page }) => {
    const slider = page.getByRole('slider');
    await slider.press('End');
    await expect(page.locator('#sliderValue')).toHaveValue('100');
    await slider.press('Home');
    await expect(page.locator('#sliderValue')).toHaveValue('0');
  });
});
