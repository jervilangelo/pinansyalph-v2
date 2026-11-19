import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests run against the production build (vite preview).
 * Locally, set PW_CHANNEL=chrome to use an installed Chrome instead of
 * downloading Playwright's Chromium.
 */
const PORT = 4174
const channel = process.env.PW_CHANNEL

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // Most specs assert English copy. Filipino is the site default; e2e/settings.spec.ts tests it from a clean state.
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: 'pinansyalph-language', value: 'en' }] }] },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
