import { defineConfig, devices } from '@playwright/test';

/* One ID per run, shared by the HTML report, evidence folder and execution CSV so older runs are never
   overwritten. Set here (main process) so workers and reporters inherit it. Override with RUN_ID=... */
process.env.RUN_ID ||= 'RUN-' + new Date().toLocaleString('sv-SE').replace(/\D/g, '').replace(/^(\d{8})/, '$1-');
const RUN_ID = process.env.RUN_ID;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* One retry locally so flaky tests are detected (reported as "flaky" in the execution CSV) */
  retries: process.env.CI ? 2 : 1,
  /* Independent tests run in parallel, capped at two workers */
  workers: 2,
  /* Failure evidence (screenshots, traces), one folder per run */
  outputDir: `./reports/evidence/${RUN_ID}`,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: `./reports/html/${RUN_ID}`, open: 'never' }],
    ['./reporters/csv-reporter.ts'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'https://demoqa.com',

    /* Keep trace and screenshot only for failed attempts. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
