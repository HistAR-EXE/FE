import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: /heritage-studio-(?:privacy|mobile)\.spec\.ts|heritage-studio\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  outputDir: './test-results/photo-flow',
  use: { baseURL: process.env.HISTAR_FE_URL || 'http://localhost:5173', channel: 'msedge', headless: true, storageState: {cookies: [], origins: [{origin: 'http://localhost:5173',localStorage: [{name: 'histar_consent_v1',value: JSON.stringify({analytics:false,camera:false,gps:false,decidedAt:'2026-10-28T00:00:00Z'})}]}]} },
})
