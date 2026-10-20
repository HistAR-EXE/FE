import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  testMatch: "ar-experience.spec.ts",
  outputDir: "./test-results/ar",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60000,
  expect: { timeout: 20000 },
  use: {
    ...devices["Desktop Chrome"],
    channel: "msedge",
    baseURL: "http://127.0.0.1:5182",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5182 --strictPort",
    url: "http://127.0.0.1:5182",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
