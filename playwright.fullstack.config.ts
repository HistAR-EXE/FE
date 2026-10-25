import { defineConfig, devices } from '@playwright/test'

const BE_URL = process.env.HISTAR_BE_URL ?? 'http://127.0.0.1:8080'
const FE_URL = process.env.HISTAR_FE_URL ?? 'http://127.0.0.1:5174'
const POWERSHELL = process.platform === 'win32'
  ? 'powershell -NoProfile -ExecutionPolicy Bypass'
  : 'pwsh -NoProfile'

export default defineConfig({
  testDir: './tests/fullstack',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: FE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'backend-health',
      testMatch: /backend-health\.setup\.ts/,
      use: { baseURL: BE_URL },
    },
    {
      name: 'site-workspace-fullstack',
      testMatch: /site-workspace-fullstack\.spec\.ts/,
      dependencies: ['backend-health'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },
    {
      name: 'field-trip-fullstack',
      testMatch: /field-trip-fullstack\.spec\.ts/,
      dependencies: ['backend-health'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },
  ],
  webServer: [
    {
      command: `${POWERSHELL} -File tests/fullstack/start-backend.ps1`,
      url: `${BE_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: FE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
