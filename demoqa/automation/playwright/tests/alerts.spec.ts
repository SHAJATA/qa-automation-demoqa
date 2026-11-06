import { test, expect, type Page, type Dialog } from '@playwright/test';

// Observed behavior source: test-cases/alerts-frames-windows-observed-behavior.md (OBS-AL-*)

/** Clicks a button and handles the next dialog with `answer`, returning the dialog for assertions. */
async function clickAndAnswer(page: Page, buttonId: string, answer: (d: Dialog) => Promise<void>) {
  const dialog = new Promise<Dialog>(resolve => page.once('dialog', async d => { resolve(d); await answer(d); }));
  await page.locator(`#${buttonId}`).click();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#alertButton')).toBeVisible();
});

test.describe('Alerts', () => {
  test('UI-AL-001 simple alert shows its message and can be accepted', async ({ page }) => {
    const d = await clickAndAnswer(page, 'alertButton', d => d.accept());
    expect(d.type()).toBe('alert');
    expect(d.message()).toBe('You clicked a button');
    // The page is responsive again once the alert is accepted.
    await clickAndAnswer(page, 'confirmButton', d => d.accept());
    await expect(page.locator('#confirmResult')).toHaveText('You selected Ok');
  });

  test('UI-AL-002 timer alert appears only after the delay', async ({ page }) => {
    const started = Date.now();
    const d = await clickAndAnswer(page, 'timerAlertButton', d => d.accept());
    const elapsed = Date.now() - started;
    expect(d.message()).toBe('This alert appeared after 5 seconds');
    expect(elapsed).toBeGreaterThanOrEqual(4_000); // observed ~5.1 s; 1 s margin for timer jitter
  });

  test('UI-AL-003 accepting the confirm reports Ok', async ({ page }) => {
    const d = await clickAndAnswer(page, 'confirmButton', d => d.accept());
    expect(d.type()).toBe('confirm');
    expect(d.message()).toBe('Do you confirm action?');
    await expect(page.locator('#confirmResult')).toHaveText('You selected Ok');
  });

  test('UI-AL-004 dismissing the confirm reports Cancel', async ({ page }) => {
    await clickAndAnswer(page, 'confirmButton', d => d.dismiss());
    await expect(page.locator('#confirmResult')).toHaveText('You selected Cancel');
  });

  test('UI-AL-005 prompt with a name echoes it', async ({ page }) => {
    const d = await clickAndAnswer(page, 'promtButton', d => d.accept('Ada Testwright'));
    expect(d.type()).toBe('prompt');
    expect(d.message()).toBe('Please enter your name');
    await expect(page.locator('#promptResult')).toHaveText('You entered Ada Testwright');
  });

  test('UI-AL-006 cancelled prompt shows no result', async ({ page }) => {
    await clickAndAnswer(page, 'promtButton', d => d.dismiss());
    // Proof the page processed the dialog: a later confirm still works, and no prompt result exists.
    await clickAndAnswer(page, 'confirmButton', d => d.accept());
    await expect(page.locator('#confirmResult')).toHaveText('You selected Ok');
    await expect(page.locator('#promptResult')).toHaveCount(0);
  });

  test('UI-AL-007 prompt accepted with an empty value shows no result (boundary)', async ({ page }) => {
    await clickAndAnswer(page, 'promtButton', d => d.accept(''));
    await clickAndAnswer(page, 'confirmButton', d => d.accept());
    await expect(page.locator('#confirmResult')).toHaveText('You selected Ok');
    await expect(page.locator('#promptResult')).toHaveCount(0);
  });

  test('UI-AL-008 prompt text containing HTML is shown literally', async ({ page }) => {
    await clickAndAnswer(page, 'promtButton', d => d.accept('<b>bold</b>'));
    await expect(page.locator('#promptResult')).toHaveText('You entered <b>bold</b>');
    await expect(page.locator('#promptResult b')).toHaveCount(0);
  });
});
