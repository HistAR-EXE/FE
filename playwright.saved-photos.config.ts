import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/ui', testMatch: 'profile-creations-delete.spec.ts',
  outputDir: './test-results/saved-photos', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', channel: 'msedge', headless: true },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: true },
})
