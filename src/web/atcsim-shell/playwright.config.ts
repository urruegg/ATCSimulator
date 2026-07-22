import { defineConfig, devices } from '@playwright/test';

// Hermetic web E2E: boots the Vite dev server in `e2e` mode and drives the real
// AircraftMapPage via the e2e harness entry (no MSAL gate). The spec stubs the
// Maps token and all atlas.microsoft.com traffic, so the run needs NO Azure
// credentials and is safe on fork PRs. See e2e/map.e2e.ts.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1400, height: 900 },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:5173/e2e.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
