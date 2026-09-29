import { test, expect } from "@playwright/test";
import {
  mockConnectedWallet,
  seedReviews,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  makeReview,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

test.describe("Review Submission Flow (#372)", () => {
  test.beforeEach(async ({ page }) => {
    await mockConnectedWallet(page);
  });

  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test("connect wallet and navigate to reviews page", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.locator("h1")).toContainText("COMMUNITY REVIEWS");
  });

  test("shows wallet not connected banner when disconnected", async ({
    page,
  }) => {
    await clearLocalStorage(page);
    await page.goto("/reviews");
    await waitForPageLoad(page);

    await expect(page.getByText("Wallet not connected")).toBeVisible();
    await expect(
      page.getByText(/Connect Freighter to post/i),
    ).toBeVisible();
  });

  test("shows review buttons when wallet is connected", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await expect(reviewButton).toBeVisible();
  });

  test("clicking review button opens review form", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    await expect(page.getByText(/Leave a Review/i)).toBeVisible();
  });

  test("form validation - rating is required", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await submitButton.click();

    await expect(page.getByText(/rating is required/i)).toBeVisible();
  });

  test("form validation - comment minimum length", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const commentField = page.getByPlaceholder(/share your experience/i);
    await commentField.fill("short");

    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await submitButton.click();

    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });

  test("submitting a valid review shows it in the list", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const ratingButton = page.getByRole("button", { name: /4 out of 5/i });
    await ratingButton.click();

    const commentField = page.getByPlaceholder(/share your experience/i);
    await commentField.fill(
      "Excellent project with strong fundamentals and great community support.",
    );

    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await submitButton.click();

    await expect(page.getByText("Review posted")).toBeVisible();
  });

  test("review shows user wallet address", async ({ page }) => {
    const review = makeReview();
    await seedReviews(page, [review]);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText(TEST_WALLET_ADDRESS.slice(0, 6))).toBeVisible();
  });

  test("review persists after page reload", async ({ page }) => {
    const review = makeReview();
    await seedReviews(page, [review]);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText(review.comment)).toBeVisible();

    await page.reload();
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    await expect(page.getByText(review.comment)).toBeVisible();
  });

  test("duplicate submission is blocked with error", async ({ page }) => {
    const review = makeReview();
    await seedReviews(page, [review]);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const ratingButton = page.getByRole("button", { name: /4 out of 5/i });
    await ratingButton.click();

    const commentField = page.getByPlaceholder(/share your experience/i);
    await commentField.fill(
      "Another review for the same project by the same wallet.",
    );

    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await submitButton.click();

    await expect(
      page.getByText(/already reviewed this project/i),
    ).toBeVisible();
  });

  test("sorting and filtering reviews works", async ({ page }) => {
    const reviews = [
      makeReview({
        id: "rev1",
        rating: 5,
        comment: "Best project ever, amazing features and team support!",
      }),
      makeReview({
        id: "rev2",
        rating: 2,
        comment: "Not impressed with the product, needs more work on UX.",
        userAddress: "GOTHER_USER_ADDRESS_123456789",
      }),
    ];
    await seedReviews(page, reviews);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const sortSelect = page.getByLabel("Sort reviews");
    await sortSelect.selectOption("highest");
    await expect(page.getByText(reviews[0].comment)).toBeVisible();

    await sortSelect.selectOption("lowest");
    await expect(page.getByText(reviews[1].comment)).toBeVisible();
  });

  test("cancel review form closes it", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();
    await expect(page.getByText(/Leave a Review/i)).toBeVisible();

    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await cancelButton.click();

    await expect(page.getByText(/Leave a Review/i)).not.toBeVisible();
  });
});
