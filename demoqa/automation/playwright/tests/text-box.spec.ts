import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/text-box-observed-behavior.md
// Each test gets Playwright's default fresh browser context, so no state is shared between tests.

function textBox(page: Page) {
  const form = page.locator('#userForm');
  // Output <p> elements reuse the textarea IDs, so inputs are scoped to the form fields and results to #output.
  const output = page.locator('#output');
  return {
    name: form.getByPlaceholder('Full Name'),
    email: form.getByPlaceholder('name@example.com'),
    current: form.locator('textarea#currentAddress'),
    permanent: form.locator('textarea#permanentAddress'), // no placeholder or linked label
    submit: form.getByRole('button', { name: 'Submit' }),
    output,
    outName: output.locator('p#name'),
    outEmail: output.locator('p#email'),
    outCurrent: output.locator('p#currentAddress'),
    outPermanent: output.locator('p#permanentAddress'),
  };
}

test.beforeEach(async ({ page }) => {
  // ponytail: the site's ads delay the 'load' event; the form is ready at DOMContentLoaded
  await page.goto('/text-box', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userForm')).toBeVisible();
});

test.describe('DemoQA Text Box', () => {
  test('UI-TB-001 valid submission shows all entered values', async ({ page }) => {
    const tb = textBox(page);
    await tb.name.fill('Jane Doe');
    await tb.email.fill('jane.doe@example.com');
    await tb.current.fill('1 Main St\nApt 2');
    await tb.permanent.fill('99 Side Rd');
    await tb.submit.click();

    await expect(tb.outName).toHaveText('Name:Jane Doe');
    await expect(tb.outEmail).toHaveText('Email:jane.doe@example.com');
    // OBS-TB-11: toContainText collapses whitespace, so read the raw text to prove the newline itself survives.
    await expect.poll(() => tb.outCurrent.textContent()).toContain('1 Main St\nApt 2');
    await expect(tb.outPermanent).toContainText('99 Side Rd');
    await expect(tb.email).not.toHaveClass(/field-error/);
  });

  test('UI-TB-002 email without @ is flagged and not submitted', async ({ page }) => {
    const tb = textBox(page);
    await tb.name.fill('Jane Doe');
    await tb.email.fill('not-an-email');
    await tb.submit.click();

    await expect(tb.email).toHaveClass(/field-error/);
    await expect(tb.outName).toHaveCount(0);
    await expect(tb.outEmail).toHaveCount(0);
  });

  test('UI-TB-003 empty form submit shows no output and no error', async ({ page }) => {
    const tb = textBox(page);
    await tb.submit.click();

    await expect(tb.output.locator('p')).toHaveCount(0);
    await expect(tb.email).not.toHaveClass(/field-error/);
  });

  test('UI-TB-004 name-only submission shows only the name line', async ({ page }) => {
    const tb = textBox(page);
    await tb.name.fill('Only Name');
    await tb.submit.click();

    await expect(tb.outName).toHaveText('Name:Only Name');
    await expect(tb.output.locator('p')).toHaveCount(1);
  });

  test('UI-TB-005 email with 1-character TLD is rejected (boundary)', async ({ page }) => {
    const tb = textBox(page);
    await tb.email.fill('a@b.c');
    await tb.submit.click();

    await expect(tb.email).toHaveClass(/field-error/);
    await expect(tb.outEmail).toHaveCount(0);
  });

  test('UI-TB-006 email with 2-character TLD is accepted (boundary)', async ({ page }) => {
    const tb = textBox(page);
    await tb.email.fill('a@b.co');
    await tb.submit.click();

    await expect(tb.outEmail).toHaveText('Email:a@b.co');
    await expect(tb.email).not.toHaveClass(/field-error/);
  });

  for (const [id, label, value] of [
    ['UI-TB-007', 'missing local part', '@example.com'],
    ['UI-TB-008', 'space in local part', 'jane doe@example.com'],
    ['UI-TB-009', 'empty domain label', 'jane@.com'],
  ] as const) {
    test(`${id} email with ${label} is rejected`, async ({ page }) => {
      const tb = textBox(page);
      await tb.email.fill(value);
      await tb.submit.click();

      await expect(tb.email).toHaveClass(/field-error/);
      await expect(tb.outEmail).toHaveCount(0);
    });
  }

  test('UI-TB-010 correcting an invalid email clears the error on resubmit', async ({ page }) => {
    const tb = textBox(page);
    await tb.email.fill('bad');
    await tb.submit.click();
    await expect(tb.email).toHaveClass(/field-error/);

    await tb.email.fill('good@example.com');
    await tb.submit.click();

    await expect(tb.email).not.toHaveClass(/field-error/);
    await expect(tb.outEmail).toHaveText('Email:good@example.com');
  });

  test('UI-TB-011 invalid email after a valid submit is not shown in output', async ({ page }) => {
    const tb = textBox(page);
    await tb.email.fill('first@example.com');
    await tb.submit.click();
    await expect(tb.outEmail).toHaveText('Email:first@example.com');

    await tb.email.fill('not-an-email');
    await tb.submit.click();

    await expect(tb.email).toHaveClass(/field-error/);
    // Only asserts the invalid value is never published. Stale output (OBS-TB-09) is an open question, not asserted.
    await expect(tb.output).not.toContainText('not-an-email');
  });

  test('UI-TB-012 HTML-like name is displayed as literal text', async ({ page }) => {
    const tb = textBox(page);
    await tb.name.fill('<b>bold</b>');
    await tb.submit.click();

    await expect(tb.outName).toHaveText('Name:<b>bold</b>');
    await expect(tb.outName.locator('b')).toHaveCount(0);
  });
});
