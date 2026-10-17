import { defineConfig, devices } from '@playwright/test'

// Isolated UI contract tests: no production database, AI service or shared test hooks.
export default defineConfig({
  testDir: './tests/ui',
  testMatch: 'explore-integrity.spec.ts',
  outputDir: './test-results/explore-ui-artifacts',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/explore/results.json' }]],
  use: { ...devices['Desktop Chrome'], channel: 'msedge', baseURL: 'http://127.0.0.1:5176', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
