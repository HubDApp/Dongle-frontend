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

    await expect(page.getByLabelText(/project name/i)).toBeVisible();
    await expect(page.getByLabelText(/description/i)).toBeVisible();
    await expect(page.getByLabelText(/category/i)).toBeVisible();
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

    await page.getByLabelText(/project name/i).fill("Test Project");
    await page.getByLabelText(/description/i).fill("short");

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

    await page.getByLabelText(/project name/i).fill("Test Project");
    await page
      .getByLabelText(/description/i)
      .fill("This is a valid description with more than twenty characters");
    await page.getByLabelText(/category/i).selectOption("defi");
    await page.getByLabelText(/Project Website/i).fill("not-a-valid-url");

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

    await page.getByLabelText(/project name/i).fill("My Test Project");
    await page
      .getByLabelText(/description/i)
      .fill("This is a valid project description with enough characters.");
    await page.getByLabelText(/category/i).selectOption("defi");
    await page.getByLabelText(/Project Website/i).fill("https://example.com");

    const submitButton = page.getByRole("button", {
      name: /Submit Registration/i,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("optional fields can be left empty without errors", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await page.getByLabelText(/project name/i).fill("Test Project");
    await page
      .getByLabelText(/description/i)
      .fill("This is a valid description with enough characters.");
    await page.getByLabelText(/category/i).selectOption("defi");

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

    await page.getByLabelText(/project name/i).fill("Test Project");
    await page
      .getByLabelText(/description/i)
      .fill("This is a valid description with more than twenty characters");
    await page.getByLabelText(/category/i).selectOption("defi");
    await page
      .getByLabelText(/Project Website/i)
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

    await page.getByLabelText(/project name/i).fill("Draft Project");

    await page.reload();
    await waitForPageLoad(page);

    await expect(page.getByLabelText(/project name/i)).toHaveValue(
      "Draft Project",
    );
  });

  test("project form has all category options", async ({ page }) => {
    await page.goto("/projects/new");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const categorySelect = page.getByLabelText(/category/i);
    const options = categorySelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });
});
