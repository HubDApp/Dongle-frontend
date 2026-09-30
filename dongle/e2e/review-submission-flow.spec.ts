/**
 * E2E: review submission flow (Issue #500).
 *
 * Covers the five acceptance criteria: selecting a rating, entering a comment,
 * validation on submit, successful submission, and error handling.
 *
 * Deliberately separate from `review-submission.spec.ts` (#372), which covers
 * the surrounding page — listing, sorting, filtering, seeded reviews. This spec
 * stays focused on the submission interaction itself and on failure paths that
 * the page spec only asserts conditionally.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  mockConnectedWallet,
  seedReviews,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
  makeReview,
  TEST_WALLET_ADDRESS,
} from "./helpers/test-setup";

/** Opens the review form for the first project listed on /reviews. */
const openReviewForm = async (page: Page) => {
  await page.goto("/reviews");
  await waitForPageLoad(page);
  await expectNoSpinners(page);

  const reviewButton = page.getByRole("button", { name: /Review /i }).first();
  await reviewButton.click();
  await expect(page.getByText(/Leave a Review/i)).toBeVisible();
};

const commentField = (page: Page) =>
  page.getByPlaceholder(/share your experience/i);

const submitButton = (page: Page) =>
  page.getByRole("button", { name: /submit review/i });

const ratingButton = (page: Page, stars: number) =>
  page.getByRole("button", { name: `${stars} out of 5` });

/** A comment long enough to clear the 10-character minimum. */
const VALID_COMMENT =
  "Excellent project with strong fundamentals and great community support.";

test.describe("Review submission flow (#500)", () => {
  test.beforeEach(async ({ page }) => {
    await mockConnectedWallet(page);
  });

  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  // ─── Selecting a rating ────────────────────────────────────────────────────

  test.describe("selecting a rating", () => {
    test("each rating from 1 to 5 is selectable", async ({ page }) => {
      for (const stars of [1, 2, 3, 4, 5]) {
        await clearLocalStorage(page);
        await openReviewForm(page);

        await ratingButton(page, stars).click();
        await expect(ratingButton(page, stars)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
      }
    });

    test("changing the rating replaces the previous selection", async ({
      page,
    }) => {
      await openReviewForm(page);

      await ratingButton(page, 5).click();
      await expect(ratingButton(page, 5)).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await ratingButton(page, 2).click();
      await expect(ratingButton(page, 2)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(ratingButton(page, 5)).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });

  // ─── Entering a comment ────────────────────────────────────────────────────

  test.describe("entering a comment", () => {
    test("accepts a typed comment", async ({ page }) => {
      await openReviewForm(page);

      await commentField(page).fill(VALID_COMMENT);
      await expect(commentField(page)).toHaveValue(VALID_COMMENT);
    });

    test("clears the comment when cleared", async ({ page }) => {
      await openReviewForm(page);

      await commentField(page).fill(VALID_COMMENT);
      await commentField(page).clear();
      await expect(commentField(page)).toHaveValue("");
    });
  });

  // ─── Validation on submit ──────────────────────────────────────────────────

  test.describe("validation on submit", () => {
    test("blocks submit with no rating and no comment", async ({ page }) => {
      await openReviewForm(page);

      await submitButton(page).click();

      await expect(page.getByText(/rating is required/i)).toBeVisible();
    });

    test("blocks submit when the comment is too short", async ({ page }) => {
      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill("short");
      await submitButton(page).click();

      await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
    });

    test("blocks submit when a rating is chosen but the comment is empty", async ({
      page,
    }) => {
      await openReviewForm(page);

      await ratingButton(page, 3).click();
      await submitButton(page).click();

      await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
    });

    test("does not post a review after a failed validation attempt", async ({
      page,
    }) => {
      await openReviewForm(page);

      await submitButton(page).click();
      await expect(page.getByText(/rating is required/i)).toBeVisible();

      // The form must still be open with nothing persisted.
      await expect(page.getByText(/Leave a Review/i)).toBeVisible();
      await expect(page.getByText("Review posted")).not.toBeVisible();
    });
  });

  // ─── Successful submission ─────────────────────────────────────────────────

  test.describe("successful submission", () => {
    test("confirms the submission and lists the new review", async ({ page }) => {
      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill(VALID_COMMENT);
      await submitButton(page).click();

      await expect(page.getByText("Review posted")).toBeVisible();
      await expect(page.getByText(VALID_COMMENT)).toBeVisible();
    });

    test("persists the submitted review across a reload", async ({ page }) => {
      await openReviewForm(page);

      await ratingButton(page, 5).click();
      await commentField(page).fill(VALID_COMMENT);
      await submitButton(page).click();
      await expect(page.getByText("Review posted")).toBeVisible();

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(page.getByText(VALID_COMMENT)).toBeVisible();
    });

    test("records the submitting wallet on the review", async ({ page }) => {
      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill(VALID_COMMENT);
      await submitButton(page).click();
      await expect(page.getByText("Review posted")).toBeVisible();

      await expect(
        page.getByText(TEST_WALLET_ADDRESS.slice(0, 6)),
      ).toBeVisible();
    });
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  test.describe("error handling", () => {
    test("rejects a duplicate review from the same wallet", async ({ page }) => {
      await seedReviews(page, [makeReview()]);

      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill(
        "Another review for the same project by the same wallet.",
      );
      await submitButton(page).click();

      await expect(
        page.getByText(/already reviewed this project/i),
      ).toBeVisible();
    });

    test("keeps the typed comment after a rejected submission", async ({
      page,
    }) => {
      await seedReviews(page, [makeReview()]);

      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill("A comment the server will reject.");
      await submitButton(page).click();
      await expect(
        page.getByText(/already reviewed this project/i),
      ).toBeVisible();

      // Discarding the user's typing on a rejected submit would be a real bug.
      await expect(commentField(page)).toHaveValue(
        "A comment the server will reject.",
      );
    });

    test("recovers on a second attempt after fixing a validation error", async ({
      page,
    }) => {
      await openReviewForm(page);

      // Fail first: comment too short.
      await ratingButton(page, 4).click();
      await commentField(page).fill("short");
      await submitButton(page).click();
      await expect(page.getByText(/at least 10 characters/i)).toBeVisible();

      // Then correct it and resubmit.
      await commentField(page).fill(VALID_COMMENT);
      await submitButton(page).click();

      await expect(page.getByText("Review posted")).toBeVisible();
    });

    test("discards the typed comment when the form is cancelled", async ({
      page,
    }) => {
      await openReviewForm(page);

      await ratingButton(page, 4).click();
      await commentField(page).fill(VALID_COMMENT);

      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByText(/Leave a Review/i)).not.toBeVisible();

      // Reopening starts clean rather than restoring the cancelled input.
      await openReviewForm(page);
      await expect(commentField(page)).toHaveValue("");
    });
  });
});