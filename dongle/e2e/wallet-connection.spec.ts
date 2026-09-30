import { test, expect, Page } from "@playwright/test";
import {
  mockConnectedWallet,
  clearLocalStorage,
  waitForPageLoad,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

test.describe("Wallet Connection E2E", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("should connect wallet and display address in navbar", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    // Mock wallet connection
    await mockConnectedWallet(page);
    await page.reload();
    await waitForPageLoad(page);

    // Verify wallet address is displayed in navbar
    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).toBeVisible();
    await expect(walletDisplay).toContainText(
      TEST_WALLET_ADDRESS.substring(0, 6)
    );
  });

  test("should handle disconnect and reconnect flow", async ({ page }) => {
    // Start with connected wallet
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);

    // Verify connected state
    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).toBeVisible();

    // Disconnect
    const disconnectButton = page.locator(
      'button:has-text("Disconnect"), button[aria-label*="Disconnect"]'
    );
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();

      // Verify disconnected state
      const connectButton = page.locator(
        'button:has-text("Connect Wallet"), button:has-text("Connect")'
      );
      await expect(connectButton).toBeVisible();
    }

    // Reconnect
    await mockConnectedWallet(page);
    await page.reload();
    await waitForPageLoad(page);

    // Verify reconnected
    await expect(walletDisplay).toBeVisible();
  });

  test("should persist wallet connection across page reload", async ({
    page,
  }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);

    // Verify initial connection
    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).toBeVisible();

    // Reload page
    await page.reload();
    await waitForPageLoad(page);

    // Verify connection persisted
    await expect(walletDisplay).toBeVisible();
    await expect(walletDisplay).toContainText(
      TEST_WALLET_ADDRESS.substring(0, 6)
    );
  });

  test("should handle network mismatch error", async ({ page }) => {
    // Mock wallet with wrong network
    await page.addInitScript(() => {
      localStorage.setItem(
        "dongle_wallet_state",
        JSON.stringify({
          publicKey: "GTEST123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234",
          isConnected: true,
          network: "MAINNET", // Wrong network
        })
      );
    });

    await page.goto("/");
    await waitForPageLoad(page);

    // Look for network error message
    const errorMessage = page.locator(
      'text=/wrong network|network mismatch|incorrect network/i'
    );
    
    // Either the error should be visible OR wallet should not be connected
    const walletNotConnected = page.locator(
      'button:has-text("Connect Wallet")'
    );
    
    const hasError = await errorMessage.isVisible().catch(() => false);
    const notConnected = await walletNotConnected
      .isVisible()
      .catch(() => false);

    expect(hasError || notConnected).toBe(true);
  });

  test("should clear error on network switch", async ({ page }) => {
    // Start with wrong network
    await page.addInitScript(() => {
      localStorage.setItem(
        "dongle_wallet_state",
        JSON.stringify({
          publicKey: "GTEST123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234",
          isConnected: true,
          network: "MAINNET",
        })
      );
    });

    await page.goto("/");
    await waitForPageLoad(page);

    // Switch to correct network
    await mockConnectedWallet(page);
    await page.reload();
    await waitForPageLoad(page);

    // Error should be cleared and wallet should be connected
    const errorMessage = page.locator(
      'text=/wrong network|network mismatch|incorrect network/i'
    );
    await expect(errorMessage).not.toBeVisible();

    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).toBeVisible();
  });

  test("should show connect wallet prompt when not connected", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    // Should show connect button
    const connectButton = page.locator(
      'button:has-text("Connect Wallet"), button:has-text("Connect")'
    );
    await expect(connectButton).toBeVisible();

    // Should not show wallet address
    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).not.toBeVisible();
  });
});

test.describe("Wallet Network Validation", () => {
  test("should validate network on connection", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/");
    await waitForPageLoad(page);

    // Wallet should be connected with correct network
    const walletDisplay = page.locator('[data-testid="wallet-address"]');
    await expect(walletDisplay).toBeVisible();

    // No network errors should be present
    const networkError = page.locator('[data-testid="network-error"]');
    await expect(networkError).not.toBeVisible();
  });

  test("should prevent operations on wrong network", async ({ page }) => {
    // Connect with wrong network
    await page.addInitScript(() => {
      localStorage.setItem(
        "dongle_wallet_state",
        JSON.stringify({
          publicKey: "GTEST123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234",
          isConnected: true,
          network: "PUBLIC",
        })
      );
    });

    await page.goto("/projects");
    await waitForPageLoad(page);

    // Try to interact with a feature requiring wallet
    const submitButton = page.locator(
      'button:has-text("Submit"), button:has-text("Create")'
    );
    
    if (await submitButton.isVisible()) {
      // Button should either be disabled or show error on click
      const isDisabled = await submitButton.isDisabled();
      
      if (!isDisabled) {
        await submitButton.click();
        const error = page.locator(
          'text=/network/i'
        );
        await expect(error).toBeVisible();
      }
    }
  });
});
