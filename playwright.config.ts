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
 *   - Playwright tự khởi động Vite dev server (:5173) và tái sử dụng nếu đã chạy
 */

const BE_URL = process.env.HISTAR_BE_URL ?? 'http://localhost:8080'
const FE_URL = process.env.HISTAR_FE_URL ?? 'http://localhost:5173'

export default defineConfig({
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
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },

    // Tầng 3 — FE + BE E2E (luồng đầu-cuối thật)
    {
      name: '3-fullstack-e2e',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], baseURL: FE_URL },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: FE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
