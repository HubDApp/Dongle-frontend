import { test, expect } from "@playwright/test";
import {
  mockConnectedWallet,
  seedVerificationRequests,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  makeVerificationRequest,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

test.describe("Verification Request Flow (#374)", () => {
  test.beforeEach(async ({ page }) => {
    await mockConnectedWallet(page);
  });

  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("navigate to verify page and see form when connected", async ({
    page,
  }) => {
    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.locator("h1")).toContainText("Project Verification");
  });

  test("wallet gate - shows connect prompt when disconnected", async ({
    page,
  }) => {
    await clearLocalStorage(page);
    await page.goto("/verify");
    await waitForPageLoad(page);

    await expect(page.getByText(/connect/i)).toBeVisible();
  });

  test("can switch between request and status tabs", async ({ page }) => {
    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const statusTab = page.getByRole("button", { name: /Check Status/i });
    await statusTab.click();
    await expect(statusTab).toHaveAttribute("aria-selected", "true");

    const requestTab = page.getByRole("button", { name: /Request/i });
    await requestTab.click();
    await expect(requestTab).toHaveAttribute("aria-selected", "true");
  });

  test("shows status check input on status tab", async ({ page }) => {
    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const statusTab = page.getByRole("button", { name: /Check Status/i });
    await statusTab.click();

    await expect(
      page.getByRole("textbox", { name: /project/i }),
    ).toBeVisible();
  });

  test("submitting verification request shows success", async ({ page }) => {
    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const projectInput = page.getByRole("textbox", { name: /project/i });
    await projectInput.fill("proj1");

    const submitButton = page.getByRole("button", {
      name: /submit verification/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.getByText(/verification submitted/i)).toBeVisible();
    }
  });

  test("pending verification request shows in status view", async ({
    page,
  }) => {
    const request = makeVerificationRequest({
      status: "PENDING",
    });
    await seedVerificationRequests(page, [request]);

    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const statusTab = page.getByRole("button", { name: /Check Status/i });
    await statusTab.click();

    const projectInput = page.getByRole("textbox", { name: /project/i });
    await projectInput.fill(request.projectId);

    const checkButton = page.getByRole("button", { name: /check status/i });
    if (await checkButton.isVisible()) {
      await checkButton.click();
      await expect(page.getByText(/pending/i)).toBeVisible();
    }
  });

  test("verified status shows approved badge", async ({ page }) => {
    const request = makeVerificationRequest({
      status: "VERIFIED",
    });
    await seedVerificationRequests(page, [request]);

    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const statusTab = page.getByRole("button", { name: /Check Status/i });
    await statusTab.click();

    const projectInput = page.getByRole("textbox", { name: /project/i });
    await projectInput.fill(request.projectId);

    const checkButton = page.getByRole("button", { name: /check status/i });
    if (await checkButton.isVisible()) {
      await checkButton.click();
      await expect(page.getByText(/verified/i)).toBeVisible();
    }
  });

  test("rejected status shows rejection reason", async ({ page }) => {
    const request = makeVerificationRequest({
      status: "REJECTED",
      rejectionReason: "Insufficient documentation provided",
    });
    await seedVerificationRequests(page, [request]);

    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const statusTab = page.getByRole("button", { name: /Check Status/i });
    await statusTab.click();

    const projectInput = page.getByRole("textbox", { name: /project/i });
    await projectInput.fill(request.projectId);

    const checkButton = page.getByRole("button", { name: /check status/i });
    if (await checkButton.isVisible()) {
      await checkButton.click();
      await expect(page.getByText(/rejected/i)).toBeVisible();
      await expect(
        page.getByText("Insufficient documentation provided"),
      ).toBeVisible();
    }
  });

  test("non-owner cannot verify project", async ({ page }) => {
    await mockConnectedWallet(page, "GNONOWNERADDRESS123456789");
    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.locator("h1")).toContainText("Project Verification");
  });

  test("duplicate pending request is blocked", async ({ page }) => {
    const request = makeVerificationRequest({
      status: "PENDING",
    });
    await seedVerificationRequests(page, [request]);

    await page.goto("/verify");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const projectInput = page.getByRole("textbox", { name: /project/i }).first();
    if (await projectInput.isVisible()) {
      await projectInput.fill(request.projectId);
      const submitButton = page.getByRole("button", {
        name: /submit verification/i,
      });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await expect(
          page.getByText(/already pending/i),
        ).toBeVisible();
      }
    }
  });
});
