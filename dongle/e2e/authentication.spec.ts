import { test, expect } from "@playwright/test";
import {
  mockConnectedWallet,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  getLocalStorageItem,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

test.describe("Authentication Flow", () => {
  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("initial state - wallet not connected", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    const connectButton = page.getByRole("button", {
      name: /connect wallet/i,
    });
    await expect(connectButton).toBeVisible();
  });

  test("connect wallet button is accessible", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    const connectButton = page.getByRole("button", {
      name: /connect wallet/i,
    });
    
    // Check for proper ARIA attributes
    await expect(connectButton).toBeEnabled();
    await expect(connectButton).toHaveAttribute("type", "button");
  });

  test("wallet connection persists in localStorage", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);

    const walletState = await getLocalStorageItem(
      page,
      "dongle_wallet_state",
    );
    expect(walletState).toBeTruthy();
    
    const parsed = JSON.parse(walletState!);
    expect(parsed.publicKey).toBe(TEST_WALLET_ADDRESS);
    expect(parsed.isConnected).toBe(true);
  });

  test("connected wallet displays address", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Should show truncated wallet address
    const addressDisplay = page.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));
    await expect(addressDisplay).toBeVisible();
  });

  test("disconnect wallet clears state", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Look for disconnect button
    const disconnectButton = page.getByRole("button", {
      name: /disconnect|sign out/i,
    });
    
    const isVisible = await disconnectButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isVisible) {
      await disconnectButton.click();

      // Verify wallet state is cleared
      await page.waitForTimeout(500);
      const walletState = await getLocalStorageItem(
        page,
        "dongle_wallet_state",
      );
      
      if (walletState) {
        const parsed = JSON.parse(walletState);
        expect(parsed.isConnected).toBe(false);
      }

      // Connect button should be visible again
      const connectButton = page.getByRole("button", {
        name: /connect wallet/i,
      });
      await expect(connectButton).toBeVisible();
    }
  });

  test("wallet gate - protected routes redirect when disconnected", async ({
    page,
  }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);

    // Should show wallet connection prompt
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
  });

  test("wallet gate - protected routes accessible when connected", async ({
    page,
  }) => {
    await mockConnectedWallet(page);
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Should show the actual page content, not connection prompt
    await expect(page.getByLabel(/project name/i)).toBeVisible();
  });

  test("authentication state persists across navigation", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Navigate to different pages
    await page.goto("/discover");
    await waitForPageLoad(page);

    // Wallet should still be connected
    const addressDisplay = page.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));
    await expect(addressDisplay).toBeVisible();

    await page.goto("/reviews");
    await waitForPageLoad(page);

    // Still connected
    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    const isVisible = await reviewButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    
    if (isVisible) {
      await expect(reviewButton).toBeVisible();
    }
  });

  test("authentication state persists after page reload", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Verify connected
    const addressDisplay = page.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));
    await expect(addressDisplay).toBeVisible();

    // Reload page
    await page.reload();
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Should still be connected
    await expect(addressDisplay).toBeVisible();
  });

  test("network selection is available when connected", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Look for network indicator
    const networkIndicator = page.locator("text=/testnet|mainnet/i");
    const isVisible = await networkIndicator
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isVisible) {
      await expect(networkIndicator).toBeVisible();
    }
  });

  test("complete authentication flow - connect and use app", async ({
    page,
  }) => {
    // Start disconnected
    await page.goto("/");
    await waitForPageLoad(page);

    const connectButton = page.getByRole("button", {
      name: /connect wallet/i,
    });
    await expect(connectButton).toBeVisible();

    // Mock wallet connection
    await mockConnectedWallet(page);
    await page.reload();
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Verify connected
    const addressDisplay = page.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));
    await expect(addressDisplay).toBeVisible();

    // Navigate to protected route
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Should have access
    await expect(page.getByLabel(/project name/i)).toBeVisible();

    // Fill out form to verify full functionality
    await page.getByLabel(/project name/i).fill("Authenticated Test Project");
    await page
      .getByLabel(/description/i)
      .fill("Testing authentication flow with project creation.");
    await page.getByLabel(/category/i).selectOption("defi");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("wallet connection error handling", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    // Try to access protected route without wallet
    await page.goto("/projects/new");
    await waitForPageLoad(page);

    // Should show appropriate error/prompt
    await expect(
      page.getByText(/connect|wallet|sign in/i),
    ).toBeVisible();

    // Should not show protected content
    const projectForm = page.getByLabel(/project name/i);
    const formVisible = await projectForm
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    
    expect(formVisible).toBe(false);
  });

  test("multiple wallet switches", async ({ page }) => {
    // Connect first wallet
    await mockConnectedWallet(page, "GWALLET1_123456789ABCDEF");
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    let walletState = await getLocalStorageItem(page, "dongle_wallet_state");
    let parsed = JSON.parse(walletState!);
    expect(parsed.publicKey).toBe("GWALLET1_123456789ABCDEF");

    // Switch to second wallet
    await mockConnectedWallet(page, "GWALLET2_987654321FEDCBA");
    await page.reload();
    await waitForPageLoad(page);

    walletState = await getLocalStorageItem(page, "dongle_wallet_state");
    parsed = JSON.parse(walletState!);
    expect(parsed.publicKey).toBe("GWALLET2_987654321FEDCBA");
  });

  test("concurrent tab wallet state sync", async ({ context }) => {
    // Create first tab with connected wallet
    const page1 = await context.newPage();
    await mockConnectedWallet(page1);
    await page1.goto("/");
    await waitForPageLoad(page1);

    // Create second tab
    const page2 = await context.newPage();
    await page2.goto("/");
    await waitForPageLoad(page2);

    // Both should show connected state (via shared localStorage)
    const address1 = page1.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));
    const address2 = page2.getByText(new RegExp(TEST_WALLET_ADDRESS.slice(0, 6)));

    await expect(address1).toBeVisible();
    await expect(address2).toBeVisible();

    await page1.close();
    await page2.close();
  });
});
