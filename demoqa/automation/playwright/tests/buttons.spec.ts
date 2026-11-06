import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-BT-*)

function buttons(page: Page) {
  return {
    double: page.getByRole('button', { name: 'Double Click Me', exact: true }),
    right: page.getByRole('button', { name: 'Right Click Me', exact: true }),
    // Its id is random on every load (OBS-BT-01), so locate it by its exact accessible name.
    dynamic: page.getByRole('button', { name: 'Click Me', exact: true }),
    doubleMsg: page.locator('#doubleClickMessage'),
    rightMsg: page.locator('#rightClickMessage'),
    dynamicMsg: page.locator('#dynamicClickMessage'),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/buttons', { waitUntil: 'domcontentloaded' });
  await expect(buttons(page).dynamic).toBeVisible();
});

test.describe('Buttons', () => {
  test('UI-BT-001 double click shows only the double-click message', async ({ page }) => {
    const b = buttons(page);
    await b.double.dblclick();
    await expect(b.doubleMsg).toHaveText('You have done a double click');
    await expect(b.rightMsg).toHaveCount(0);
    await expect(b.dynamicMsg).toHaveCount(0);
  });

  test('UI-BT-002 single click on Double Click Me shows no message', async ({ page }) => {
    const b = buttons(page);
    await b.double.click();
    // Proof the page reacted to input at all: a following valid action still works, while the double-click message stays absent.
    await b.dynamic.click();
    await expect(b.dynamicMsg).toBeVisible();
    await expect(b.doubleMsg).toHaveCount(0);
  });

  test('UI-BT-003 right click shows only the right-click message', async ({ page }) => {
    const b = buttons(page);
    await b.right.click({ button: 'right' });
    await expect(b.rightMsg).toHaveText('You have done a right click');
    await expect(b.doubleMsg).toHaveCount(0);
    await expect(b.dynamicMsg).toHaveCount(0);
  });

  test('UI-BT-004 left click on Right Click Me shows no message', async ({ page }) => {
    const b = buttons(page);
    await b.right.click();
    await b.dynamic.click();
    await expect(b.dynamicMsg).toBeVisible();
    await expect(b.rightMsg).toHaveCount(0);
  });

  test('UI-BT-005 Click Me (random id) shows the dynamic click message', async ({ page }) => {
    const b = buttons(page);
    await b.dynamic.click();
    await expect(b.dynamicMsg).toHaveText('You have done a dynamic click');
    await expect(b.doubleMsg).toHaveCount(0);
    await expect(b.rightMsg).toHaveCount(0);
  });

  test('UI-BT-006 right click on Click Me shows no dynamic message', async ({ page }) => {
    const b = buttons(page);
    await b.dynamic.click({ button: 'right' });
    await b.right.click({ button: 'right' });
    await expect(b.rightMsg).toBeVisible();
    await expect(b.dynamicMsg).toHaveCount(0);
  });

  test('UI-BT-007 all three actions keep their own independent messages', async ({ page }) => {
    const b = buttons(page);
    await b.double.dblclick();
    await b.right.click({ button: 'right' });
    await b.dynamic.click();
    await expect(b.doubleMsg).toHaveText('You have done a double click');
    await expect(b.rightMsg).toHaveText('You have done a right click');
    await expect(b.dynamicMsg).toHaveText('You have done a dynamic click');
  });
});
