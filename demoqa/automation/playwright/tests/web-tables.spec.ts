import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-WT-*)
// Each test starts from the 3 seeded rows (the table resets per page load, OBS-WT-12), so tests never share data.

type Person = { first: string; last: string; email: string; age: string; salary: string; dept: string };
const person = (first: string, extra: Partial<Person> = {}): Person =>
  ({ first, last: 'Testwright', email: `${first.toLowerCase()}.testwright@example.com`, age: '30', salary: '5000', dept: 'QA', ...extra });

function table(page: Page) {
  const modal = page.locator('.modal-content');
  const form = modal.locator('#userForm');
  return {
    modal, form,
    rows: page.locator('table tbody tr'),
    firstNames: page.locator('table tbody tr td:first-child'),
    row: (first: string) => page.locator('table tbody tr').filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${first}$`) }) }),
    pager: page.getByText(/^Page \d+ of \d+$/),
    field: {
      first: form.locator('#firstName'), last: form.locator('#lastName'), email: form.locator('#userEmail'),
      age: form.locator('#age'), salary: form.locator('#salary'), dept: form.locator('#department'),
    },
    submit: form.locator('#submit'),
  };
}

async function fillForm(page: Page, p: Person) {
  const f = table(page).field;
  await f.first.fill(p.first); await f.last.fill(p.last); await f.email.fill(p.email);
  await f.age.fill(p.age); await f.salary.fill(p.salary); await f.dept.fill(p.dept);
}

async function addRecord(page: Page, p: Person) {
  const t = table(page);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(t.modal).toBeVisible();
  await fillForm(page, p);
  await t.submit.click();
  await expect(t.modal).toBeHidden();
}

const isValid = (l: import('@playwright/test').Locator) => l.evaluate((e: HTMLInputElement) => e.validity.valid);

test.beforeEach(async ({ page }) => {
  await page.goto('/webtables', { waitUntil: 'domcontentloaded' });
  await expect(table(page).rows).toHaveCount(3);
});

test.describe('Web Tables', () => {
  test('UI-WT-001 seeded table shows 3 records and 7 columns', async ({ page }) => {
    const t = table(page);
    await expect(page.getByRole('columnheader')).toHaveText(['First Name', 'Last Name', 'Age', 'Email', 'Salary', 'Department', 'Action']);
    await expect(t.firstNames).toHaveText(['Cierra', 'Alden', 'Kierra']);
    await expect(t.pager).toHaveText('Page 1 of 1');
  });

  test('UI-WT-002 adding a valid record appends it and closes the modal', async ({ page }) => {
    const t = table(page);
    const ada = person('Ada');
    await addRecord(page, ada);
    await expect(t.rows).toHaveCount(4);
    await expect(t.row('Ada').locator('td')).toHaveText([ada.first, ada.last, ada.age, ada.email, ada.salary, ada.dept, '']);
  });

  test('UI-WT-003 empty submit keeps the modal open and adds no row', async ({ page }) => {
    const t = table(page);
    await page.getByRole('button', { name: 'Add' }).click();
    await t.submit.click();
    await expect(t.form).toHaveClass(/was-validated/);
    await expect(t.modal).toBeVisible();
    for (const f of Object.values(t.field)) expect(await isValid(f)).toBe(false);
    await page.keyboard.press('Escape');
    await expect(t.rows).toHaveCount(3);
  });

  for (const [id, label, email, accepted] of [
    ['UI-WT-004', '1-letter TLD is rejected', 'edge1@example.c', false],
    ['UI-WT-005', '2-letter TLD is accepted', 'edge2@example.co', true],
    ['UI-WT-006', '5-letter TLD is accepted', 'edge5@example.abcde', true],
    ['UI-WT-007', '6-letter TLD is rejected', 'edge6@example.abcdef', false],
  ] as const) {
    test(`${id} email with ${label} (boundary)`, async ({ page }) => {
      const t = table(page);
      await page.getByRole('button', { name: 'Add' }).click();
      await fillForm(page, person('Edge', { email }));
      await t.submit.click();
      if (accepted) {
        await expect(t.modal).toBeHidden();
        await expect(t.row('Edge').locator('td').nth(3)).toHaveText(email);
      } else {
        await expect(t.form).toHaveClass(/was-validated/);
        expect(await isValid(t.field.email)).toBe(false);
        await expect(t.modal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(t.rows).toHaveCount(3);
      }
    });
  }

  test('UI-WT-008 age keeps at most 2 digits (boundary)', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await table(page).field.age.pressSequentially('100');
    await expect(table(page).field.age).toHaveValue('10');
  });

  test('UI-WT-009 non-numeric age is rejected', async ({ page }) => {
    const t = table(page);
    await page.getByRole('button', { name: 'Add' }).click();
    await fillForm(page, person('Agecheck', { age: 'ab' }));
    await t.submit.click();
    expect(await isValid(t.field.age)).toBe(false);
    await expect(t.modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(t.rows).toHaveCount(3);
  });

  test('UI-WT-010 first name keeps at most 25 characters (boundary)', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await table(page).field.first.pressSequentially('A'.repeat(26));
    await expect(table(page).field.first).toHaveValue('A'.repeat(25));
  });

  test('UI-WT-011 salary keeps at most 10 digits (boundary)', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await table(page).field.salary.pressSequentially('12345678901');
    await expect(table(page).field.salary).toHaveValue('1234567890');
  });

  test('UI-WT-012 editing a record updates only that row', async ({ page }) => {
    const t = table(page);
    await t.row('Kierra').getByTitle('Edit').click();
    await expect(t.modal).toBeVisible();
    await expect(t.field.first).toHaveValue('Kierra');
    await expect(t.field.salary).toHaveValue('2000');
    await t.field.salary.fill('2500');
    await t.submit.click();
    await expect(t.modal).toBeHidden();
    await expect(t.row('Kierra').locator('td').nth(4)).toHaveText('2500');
    await expect(t.row('Cierra').locator('td').nth(4)).toHaveText('10000');
    await expect(t.row('Alden').locator('td').nth(4)).toHaveText('12000');
  });

  test('UI-WT-013 deleting a seeded row keeps all other rows', async ({ page }) => {
    // Expected to fail today: suspected product defect OBS-WT-08 (see test-cases/failure-triage.csv). Assertion intentionally not weakened.
    const t = table(page);
    await addRecord(page, person('Ada'));
    await t.row('Alden').getByTitle('Delete').click();
    await expect(t.row('Alden')).toHaveCount(0);
    await expect(t.firstNames).toHaveText(['Cierra', 'Kierra', 'Ada']);
  });

  test('UI-WT-014 deleting an added record removes only that record', async ({ page }) => {
    const t = table(page);
    await addRecord(page, person('Ada'));
    await t.row('Ada').getByTitle('Delete').click();
    await expect(t.firstNames).toHaveText(['Cierra', 'Alden', 'Kierra']);
  });

  test('UI-WT-015 search is case-insensitive across columns', async ({ page }) => {
    await page.locator('#searchBox').fill('LEGAL');
    await expect(table(page).firstNames).toHaveText(['Kierra']);
  });

  test('UI-WT-016 search with no match shows no rows', async ({ page }) => {
    await page.locator('#searchBox').fill('no-such-value-zz');
    await expect(table(page).rows).toHaveCount(0);
  });

  test('UI-WT-017 eleventh record moves to page 2 (pagination boundary)', async ({ page }) => {
    const t = table(page);
    for (let i = 1; i <= 8; i++) await addRecord(page, person(`Pager${i}`));
    await expect(t.pager).toHaveText('Page 1 of 2');
    await expect(t.rows).toHaveCount(10);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(t.pager).toHaveText('Page 2 of 2');
    await expect(t.firstNames).toHaveText(['Pager8']);
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(t.pager).toHaveText('Page 1 of 2');
    await expect(t.rows).toHaveCount(10);
  });

  test('UI-WT-018 page size 20 shows all 11 records on one page', async ({ page }) => {
    const t = table(page);
    for (let i = 1; i <= 8; i++) await addRecord(page, person(`Size${i}`));
    await page.locator('select').filter({ has: page.locator('option[value="20"]') }).selectOption('20');
    await expect(t.rows).toHaveCount(11);
    await expect(t.pager).toHaveText('Page 1 of 1');
  });

  test('UI-WT-019 Escape cancels the add modal without adding a row', async ({ page }) => {
    const t = table(page);
    await page.getByRole('button', { name: 'Add' }).click();
    await t.field.first.fill('Cancelled');
    await page.keyboard.press('Escape');
    await expect(t.modal).toBeHidden();
    await expect(t.firstNames).toHaveText(['Cierra', 'Alden', 'Kierra']);
  });

  test('UI-WT-020 added data does not persist after reload', async ({ page }) => {
    const t = table(page);
    await addRecord(page, person('Ada'));
    await expect(t.rows).toHaveCount(4);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(t.firstNames).toHaveText(['Cierra', 'Alden', 'Kierra']);
  });
});
