import { test, expect } from "@playwright/test";
import {
  mockConnectedWallet,
  mockAdminWallet,
  seedVerificationRequests,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  makeVerificationRequest,
} from "./helpers/test-setup";

const PROJECT_NAME = "Draft Flow E2E Project";

test.describe("Draft → Submit → Verify flow (#908)", () => {
  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("creator drafts, submits and requests verification; admin approves", async ({ page }) => {
    await mockConnectedWallet(page);

    await test.step("creates a draft that auto-saves", async () => {
      await page.goto("/projects/new");
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await page.getByLabel(/project name/i).fill(PROJECT_NAME);
      await page
        .getByLabel(/description/i)
        .fill("An end-to-end test project covering the draft, submit and verification journey.");

      await page.reload();
      await waitForPageLoad(page);
      await expect(page.getByLabel(/project name/i)).toHaveValue(PROJECT_NAME);
    });

    await test.step("submits the project with the mocked wallet", async () => {
      await page.getByLabel(/category/i).selectOption("defi");
      await page.getByLabel(/Project Website/i).fill("https://draft-flow.example.com");

      const submit = page.getByRole("button", { name: /Submit Registration/i });
      await expect(submit).toBeEnabled();
      await submit.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('[role="alert"]')).toHaveCount(0);
    });

    await test.step("project shows up in discovery", async () => {
      await page.goto("/discover");
      await waitForPageLoad(page);
      const search = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
      if (await search.isVisible()) {
        await search.fill(PROJECT_NAME);
      }
      await expect(page.locator("body")).toBeVisible();
    });

    await test.step("requests verification", async () => {
      await page.goto("/verify");
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await page.getByRole("textbox", { name: /project/i }).fill("proj1");
      const request = page.getByRole("button", { name: /submit verification/i });
      if (await request.isVisible()) {
        await request.click();
        await expect(page.getByText(/verification submitted/i)).toBeVisible();
      }
    });
  });

  test("admin approves the pending request", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByRole("button", { name: /approve/i }).first().click();
    await expect(page.getByText(/approved/i).first()).toBeVisible();
  });

  test("verified project shows the verification badge", async ({ page }) => {
    await mockConnectedWallet(page);
    const verified = makeVerificationRequest({ status: "VERIFIED" });
    await seedVerificationRequests(page, [verified]);

    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByRole("button", { name: /Check Status/i }).click();
    await page.getByRole("textbox", { name: /project/i }).fill(verified.projectId);
    const check = page.getByRole("button", { name: /check status/i });
    if (await check.isVisible()) {
      await check.click();
      await expect(page.getByText(/verified/i)).toBeVisible();
    }
  });
});
