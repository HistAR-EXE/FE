import { defineConfig, devices } from '@playwright/test'

/**
 * HistAR (TimeLens) — E2E test config.
 *
 * Kiến trúc kiểm thử 3 tầng (theo yêu cầu spec):
 *   Tầng 1 — BE API      : tests/api/**        (hợp đồng API trên BE thật, :8080)
 *   Tầng 2 — FE UI        : tests/ui/**         (render/route/guard của FE, :5173)
 *   Tầng 3 — FE + BE E2E  : tests/e2e/**        (luồng người dùng đầu-cuối qua Vite proxy)
 *
 * Điều kiện chạy:
 *   - BE Spring Boot phải chạy sẵn ở http://localhost:8080 (mvn spring-boot:run)
 *   - AI service (:8100) tuỳ chọn — test chat sẽ skip nếu AI down
 *   - Playwright khởi động Vite riêng trên :5174 để không dùng nhầm server phát triển :5173
 */

const BE_URL = process.env.HISTAR_BE_URL ?? 'http://localhost:8080'
const FE_URL = process.env.HISTAR_FE_URL ?? 'http://127.0.0.1:5174'
const E2E_STORAGE = '/tmp/e2e-consent.json'

export default defineConfig({
  globalSetup: './tests/e2e-consent.setup.ts',
  outputDir: '/tmp/pw-test-results',
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FE_URL,
    storageState: E2E_STORAGE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  metadata: { backendUrl: BE_URL, frontendUrl: FE_URL },
  projects: [
    // Gate: kiểm tra BE sống trước khi chạy bất kỳ tầng nào
    { name: 'setup', testMatch: /global\.setup\.ts/ },

    // Tầng 1 — BE API contract (không cần trình duyệt render, dùng request fixture)
    {
      name: '1-backend-api',
      testDir: './tests/api',
      dependencies: ['setup'],
      use: { baseURL: BE_URL },
    },

    // Tầng 2 — FE UI (render, routing, guard) qua Chromium
    {
      name: '2-frontend-ui',
      testDir: './tests/ui',
      testIgnore: /(?:site-workspace|field-trip-planning|field-trip-report)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only admin gate: deterministic route fixtures, no BE dependency.
    {
      name: 'admin-ui',
      testDir: './tests/ui',
      testMatch: /admin-console\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only site workspace gate: mocked /api, no BE dependency.
    {
      name: 'site-workspace-ui',
      testDir: './tests/ui',
      testMatch: /site-workspace\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only field-trip planning: mocked /api, no BE dependency.
    {
      name: 'field-trip-ui',
      testDir: './tests/ui',
      testMatch: /field-trip-planning\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only field-trip live board and report: mocked /api, no BE dependency.
    {
      name: 'field-trip-report-ui',
      testDir: './tests/ui',
      testMatch: /field-trip-report\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only admin E2E gate: disposable route fixtures, no BE dependency.
    {
      name: 'admin-e2e',
      testDir: './tests/e2e',
      testMatch: /admin-(narrative-pilot|content-lifecycle)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only site content lifecycle: mocked /api, no setup or live BE.
    {
      name: 'site-workspace-e2e',
      testDir: './tests/e2e',
      testMatch: /site-content-lifecycle\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // FE-only field-trip journey: mocked /api, no backend health gate.
    {
      name: 'field-trip-e2e',
      testDir: './tests/e2e',
      testMatch: /field-trip-journey\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // Tầng 3 — FE + BE E2E (luồng đầu-cuối thật)
    {
      name: '3-fullstack-e2e',
      testDir: './tests/e2e',
      testIgnore: /(?:admin-(?:narrative-pilot|content-lifecycle)|site-content-lifecycle|field-trip-journey)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },
  ],
  webServer: [
    {
      command: 'node scripts/e2e-ai-mock.mjs',
      url: process.env.HISTAR_AI_URL ?? 'http://127.0.0.1:8100/ai/health',
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // Demo-only controls are deliberately build-time gated. Enable them only for the local E2E server;
      // production builds still require VITE_DEMO_ENABLED to be set explicitly.
      command: 'set VITE_DEMO_ENABLED=true&& npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: FE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
