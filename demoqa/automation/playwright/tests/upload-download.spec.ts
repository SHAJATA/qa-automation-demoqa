import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Observed behavior source: test-cases/elements-observed-behavior.md (OBS-UD-*)
const FIXTURE = path.join(__dirname, 'fixtures', 'sample-upload.txt');

test.beforeEach(async ({ page }) => {
  await page.goto('/upload-download', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#uploadFile')).toBeAttached();
});

test.describe('Upload and Download', () => {
  test('UI-UD-001 download saves the sample JPEG', async ({ page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#downloadButton').click()]);
    expect(download.suggestedFilename()).toBe('sampleFile.jpeg');
    const bytes = fs.readFileSync((await download.path())!);
    expect(bytes.length).toBe(4096);
    expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
  });

  test('UI-UD-002 uploading a local fixture shows its file name', async ({ page }) => {
    await page.locator('#uploadFile').setInputFiles(FIXTURE);
    await expect(page.locator('#uploadedFilePath')).toHaveText('C:\\fakepath\\sample-upload.txt');
  });

  test('UI-UD-003 no uploaded path is shown before a file is chosen', async ({ page }) => {
    await expect(page.locator('#uploadedFilePath')).toHaveCount(0);
  });

  test('UI-UD-004 clearing the selection removes the uploaded path', async ({ page }) => {
    await page.locator('#uploadFile').setInputFiles(FIXTURE);
    await expect(page.locator('#uploadedFilePath')).toBeVisible();
    await page.locator('#uploadFile').setInputFiles([]);
    await expect(page.locator('#uploadedFilePath')).toHaveCount(0);
  });

  test('UI-UD-005 a 0-byte file is accepted and named (boundary)', async ({ page }) => {
    await page.locator('#uploadFile').setInputFiles({ name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) });
    await expect(page.locator('#uploadedFilePath')).toHaveText('C:\\fakepath\\empty.txt');
  });

  test('UI-UD-006 a file name with spaces and accents is shown verbatim', async ({ page }) => {
    const name = 'name with spaces & ünïcode.txt';
    await page.locator('#uploadFile').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from('fictional') });
    await expect(page.locator('#uploadedFilePath')).toHaveText(`C:\\fakepath\\${name}`);
  });
});
