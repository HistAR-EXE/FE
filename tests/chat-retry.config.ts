import { defineConfig, devices } from '@playwright/test'

// FE-only regression suite: all API boundaries are stubbed; no BE/AI process is needed.
export default defineConfig({
  testDir: './ui',
  testMatch: /chat-(stream-contract|failure-retry)\.spec\.ts/,
  workers: 1,
  timeout: 20_000,
  expect: { timeout: 3_000 },
  reporter: 'list',
  outputDir: '../test-results/chat-retry',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5186' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5186 --strictPort',
    cwd: '..',
    env: { VITE_API_URL: '', VITE_AI_URL: '' },
    url: 'http://127.0.0.1:5186',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
