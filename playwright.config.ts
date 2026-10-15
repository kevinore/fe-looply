import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (plan §11.3) against a local backend with a test database.
 *
 *   API_TARGET=http://localhost:8001 E2E_PORT=5174 npm run e2e
 *
 * The backend's PUBLIC_APP_URL must be http://localhost:<E2E_PORT> so sale QR
 * URLs point at this server, and ALLOWED_ORIGINS must include it.
 */
const PORT = Number(process.env.E2E_PORT ?? 5174);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // flows share one workday on the test database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 15'] } },
    // Tablet layout (wider screens, scaled UI). Chromium with the iPad's screen;
    // WebKit needs system libraries that aren't always installed.
    { name: 'iPad', use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    env: { API_TARGET: process.env.API_TARGET ?? 'http://localhost:8001' },
  },
});
