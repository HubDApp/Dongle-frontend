import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /mobile\/.*\.spec\.ts/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /mobile\/.*\.spec\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
