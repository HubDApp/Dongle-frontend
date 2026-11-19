import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 4 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /mobile\/.*\.spec\.ts/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /mobile\/.*\.spec\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\/.*\.spec\.ts/,
    },
    {
      name: "mobile-iphone-13",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
      testMatch: /mobile\/.*\.spec\.ts/,
    },
    {
      name: "mobile-pixel-5",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
