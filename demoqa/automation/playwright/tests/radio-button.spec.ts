import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-RB-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/radio-button', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('radio', { name: 'Yes' })).toBeAttached();
});

const result = (page: import('@playwright/test').Page) => page.locator('p').filter({ has: page.locator('.text-success') });

test.describe('Radio Button', () => {
  test('UI-RB-001 no radio is selected initially', async ({ page }) => {
    for (const name of ['Yes', 'Impressive', 'No']) await expect(page.getByRole('radio', { name, exact: true })).not.toBeChecked();
    await expect(result(page)).toHaveCount(0);
  });

  test('UI-RB-002 selecting Yes shows it as the selection', async ({ page }) => {
    // The input is visually hidden behind a styled label, so users (and this test) click the label.
    await page.locator('label[for="yesRadio"]').click();
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked();
    await expect(result(page)).toHaveText('You have selected Yes');
  });

  test('UI-RB-003 selecting another option replaces the previous one', async ({ page }) => {
    await page.locator('label[for="yesRadio"]').click();
    await page.locator('label[for="impressiveRadio"]').click();
    await expect(page.getByRole('radio', { name: 'Impressive' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Yes' })).not.toBeChecked();
    await expect(result(page)).toHaveText('You have selected Impressive');
  });

  test('UI-RB-004 disabled No option cannot be selected', async ({ page }) => {
    const no = page.getByRole('radio', { name: 'No', exact: true });
    await page.locator('label[for="impressiveRadio"]').click();
    await expect(no).toBeDisabled();
    // Playwright refuses to click a disabled control; dispatching the label's click event mimics a user's attempt.
    await page.locator('label[for="noRadio"]').dispatchEvent('click');
    await expect(no).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'Impressive' })).toBeChecked();
    await expect(result(page)).toHaveText('You have selected Impressive');
  });
});
