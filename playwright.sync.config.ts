import { defineConfig } from '@playwright/test'
import editor from './playwright.photo-editor.config'
export default defineConfig({
  ...editor,
  testMatch: /photo-frame-editor\.spec\.ts|b2g-inquiry\.spec\.ts/,
  outputDir: './test-results/team-sync',
})
