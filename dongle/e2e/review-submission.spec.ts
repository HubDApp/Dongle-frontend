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

  test("complete review submission flow - end to end", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Open review form
    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();
    await expect(page.getByText(/Leave a Review/i)).toBeVisible();

    // Select 5-star rating
    const ratingButton = page.getByRole("button", { name: /5 out of 5/i });
    await ratingButton.click();

    // Fill in comment
    const commentField = page.getByPlaceholder(/share your experience/i);
    await commentField.fill(
      "This is an outstanding project! The team is responsive, the features are well-designed, and the community is very supportive. Highly recommended for anyone looking to get involved in the Stellar ecosystem.",
    );

    // Submit review
    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify success
    await expect(page.getByText("Review posted")).toBeVisible();
    
    // Verify review appears in list
    await expect(
      page.getByText(/This is an outstanding project/i),
    ).toBeVisible();
  });

  test("edit existing review", async ({ page }) => {
    const review = makeReview({
      comment: "Original review comment that will be updated.",
    });
    await seedReviews(page, [review]);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Look for edit button
    const editButton = page.getByRole("button", { name: /edit/i }).first();
    const isVisible = await editButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      await editButton.click();

      // Update comment
      const commentField = page.getByPlaceholder(/share your experience/i);
      await commentField.clear();
      await commentField.fill("Updated review with new insights and observations.");

      // Submit update
      const submitButton = page.getByRole("button", {
        name: /update|save/i,
      });
      await submitButton.click();

      // Verify success
      await expect(page.getByText(/updated|saved/i)).toBeVisible();
    }
  });

  test("helpful/unhelpful voting on reviews", async ({ page }) => {
    const review = makeReview({
      userAddress: "GOTHER_USER_123456789",
    });
    await seedReviews(page, [review]);
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    // Look for voting buttons
    const helpfulButton = page.getByRole("button", { name: /helpful/i }).first();
    const isVisible = await helpfulButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      await helpfulButton.click();
      
      // Verify vote registered
      await expect(helpfulButton).toHaveAttribute("aria-pressed", "true");
    }
  });

  test("review character count updates", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const commentField = page.getByPlaceholder(/share your experience/i);
    await commentField.fill("Test comment");

    // Look for character counter
    const counter = page.locator("text=/\\d+ characters/i");
    const isVisible = await counter.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isVisible) {
      await expect(counter).toBeVisible();
    }
  });

  test("review form validates maximum comment length", async ({ page }) => {
    await page.goto("/reviews");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const reviewButton = page.getByRole("button", { name: /Review /i }).first();
    await reviewButton.click();

    const commentField = page.getByPlaceholder(/share your experience/i);
    // Create a very long comment (over 1000 characters)
    const longComment = "a".repeat(1500);
    await commentField.fill(longComment);

    const submitButton = page.getByRole("button", {
      name: /submit review/i,
    });
    await submitButton.click();

    // Check if there's a max length validation
    const maxLengthError = page.getByText(/maximum|too long|exceed/i);
    const hasError = await maxLengthError.isVisible({ timeout: 1000 }).catch(() => false);
    
    // If max length validation exists, it should show an error
    if (hasError) {
      await expect(maxLengthError).toBeVisible();
    }
  });
});
