import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui', testMatch: 'leaderboard-honors.spec.ts', workers: 1, retries: 0, timeout: 60000,
  outputDir: './test-results/leaderboard-artifacts', reporter: [['list']],
  use: { ...devices['Desktop Chrome'], channel: 'msedge', baseURL: 'http://127.0.0.1:5177', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort', url: 'http://127.0.0.1:5177', reuseExistingServer: false, timeout: 120000 },
})
