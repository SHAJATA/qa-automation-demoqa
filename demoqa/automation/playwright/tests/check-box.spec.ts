import { test, expect, type Page } from '@playwright/test';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-CB-*)

const ALL_KEYS = ['home', 'desktop', 'documents', 'downloads', 'notes', 'commands', 'workspace', 'office', 'wordFile',
  'excelFile', 'react', 'angular', 'veu', 'public', 'private', 'classified', 'general'];

function tree(page: Page) {
  const node = (name: string) => page.getByRole('treeitem').filter({ has: page.locator('.rc-tree-title').getByText(name, { exact: true }) });
  return {
    node,
    box: (name: string) => page.getByRole('checkbox', { name: `Select ${name}`, exact: true }),
    toggle: (name: string) => node(name).locator('.rc-tree-switcher'),
    title: (name: string) => node(name).locator('.rc-tree-title'),
    result: page.locator('#result'),
    resultKeys: page.locator('#result .text-success'),
  };
}

async function expand(page: Page, ...names: string[]) {
  const t = tree(page);
  for (const n of names) {
    await t.toggle(n).click();
    await expect(t.node(n)).toHaveAttribute('aria-expanded', 'true');
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/checkbox', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tree')).toBeVisible();
});

test.describe('Check Box', () => {
  test('UI-CB-001 initial tree shows only collapsed, unchecked Home', async ({ page }) => {
    const t = tree(page);
    await expect(page.getByRole('treeitem')).toHaveCount(1);
    await expect(t.node('Home')).toHaveAttribute('aria-expanded', 'false');
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'false');
    await expect(t.result).toHaveCount(0);
  });

  test('UI-CB-002 expanding Home reveals Desktop, Documents, Downloads', async ({ page }) => {
    await expand(page, 'Home');
    await expect(page.getByRole('treeitem').locator('.rc-tree-title')).toHaveText(['Home', 'Desktop', 'Documents', 'Downloads']);
    for (const n of ['Desktop', 'Documents', 'Downloads']) await expect(tree(page).box(n)).toHaveAttribute('aria-checked', 'false');
  });

  test('UI-CB-003 checking a parent checks all descendants', async ({ page }) => {
    const t = tree(page);
    await expand(page, 'Home', 'Desktop');
    await t.box('Desktop').click();
    for (const n of ['Desktop', 'Notes', 'Commands']) await expect(t.box(n)).toHaveAttribute('aria-checked', 'true');
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'mixed');
    await expect(t.resultKeys).toHaveText(['desktop', 'notes', 'commands']);
  });

  test('UI-CB-004 checking one leaf marks ancestors as mixed', async ({ page }) => {
    const t = tree(page);
    await expand(page, 'Home', 'Desktop');
    await t.box('Notes').click();
    await expect(t.box('Notes')).toHaveAttribute('aria-checked', 'true');
    await expect(t.box('Commands')).toHaveAttribute('aria-checked', 'false');
    await expect(t.box('Desktop')).toHaveAttribute('aria-checked', 'mixed');
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'mixed');
    await expect(t.resultKeys).toHaveText(['notes']);
  });

  test('UI-CB-005 checking every child promotes the parent to checked', async ({ page }) => {
    const t = tree(page);
    await expand(page, 'Home', 'Desktop');
    await t.box('Notes').click();
    await t.box('Commands').click();
    await expect(t.box('Desktop')).toHaveAttribute('aria-checked', 'true');
    await expect(t.resultKeys).toHaveText(['notes', 'commands', 'desktop']);
  });

  test('UI-CB-006 checking Home selects the full tree (all 17 nodes)', async ({ page }) => {
    const t = tree(page);
    await t.box('Home').click();
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'true');
    await expect(t.resultKeys).toHaveText(ALL_KEYS);
  });

  test('UI-CB-007 unchecking the last selection removes the result', async ({ page }) => {
    const t = tree(page);
    await expand(page, 'Home');
    await t.box('Desktop').click();
    await expect(t.result).toBeVisible();
    await t.box('Desktop').click();
    await expect(t.box('Desktop')).toHaveAttribute('aria-checked', 'false');
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'false');
    await expect(t.result).toHaveCount(0);
  });

  test('UI-CB-008 collapsing a node keeps its selection', async ({ page }) => {
    const t = tree(page);
    await expand(page, 'Home', 'Desktop');
    await t.box('Desktop').click();
    await t.toggle('Desktop').click();
    await expect(t.node('Desktop')).toHaveAttribute('aria-expanded', 'false');
    await expect(t.node('Notes')).toHaveCount(0);
    await expect(t.box('Desktop')).toHaveAttribute('aria-checked', 'true');
    await expect(t.resultKeys).toHaveText(['desktop', 'notes', 'commands']);
  });

  test('UI-CB-009 clicking a node title does not toggle its checkbox', async ({ page }) => {
    const t = tree(page);
    await t.title('Home').click();
    await expect(t.box('Home')).toHaveAttribute('aria-checked', 'false');
    await expect(t.result).toHaveCount(0);
  });
});
