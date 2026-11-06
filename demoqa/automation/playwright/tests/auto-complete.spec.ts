import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-AU-*)
function ac(page: Page) {
  const multi = page.locator('#autoCompleteMultipleContainer');
  const single = page.locator('#autoCompleteSingleContainer');
  return {
    multiInput: page.locator('#autoCompleteMultipleInput'), singleInput: page.locator('#autoCompleteSingleInput'),
    options: page.getByRole('option'),
    option: (name: string) => page.getByRole('option', { name, exact: true }),
    chips: multi.locator('[class*="multi-value__label"]'),
    removeChip: (name: string) => multi.locator('[class*="multi-value"]').filter({ hasText: new RegExp(`^${name}$`) }).locator('[class*="multi-value__remove"]'),
    singleValue: single.locator('[class*="singleValue"], [class*="single-value"]'),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/auto-complete', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#autoCompleteMultipleInput')).toBeVisible();
});

test.describe('Auto Complete', () => {
  test('UI-AU-001 typing suggests colours containing the text', async ({ page }) => {
    const a = ac(page);
    await a.multiInput.pressSequentially('r');
    await expect(a.options).toHaveText(['Red', 'Green', 'Purple']);
  });

  test('UI-AU-002 choosing two colours creates two chips', async ({ page }) => {
    const a = ac(page);
    await a.multiInput.pressSequentially('Red'); await a.option('Red').click();
    await a.multiInput.pressSequentially('Gre'); await a.option('Green').click();
    await expect(a.chips).toHaveText(['Red', 'Green']);
  });

  test('UI-AU-003 an already chosen colour is not suggested again', async ({ page }) => {
    const a = ac(page);
    await a.multiInput.pressSequentially('Red'); await a.option('Red').click();
    await a.multiInput.pressSequentially('r');
    await expect(a.options).toHaveText(['Green', 'Purple']);
  });

  test('UI-AU-004 removing a chip removes only that colour', async ({ page }) => {
    const a = ac(page);
    await a.multiInput.pressSequentially('Red'); await a.option('Red').click();
    await a.multiInput.pressSequentially('Gre'); await a.option('Green').click();
    await a.removeChip('Red').click();
    await expect(a.chips).toHaveText(['Green']);
  });

  test('UI-AU-005 single input keeps only the latest choice', async ({ page }) => {
    const a = ac(page);
    await a.singleInput.pressSequentially('Bl');
    await expect(a.options).toHaveText(['Blue', 'Black']);
    await a.option('Blue').click();
    await expect(a.singleValue).toHaveText('Blue');
    await a.singleInput.pressSequentially('Ye'); await a.option('Yellow').click();
    await expect(a.singleValue).toHaveText('Yellow');
  });

  test('UI-AU-006 text with no match offers no options', async ({ page }) => {
    const a = ac(page);
    await a.multiInput.pressSequentially('zzz');
    await expect(a.multiInput).toHaveValue('zzz');
    await expect(a.options).toHaveCount(0);
  });
});
