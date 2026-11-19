import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

// Visual regression (per browser) and memory-leak specs. Kept out of the
// main e2e run because screenshot baselines and heap measurements need a
// dedicated workflow.
export default defineConfig({
  testDir: "./e2e-quality",
  fullyParallel: false,
  forbidOnly: CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-quality-report" }]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    { name: "visual-chromium", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "visual-firefox", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Firefox"] } },
    { name: "visual-webkit", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Safari"] } },
    { name: "memory", testMatch: /memory\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
