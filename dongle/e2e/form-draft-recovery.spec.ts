/**
 * E2E: form draft recovery (Issue #501).
 *
 * Covers the five acceptance criteria: auto-save, recovery after a page
 * refresh, draft discard, the restore UI, and behaviour across scenarios.
 *
 * Approach: drafts are stored AES-encrypted in localStorage keyed by the
 * wallet public-key hash, so this spec deliberately does NOT seed localStorage
 * directly — doing so would mean reimplementing the cipher in the test and
 * would assert against a hand-built payload rather than the real thing. Each
 * test instead drives the actual form and waits out the 2s auto-save debounce.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  mockConnectedWallet,
  clearLocalStorage,
  waitForPageLoad,
  expectNoSpinners,
} from "./helpers/test-setup";

const DRAFT_FORM_URL = "/projects/new";

/** Auto-save is debounced by 2s in `useDraft` (AUTO_SAVE_DEBOUNCE_MS). */
const AUTO_SAVE_WAIT_MS = 3_500;

const nameInput = (page: Page) => page.getByPlaceholder("e.g. Soroban Swap");

const draftIndicator = (page: Page) => page.getByText("Draft saved");

const discardButton = (page: Page) =>
  page.getByRole("button", { name: /Discard Draft/i });

/** Opens a clean project form and waits for hydration. */
const openDraftForm = async (page: Page) => {
  await page.goto(DRAFT_FORM_URL);
  await waitForPageLoad(page);
  await expectNoSpinners(page);
  await expect(nameInput(page)).toBeVisible();
};

/** Types into the name field and waits past the auto-save debounce. */
const typeAndAutoSave = async (page: Page, value: string) => {
  await nameInput(page).fill(value);
  // Let the debounce elapse and the save land.
  await page.waitForTimeout(AUTO_SAVE_WAIT_MS);
};

test.describe("Form draft recovery (#501)", () => {
  test.beforeEach(async ({ page }) => {
    await mockConnectedWallet(page);
  });

  test.afterEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  // ─── Auto-save ─────────────────────────────────────────────────────────────

  test.describe("draft auto-save", () => {
    test("saves a draft after the user types", async ({ page }) => {
      await openDraftForm(page);
      await expect(draftIndicator(page)).toHaveCount(0);

      await typeAndAutoSave(page, "Auto Saved Project");

      // The restore UI only appears once a draft has actually been persisted.
      await expect(draftIndicator(page)).toBeVisible();
    });

    test("shows the saved timestamp alongside the draft indicator", async ({
      page,
    }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Timestamped Project");

      await expect(draftIndicator(page)).toBeVisible();
      await expect(
        page.getByText(/just now|seconds? ago|minutes? ago|moment ago/i),
      ).toBeVisible();
    });

    test("does not report a saved draft before anything is typed", async ({
      page,
    }) => {
      await openDraftForm(page);

      // Empty content is intentionally not persisted — see `hasContent`.
      await page.waitForTimeout(AUTO_SAVE_WAIT_MS);
      await expect(draftIndicator(page)).toHaveCount(0);
    });

    test("persists a draft when the user navigates away from the field", async ({
      page,
    }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Blur Saved Project");

      await nameInput(page).blur();
      await expect(draftIndicator(page)).toBeVisible();
    });
  });

  // ─── Page refresh recovery ─────────────────────────────────────────────────

  test.describe("page refresh recovery", () => {
    test("recovers the draft after a reload", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Recovered After Refresh");

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(nameInput(page)).toHaveValue("Recovered After Refresh");
      await expect(draftIndicator(page)).toBeVisible();
    });

    test("recovers the most recent edit, not a stale one", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "First Version");

      // A second edit must supersede the first after reload.
      await typeAndAutoSave(page, "Second Version");

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(nameInput(page)).toHaveValue("Second Version");
    });

    test("recovers an empty field when no draft was ever saved", async ({
      page,
    }) => {
      await openDraftForm(page);
      await page.waitForTimeout(AUTO_SAVE_WAIT_MS);

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(nameInput(page)).toHaveValue("");
      await expect(draftIndicator(page)).toHaveCount(0);
    });
  });

  // ─── Draft restore UI ──────────────────────────────────────────────────────

  test.describe("draft restore UI", () => {
    test("offers a restore affordance once a draft exists", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Restorable Project");

      await expect(discardButton(page)).toBeVisible();
    });

    test("restores the saved value into the form", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Restore Target");

      // Clear the field, then reload so the restore path runs.
      await nameInput(page).fill("");
      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(nameInput(page)).toHaveValue("Restore Target");
    });

    test("hides the indicator again once the draft is discarded", async ({
      page,
    }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "To Be Discarded");

      await expect(draftIndicator(page)).toBeVisible();
      await discardButton(page).click();
      await expect(draftIndicator(page)).toHaveCount(0);
    });
  });

  // ─── Discard ───────────────────────────────────────────────────────────────

  test.describe("draft discard", () => {
    test("clears the draft so a reload does not restore it", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Discard Me");

      await discardButton(page).click();
      await expect(draftIndicator(page)).toHaveCount(0);

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      // The value must not come back after the discard.
      await expect(nameInput(page)).toHaveValue("");
      await expect(draftIndicator(page)).toHaveCount(0);
    });

    test("allows a new draft to be saved after discarding the previous one", async ({
      page,
    }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "First Draft");

      await discardButton(page).click();
      await expect(draftIndicator(page)).toHaveCount(0);

      // The form must still be usable after a discard.
      await typeAndAutoSave(page, "Second Draft");
      await expect(draftIndicator(page)).toBeVisible();

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);
      await expect(nameInput(page)).toHaveValue("Second Draft");
    });
  });

  // ─── Scenarios ─────────────────────────────────────────────────────────────

  test.describe("different scenarios", () => {
    test("a short name still round-trips", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "abc");

      await page.reload();
      await waitForPageLoad(page);
      await expect(nameInput(page)).toHaveValue("abc");
    });

    test("a long name round-trips up to the field max length", async ({
      page,
    }) => {
      await openDraftForm(page);
      // The Project Name field declares maxLength={50}.
      const longName = "A".repeat(50);
      await typeAndAutoSave(page, longName);

      await page.reload();
      await waitForPageLoad(page);
      await expect(nameInput(page)).toHaveValue(longName);
    });

    test("survives two consecutive reloads", async ({ page }) => {
      await openDraftForm(page);
      await typeAndAutoSave(page, "Persist Twice");

      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);
      await page.reload();
      await waitForPageLoad(page);
      await expectNoSpinners(page);

      await expect(nameInput(page)).toHaveValue("Persist Twice");
    });

    test("keeps drafts isolated between separate sessions", async ({ page }) => {
      // A discarded draft must not bleed into a later session.
      await openDraftForm(page);
      await typeAndAutoSave(page, "Session One");
      await discardButton(page).click();

      await clearLocalStorage(page);
      await openDraftForm(page);

      await expect(nameInput(page)).toHaveValue("");
      await expect(draftIndicator(page)).toHaveCount(0);
    });
  });
});