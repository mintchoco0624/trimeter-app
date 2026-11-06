import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Chrome',
      // channel 'chrome' uses the installed Google Chrome instead of Playwright's own download.
      use: { ...devices['Pixel 7'], channel: 'chrome', permissions: ['geolocation'] },
    },
  ],
  webServer: {
    command: 'npm start -- --port 4200',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
