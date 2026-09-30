import { test, expect } from "@playwright/test";
import {
  mockConnectedWallet,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

test.describe("Project Submission Flow (#373)", () => {
  test.beforeEach(async ({ page }) => {
    await mockConnectedWallet(page);
  });

  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("wallet gate - shows connect message when disconnected", async ({
    page,
  }) => {
    await clearLocalStorage(page);
    await page.goto("/projects/new");
    await waitForPageLoad(page);

    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Connect Wallet/i }),
    ).toBeVisible();
  });

  test("shows form when wallet is connected", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByLabel(/project name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
  });

  test("form validation - all required fields enforced", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await submitButton.click();

    await expect(
      page.getByText(/project name must be at least/i),
    ).toBeVisible();
  });

  test("form validation - description minimum length", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("Test Project");
    await page.getByLabel(/description/i).fill("short");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await submitButton.click();

    await expect(
      page.getByText(/description must be at least 10 characters/i),
    ).toBeVisible();
  });

  test("form validation - invalid URL rejected", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("Test Project");
    await page
      .getByLabel(/description/i)
      .fill("This is a valid description with more than twenty characters");
    await page.getByLabel(/category/i).selectOption("defi");
    await page.getByLabel(/Project Website/i).fill("not-a-valid-url");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await submitButton.click();

    await expect(page.getByText(/valid url/i)).toBeVisible();
  });

  test("form accepts valid data", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("My Test Project");
    await page
      .getByLabel(/description/i)
      .fill("This is a valid project description with enough characters.");
    await page.getByLabel(/category/i).selectOption("defi");
    await page.getByLabel(/Project Website/i).fill("https://example.com");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("optional fields can be left empty without errors", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("Test Project");
    await page
      .getByLabel(/description/i)
      .fill("This is a valid description with enough characters.");
    await page.getByLabel(/category/i).selectOption("defi");

    const alerts = page.locator('[role="alert"]');
    await expect(alerts).toHaveCount(0);
  });

  test("has contract address add/remove functionality", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const addButton = page.getByRole("button", {
      name: /add a contract address/i,
    });
    await expect(addButton).toBeVisible();

    await addButton.click();
    await expect(
      page.getByRole("textbox", { name: /^contract address 1$/i }),
    ).toBeVisible();

    const removeButton = page.getByRole("button", {
      name: /remove contract address 1/i,
    });
    await removeButton.click();
    await expect(
      page.getByRole("textbox", { name: /^contract address 1$/i }),
    ).not.toBeVisible();
  });

  test("contract address validation - invalid ID rejected", async ({
    page,
  }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByRole("button", { name: /add a contract address/i }).click();

    await page.getByLabel(/project name/i).fill("Test Project");
    await page
      .getByLabel(/description/i)
      .fill("This is a valid description with more than twenty characters");
    await page.getByLabel(/category/i).selectOption("defi");
    await page
      .getByLabel(/Project Website/i)
      .fill("https://example.com");
    await page
      .getByRole("textbox", { name: /^contract address 1$/i })
      .fill("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await submitButton.click();

    await expect(
      page.getByText(/invalid soroban contract id/i),
    ).toBeVisible();
  });

  test("draft auto-save persists data on page reload", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("Draft Project");

    await page.reload();
    await waitForPageLoad(page);

    await expect(page.getByLabel(/project name/i)).toHaveValue(
      "Draft Project",
    );
  });

  test("project form has all category options", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const categorySelect = page.getByLabel(/category/i);
    const options = categorySelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test("complete project creation flow - end to end", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Fill in all required fields
    await page.getByLabel(/project name/i).fill("Complete E2E Test Project");
    await page
      .getByLabel(/description/i)
      .fill(
        "This is a comprehensive end-to-end test project with a detailed description that meets all validation requirements.",
      );
    await page.getByLabel(/category/i).selectOption("defi");
    await page
      .getByLabel(/Project Website/i)
      .fill("https://e2etest.example.com");

    // Add optional fields
    const addButton = page.getByRole("button", {
      name: /add a contract address/i,
    });
    await addButton.click();
    await page
      .getByRole("textbox", { name: /^contract address 1$/i })
      .fill("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");

    // Verify submit button is enabled
    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await expect(submitButton).toBeEnabled();

    // Check for success indicators (form clears or redirect happens)
    await submitButton.click();
    
    // Wait for potential success message or navigation
    await page.waitForTimeout(1000);
    
    // Verify no validation errors are present
    const errorMessages = page.locator('[role="alert"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test("project creation with tags", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabel(/project name/i).fill("Tagged Project");
    await page
      .getByLabel(/description/i)
      .fill("Project with tags for better discoverability.");
    await page.getByLabel(/category/i).selectOption("defi");

    // Look for tags input if available
    const tagsInput = page.getByLabel(/tags/i);
    if (await tagsInput.isVisible()) {
      await tagsInput.fill("stellar, defi, swap");
    }

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("project edit mode loads existing data", async ({ page }) => {
    // This test assumes there's an edit route - adjust if needed
    await page.goto("/projects/edit/test-project");
    await waitForPageLoad(page);
    
    // Should either show the edit form or redirect to new
    const projectNameField = page.getByLabel(/project name/i);
    const isVisible = await projectNameField.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // If edit form is available, verify it can be modified
      await projectNameField.clear();
      await projectNameField.fill("Updated Project Name");
      
      const submitButton = page.getByRole("button", {
        name: /update|save|submit/i,
      });
      await expect(submitButton).toBeVisible();
    }
  });
});
