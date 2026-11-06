import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/forms-observed-behavior.md (OBS-PF-*)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function form(page: Page) {
  const f = page.locator('#userForm');
  const modal = page.locator('.modal-content');
  return {
    f, modal,
    first: f.getByPlaceholder('First Name'), last: f.getByPlaceholder('Last Name'),
    email: f.getByPlaceholder('name@example.com'), mobile: f.getByPlaceholder('Mobile Number'),
    dob: f.locator('#dateOfBirthInput'), subjects: f.locator('#subjectsInput'), address: f.getByPlaceholder('Current Address'),
    gender: (g: 'Male' | 'Female' | 'Other') => f.locator('label', { hasText: new RegExp(`^${g}$`) }),
    hobby: (h: 'Sports' | 'Reading' | 'Music') => f.locator('label', { hasText: new RegExp(`^${h}$`) }),
    state: f.locator('#state'), city: f.locator('#city'),
    option: (text: string) => page.getByRole('option', { name: text, exact: true }),
    submit: f.locator('#submit'),
    cell: (label: string) => modal.locator('tr').filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${label}$`) }) }).locator('td').nth(1),
  };
}

async function fillRequired(page: Page, mobile = '0123456789') {
  const p = form(page);
  await p.first.fill('Ada');
  await p.last.fill('Testwright');
  await p.gender('Female').click();
  await p.mobile.fill(mobile);
}

async function choose(page: Page, select: 'state' | 'city', value: string) {
  const p = form(page);
  await p[select].click();
  await p.option(value).click();
  await expect(p[select]).toContainText(value);
}

const isValid = (l: import('@playwright/test').Locator) => l.evaluate((e: HTMLInputElement) => e.validity.valid);

async function expectRejected(page: Page, field: import('@playwright/test').Locator) {
  const p = form(page);
  await p.submit.click();
  await expect(p.f).toHaveClass(/was-validated/);
  expect(await isValid(field)).toBe(false);
  await expect(p.modal).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/automation-practice-form', { waitUntil: 'domcontentloaded' });
  await expect(form(page).first).toBeVisible();
});

test.describe('Practice Form', () => {
  test('UI-PF-001 full submission shows every entered value in the confirmation', async ({ page }) => {
    const p = form(page);
    await fillRequired(page);
    await p.email.fill('ada.testwright@example.com');
    await p.dob.click();
    await page.locator('.react-datepicker__month-select').selectOption('4');
    await page.locator('.react-datepicker__year-select').selectOption('1990');
    await page.locator('.react-datepicker__day--015:not(.react-datepicker__day--outside-month)').click();
    await p.subjects.pressSequentially('Ma');
    await p.option('Maths').click();
    await p.hobby('Reading').click();
    // Small in-memory PNG header: a controlled fixture, never a personal file.
    await p.f.locator('#uploadPicture').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
    await p.address.fill('1 Fictional Way');
    await choose(page, 'state', 'Haryana');
    await choose(page, 'city', 'Karnal');
    await p.submit.click();

    await expect(page.locator('#example-modal-sizes-title-lg')).toHaveText('Thanks for submitting the form');
    const expected: Record<string, string> = {
      'Student Name': 'Ada Testwright', 'Student Email': 'ada.testwright@example.com', Gender: 'Female', Mobile: '0123456789',
      'Date of Birth': '15 May,1990', Subjects: 'Maths', Hobbies: 'Reading', Picture: 'avatar.png', Address: '1 Fictional Way', 'State and City': 'Haryana Karnal',
    };
    for (const [label, value] of Object.entries(expected)) await expect(p.cell(label), label).toHaveText(value);
  });

  test('UI-PF-002 submitting only the HTML-required fields succeeds', async ({ page }) => {
    const p = form(page);
    await p.first.fill('Grace'); await p.last.fill('Fixture'); await p.gender('Male').click(); await p.mobile.fill('0123456789');
    await p.submit.click();
    await expect(p.cell('Student Name')).toHaveText('Grace Fixture');
    await expect(p.cell('Gender')).toHaveText('Male');
    await expect(p.cell('Mobile')).toHaveText('0123456789');
    for (const label of ['Student Email', 'Subjects', 'Hobbies', 'Picture', 'Address']) await expect(p.cell(label), label).toHaveText('');
  });

  test('UI-PF-003 empty submit opens no confirmation and flags required fields', async ({ page }) => {
    const p = form(page);
    await p.submit.click();
    await expect(p.f).toHaveClass(/was-validated/);
    await expect(p.modal).toHaveCount(0);
    for (const field of [p.first, p.last, p.mobile, p.f.locator('#gender-radio-1')]) expect(await isValid(field)).toBe(false);
    expect(await isValid(p.email)).toBe(true);
  });

  test('UI-PF-004 9-digit mobile is rejected (boundary)', async ({ page }) => {
    await fillRequired(page, '012345678');
    await expectRejected(page, form(page).mobile);
  });

  test('UI-PF-005 mobile keeps at most 10 digits (boundary)', async ({ page }) => {
    await form(page).mobile.pressSequentially('01234567890');
    await expect(form(page).mobile).toHaveValue('0123456789');
  });

  test('UI-PF-006 non-digit mobile is rejected', async ({ page }) => {
    await fillRequired(page, '012345678a');
    await expectRejected(page, form(page).mobile);
  });

  test('UI-PF-007 invalid optional email blocks submission', async ({ page }) => {
    await fillRequired(page);
    await form(page).email.fill('not-an-email');
    await expectRejected(page, form(page).email);
  });

  test('UI-PF-008 date of birth defaults to today', async ({ page }) => {
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    await expect(form(page).dob).toHaveValue(today);
  });

  test('UI-PF-009 date picker selection is reflected in field and confirmation', async ({ page }) => {
    const p = form(page);
    await fillRequired(page);
    await p.dob.click();
    await page.locator('.react-datepicker__month-select').selectOption('4');
    await page.locator('.react-datepicker__year-select').selectOption('1990');
    await page.locator('.react-datepicker__day--015:not(.react-datepicker__day--outside-month)').click();
    await expect(p.dob).toHaveValue('15 May 1990');
    await p.submit.click();
    await expect(p.cell('Date of Birth')).toHaveText('15 May,1990');
  });

  test('UI-PF-010 city is disabled until a state is chosen, then lists that state\'s cities', async ({ page }) => {
    const p = form(page);
    await expect(p.city.locator('input')).toBeDisabled();
    await choose(page, 'state', 'Haryana');
    await expect(p.city.locator('input')).toBeEnabled();
    await p.city.click();
    await expect(page.getByRole('option')).toHaveText(['Karnal', 'Panipat']);
  });

  test('UI-PF-011 changing state does not submit a city from the previous state', async ({ page }) => {
    // Expected to fail today: suspected product defect OBS-PF-08 (see test-cases/failure-triage.csv).
    const p = form(page);
    await fillRequired(page);
    await choose(page, 'state', 'Haryana');
    await choose(page, 'city', 'Karnal');
    await choose(page, 'state', 'Rajasthan');
    await p.submit.click();
    await expect(p.cell('State and City')).toHaveText(/^Rajasthan( Jaipur| Jaiselmer)?$/);
  });

  test('UI-PF-012 subject autocomplete adds the chosen subject', async ({ page }) => {
    const p = form(page);
    await fillRequired(page);
    await p.subjects.pressSequentially('Ma');
    await p.option('Maths').click();
    await expect(p.f.locator('[class*="multi-value__label"]')).toHaveText(['Maths']);
    await p.submit.click();
    await expect(p.cell('Subjects')).toHaveText('Maths');
  });

  test('UI-PF-013 hobbies are optional and multiple can be chosen', async ({ page }) => {
    const p = form(page);
    await fillRequired(page);
    await p.hobby('Sports').click();
    await p.hobby('Music').click();
    await p.submit.click();
    await expect(p.cell('Hobbies')).toHaveText('Sports, Music');
  });

  test('UI-PF-014 close button closes the confirmation modal', async ({ page }) => {
    // Expected to fail today: suspected product defect OBS-PF-10 (see test-cases/failure-triage.csv).
    const p = form(page);
    await fillRequired(page);
    await p.submit.click();
    await expect(p.modal).toBeVisible();
    await page.locator('#closeLargeModal').click();
    await expect(p.modal).toBeHidden();
  });

  test('UI-PF-015 Escape closes the confirmation modal and keeps the values', async ({ page }) => {
    const p = form(page);
    await fillRequired(page);
    await p.submit.click();
    await expect(p.modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(p.modal).toBeHidden();
    await expect(p.first).toHaveValue('Ada');
  });
});
