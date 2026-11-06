import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-DT-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/date-picker', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#datePickerMonthYearInput')).toBeVisible();
});

async function typeDate(page: import('@playwright/test').Page, value: string) {
  const input = page.locator('#datePickerMonthYearInput');
  await input.fill(value);
  await input.press('Enter');
  await page.locator('h1').click(); // leave the field so the picker commits or rejects the text
}

test.describe('Date Picker', () => {
  test('UI-DT-001 date field defaults to today', async ({ page }) => {
    const now = new Date();
    const today = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    await expect(page.locator('#datePickerMonthYearInput')).toHaveValue(today);
  });

  test('UI-DT-002 picker selects the 29 February leap day (boundary)', async ({ page }) => {
    await page.locator('#datePickerMonthYearInput').click();
    await page.locator('.react-datepicker__month-select').selectOption('1');
    await page.locator('.react-datepicker__year-select').selectOption('2024');
    await page.locator('.react-datepicker__day--029:not(.react-datepicker__day--outside-month)').click();
    await expect(page.locator('#datePickerMonthYearInput')).toHaveValue('02/29/2024');
  });

  test('UI-DT-003 typed impossible date is not accepted', async ({ page }) => {
    await typeDate(page, '12/31/2025');
    await expect(page.locator('#datePickerMonthYearInput')).toHaveValue('12/31/2025');
    await typeDate(page, '02/30/2023');
    await expect(page.locator('#datePickerMonthYearInput')).toHaveValue('12/31/2025');
  });

  test('UI-DT-004 typed valid date is accepted', async ({ page }) => {
    await typeDate(page, '12/31/2025');
    await expect(page.locator('#datePickerMonthYearInput')).toHaveValue('12/31/2025');
  });

  test('UI-DT-005 date-time picker offers 15-minute slots and applies the chosen time', async ({ page }) => {
    const input = page.locator('#dateAndTimePickerInput');
    await input.click();
    const slots = page.locator('.react-datepicker__time-list-item');
    await expect(slots).toHaveCount(96);
    await expect(slots.first()).toHaveText('00:00');
    await expect(slots.last()).toHaveText('23:45');
    await slots.filter({ hasText: /^14:15$/ }).click();
    await expect(input).toHaveValue(/ 2:15 PM$/);
  });
});
