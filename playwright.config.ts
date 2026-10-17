import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm exec tsx apps/api/src/server.ts',
      url: 'http://127.0.0.1:5091/health/ready',
      env: { PORT: '5091' },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec vite apps/web --port 5175',
      url: 'http://127.0.0.1:5175',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5091' },
      reuseExistingServer: false,
    },
  ],
})
