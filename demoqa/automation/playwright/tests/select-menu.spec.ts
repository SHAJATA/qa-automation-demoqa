import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/widgets-observed-behavior.md (OBS-SM-*)
// The native <select> options also have role "option", so custom-dropdown options are scoped by their react-select id.
const customOptions = (page: Page) => page.locator('[id^="react-select"][id*="-option-"]');
const customOption = (page: Page, name: string) => customOptions(page).filter({ hasText: new RegExp(`^${name.replace(/[.,]/g, '\\$&')}$`) });
const multi = (page: Page) => page.locator('#selectMenuContainer .row').filter({ hasText: 'Multiselect drop down' }).locator('[class*="-container"]').first();

test.beforeEach(async ({ page }) => {
  await page.goto('/select-menu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#oldSelectMenu')).toBeVisible();
});

test.describe('Select Menu', () => {
  test('UI-SM-001 grouped select lists all options and selects one', async ({ page }) => {
    await page.locator('#withOptGroup').click();
    await expect(customOptions(page)).toHaveText(['Group 1, option 1', 'Group 1, option 2', 'Group 2, option 1', 'Group 2, option 2', 'A root option', 'Another root option']);
    await customOption(page, 'Group 2, option 1').click();
    await expect(page.locator('#withOptGroup [class*="singleValue"], #withOptGroup [class*="single-value"]')).toHaveText('Group 2, option 1');
  });

  test('UI-SM-002 Select One selects a title', async ({ page }) => {
    await page.locator('#selectOne').click();
    await expect(customOptions(page)).toHaveText(['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Other']);
    await customOption(page, 'Prof.').click();
    await expect(page.locator('#selectOne [class*="singleValue"], #selectOne [class*="single-value"]')).toHaveText('Prof.');
  });

  test('UI-SM-003 old style select defaults to Red and changes value', async ({ page }) => {
    const select = page.locator('#oldSelectMenu');
    await expect(select).toHaveValue('red');
    await select.selectOption({ label: 'Purple' });
    await expect(select).toHaveValue('4');
  });

  test('UI-SM-004 multiselect turns choices into chips and removes them from the list', async ({ page }) => {
    await multi(page).click();
    await expect(customOptions(page)).toHaveText(['Green', 'Blue', 'Black', 'Red']);
    await customOption(page, 'Green').click();
    await customOption(page, 'Black').click();
    await expect(multi(page).locator('[class*="multiValue"]')).toHaveText(['Green', 'Black']);
    await expect(customOptions(page)).toHaveText(['Blue', 'Red']);
  });

  test('UI-SM-005 removing a multiselect chip deselects only it', async ({ page }) => {
    await multi(page).click();
    await customOption(page, 'Green').click();
    await customOption(page, 'Black').click();
    await page.keyboard.press('Escape');
    await multi(page).getByRole('button', { name: 'Remove Green' }).click();
    await expect(multi(page).locator('[class*="multiValue"]')).toHaveText(['Black']);
  });

  test('UI-SM-006 standard multi select keeps several selected cars', async ({ page }) => {
    const cars = page.locator('#cars');
    await cars.selectOption(['volvo', 'audi']);
    await expect(cars).toHaveValues(['volvo', 'audi']);
  });
});
