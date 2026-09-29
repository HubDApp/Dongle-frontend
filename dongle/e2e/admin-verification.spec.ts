import { test, expect } from "@playwright/test";
import {
  mockAdminWallet,
  mockConnectedWallet,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  TEST_ADMIN_ADDRESS,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

const NON_ADMIN_ADDRESS = "GNOTADMIN1234567890";

test.describe("Admin Verification Dashboard (#375)", () => {
  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("admin sees dashboard when connected with admin wallet", async ({
    page,
  }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.locator("h1")).toContainText("ADMIN DASHBOARD");
  });

  test("non-admin sees access restricted message", async ({ page }) => {
    await mockConnectedWallet(page, NON_ADMIN_ADDRESS);
    await page.goto("/admin");
    await waitForPageLoad(page);

    await expect(page.getByText("Access Restricted")).toBeVisible();
    await expect(
      page.getByText(/not on the admin allowlist/i),
    ).toBeVisible();
  });

  test("disconnected user sees connect wallet prompt", async ({ page }) => {
    await page.goto("/admin");
    await waitForPageLoad(page);

    await expect(page.getByText("Connect Your Wallet")).toBeVisible();
    await expect(
      page.getByText(/authorized admin Freighter wallet/i),
    ).toBeVisible();
  });

  test("admin sees verification requests section", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText(/verification requests/i).first()).toBeVisible();
  });

  test("admin sees verification request with pending status", async ({
    page,
  }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText("Lumina DEX")).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test("admin can approve a pending request", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const approveButtons = page.getByRole("button", { name: /approve/i });
    const firstApprove = approveButtons.first();
    await firstApprove.click();

    await expect(page.getByText(/approved/i).first()).toBeVisible();
  });

  test("admin can reject a pending request", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const rejectButtons = page.getByRole("button", { name: /reject/i });
    const firstReject = rejectButtons.first();
    await firstReject.click();

    await expect(page.getByText(/rejected/i).first()).toBeVisible();
  });

  test("admin sees system settings section", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText(/system settings/i)).toBeVisible();
    await expect(page.getByText(/verification fee/i)).toBeVisible();
  });

  test("admin can update verification fee", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const feeInput = page.getByRole("spinbutton");
    await feeInput.fill("2.5");

    const updateButton = page.getByRole("button", { name: /update fee/i });
    await updateButton.click();

    await expect(page.getByText(/verification fee updated/i)).toBeVisible();
  });

  test("admin sees stats overview", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText("Stats Overview")).toBeVisible();
    await expect(page.getByText("Queue")).toBeVisible();
  });

  test("admin can switch to audit log tab", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const auditTab = page.getByRole("button", { name: /Audit Log/i });
    await auditTab.click();

    await expect(page.getByText(/audit log/i).first()).toBeVisible();
  });

  test("admin can switch to reports tab", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reportsTab = page.getByRole("button", { name: /Review Reports/i });
    await reportsTab.click();

    await expect(page.getByText(/ownership claims/i)).toBeVisible();
  });

  test("non-admin user cannot see approve/reject buttons", async ({ page }) => {
    await mockConnectedWallet(page, NON_ADMIN_ADDRESS);
    await page.goto("/admin");
    await waitForPageLoad(page);

    await expect(page.getByText("Access Restricted")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /approve/i }),
    ).not.toBeVisible();
  });

  test("admin can assign request to self", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const assignButton = page.getByRole("button", {
      name: /assign to me/i,
    }).first();
    if (await assignButton.isVisible()) {
      await assignButton.click();
      await expect(page.getByText(/request assigned/i)).toBeVisible();
    }
  });

  test("fee input shows current value and updates", async ({ page }) => {
    await mockAdminWallet(page);
    await page.goto("/admin");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const feeInput = page.getByRole("spinbutton");
    await expect(feeInput).toHaveValue("1.5");

    await feeInput.fill("3.0");
    await expect(feeInput).toHaveValue("3.0");
  });
});
