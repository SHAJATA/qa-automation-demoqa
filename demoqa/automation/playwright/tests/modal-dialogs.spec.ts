import { test, expect } from '@playwright/test';

// Observed behavior source: test-cases/alerts-frames-windows-observed-behavior.md (OBS-MD-*)

test.beforeEach(async ({ page }) => {
  await page.goto('/modal-dialogs', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#showSmallModal')).toBeVisible();
});

test.describe('Modal Dialogs', () => {
  test('UI-MD-001 small modal opens with its content and Close closes it', async ({ page }) => {
    await page.locator('#showSmallModal').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.modal-title')).toHaveText('Small Modal');
    await expect(dialog.locator('.modal-body')).toHaveText('This is a small modal. It has very less content');
    await page.locator('#closeSmallModal').click();
    await expect(dialog).toBeHidden();
  });

  test('UI-MD-002 large modal opens with long content and Close closes it', async ({ page }) => {
    await page.locator('#showLargeModal').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.modal-title')).toHaveText('Large Modal');
    await expect(dialog.locator('.modal-body')).toContainText('Lorem Ipsum is simply dummy text');
    await page.locator('#closeLargeModal').click();
    await expect(dialog).toBeHidden();
  });

  test('UI-MD-003 header close button closes the modal', async ({ page }) => {
    await page.locator('#showSmallModal').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('.modal-header button').click();
    await expect(dialog).toBeHidden();
  });

  test('UI-MD-004 Escape closes the modal', async ({ page }) => {
    await page.locator('#showSmallModal').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
