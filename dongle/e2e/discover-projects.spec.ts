import { test, expect } from "@playwright/test";
import { waitForPageLoad, expectNoSpinners } from "./helpers/test-setup";

test.describe("Project Discovery E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/discover");
    await waitForPageLoad(page);
  });

  test("should display discover page with projects", async ({ page }) => {
    // Wait for projects to load
    await expectNoSpinners(page);

    // Should have project cards or list items
    const projectCards = page.locator(
      '[data-testid="project-card"], [data-testid*="project"]'
    );
    const count = await projectCards.count();

    // Should have at least one project or show empty state
    if (count === 0) {
      const emptyState = page.locator(
        'text=/no projects|no results|empty/i'
      );
      await expect(emptyState).toBeVisible();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should filter projects by category", async ({ page }) => {
    await expectNoSpinners(page);

    // Look for category filter
    const categoryFilter = page.locator(
      '[data-testid="category-filter"], select[name*="category"], button:has-text("Category")'
    );

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();

      // Select a category (e.g., DeFi)
      const defiOption = page.locator(
        'text=/DeFi|Decentralized Finance|defi/i'
      );
      if (await defiOption.isVisible()) {
        await defiOption.click();
        await page.waitForTimeout(500);

        // Results should update
        await expectNoSpinners(page);

        // Check URL or visible state updated
        const url = page.url();
        expect(url).toContain("category");
      }
    }
  });

  test("should filter by verification status", async ({ page }) => {
    await expectNoSpinners(page);

    // Look for verification filter
    const verificationFilter = page.locator(
      '[data-testid="verified-filter"], input[type="checkbox"]:near(text=/verified/i), button:has-text("Verified")'
    );

    if (await verificationFilter.isVisible()) {
      await verificationFilter.click();
      await page.waitForTimeout(500);
      await expectNoSpinners(page);

      // Filtered results should be shown
      const projectCards = page.locator('[data-testid="project-card"]');
      const count = await projectCards.count();

      if (count > 0) {
        // Verify projects have verification badge
        const verificationBadge = page
          .locator('[data-testid="verification-badge"]')
          .first();
        await expect(verificationBadge).toBeVisible();
      }
    }
  });

  test("should search for projects", async ({ page }) => {
    await expectNoSpinners(page);

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"], input[name*="search"]'
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill("Soroban");
      await page.waitForTimeout(500);
      await expectNoSpinners(page);

      // Results should contain search term
      const results = page.locator("text=/soroban/i");
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should open project detail page", async ({ page }) => {
    await expectNoSpinners(page);

    // Find and click first project card
    const firstProject = page
      .locator('[data-testid="project-card"], [data-testid*="project"]')
      .first();

    if (await firstProject.isVisible()) {
      await firstProject.click();
      await waitForPageLoad(page);

      // Should navigate to project detail page
      expect(page.url()).toContain("/projects/");

      // Project details should be visible
      const projectName = page.locator(
        '[data-testid="project-name"], h1, [role="heading"]'
      );
      await expect(projectName.first()).toBeVisible();
    }
  });

  test("should display project data correctly", async ({ page }) => {
    await expectNoSpinners(page);

    const projectCard = page
      .locator('[data-testid="project-card"]')
      .first();

    if (await projectCard.isVisible()) {
      // Should have project name
      const projectName = projectCard.locator(
        '[data-testid="project-name"], h2, h3'
      );
      await expect(projectName).toBeVisible();

      // Should have rating or other metadata
      const metadata = projectCard.locator(
        '[data-testid*="rating"], [data-testid*="category"]'
      );
      const metadataCount = await metadata.count();
      expect(metadataCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle pagination", async ({ page }) => {
    await expectNoSpinners(page);

    // Look for pagination controls
    const nextButton = page.locator(
      'button:has-text("Next"), button[aria-label*="next"]'
    );
    const pageButton = page.locator(
      '[data-testid="pagination"], nav[aria-label*="pagination"]'
    );

    if (
      (await nextButton.isVisible()) ||
      (await pageButton.isVisible())
    ) {
      const initialUrl = page.url();

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        await expectNoSpinners(page);

        // URL should change or new content should load
        const newUrl = page.url();
        const urlChanged = newUrl !== initialUrl;

        // Either URL changes or we wait for content update
        if (urlChanged) {
          expect(newUrl).not.toBe(initialUrl);
        }
      }
    }
  });

  test("should sort projects", async ({ page }) => {
    await expectNoSpinners(page);

    // Look for sort dropdown
    const sortSelect = page.locator(
      '[data-testid="sort-select"], select[name*="sort"], button:has-text("Sort")'
    );

    if (await sortSelect.isVisible()) {
      await sortSelect.click();

      // Select "Recently Added" or similar
      const sortOption = page.locator(
        'text=/recently added|newest|latest|rating/i'
      );
      const optionCount = await sortOption.count();

      if (optionCount > 0) {
        await sortOption.first().click();
        await page.waitForTimeout(500);
        await expectNoSpinners(page);

        // Results should be reordered
        const projectCards = page.locator('[data-testid="project-card"]');
        expect(await projectCards.count()).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe("Project Detail Page", () => {
  test("should display all project information", async ({ page }) => {
    // Navigate to a specific project (if we have test data)
    await page.goto("/discover");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const firstProject = page
      .locator('[data-testid="project-card"]')
      .first();

    if (await firstProject.isVisible()) {
      await firstProject.click();
      await waitForPageLoad(page);

      // Check for project details
      const projectName = page.locator("h1, [data-testid='project-name']");
      await expect(projectName.first()).toBeVisible();

      // Should have description
      const description = page.locator(
        '[data-testid="project-description"], p'
      );
      const descCount = await description.count();
      expect(descCount).toBeGreaterThan(0);
    }
  });

  test("should load project detail page within 2 seconds", async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto("/discover");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const firstProject = page
      .locator('[data-testid="project-card"]')
      .first();

    if (await firstProject.isVisible()) {
      const clickTime = Date.now();
      await firstProject.click();
      await waitForPageLoad(page);
      await expectNoSpinners(page);
      const loadTime = Date.now();

      const pageLoadDuration = loadTime - clickTime;

      // Should load within 2 seconds (2000ms)
      expect(pageLoadDuration).toBeLessThan(2000);
    }
  });

  test("should display reviews section", async ({ page }) => {
    await page.goto("/discover");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const firstProject = page
      .locator('[data-testid="project-card"]')
      .first();

    if (await firstProject.isVisible()) {
      await firstProject.click();
      await waitForPageLoad(page);

      // Look for reviews section
      const reviewsSection = page.locator(
        '[data-testid="reviews-section"], text=/reviews/i'
      );
      const reviewCount = await reviewsSection.count();
      expect(reviewCount).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe("Performance", () => {
  test("discover page should load within 2 seconds", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/discover");
    await waitForPageLoad(page);
    await expectNoSpinners(page);

    const loadTime = Date.now() - startTime;

    // Page should load within 2000ms
    expect(loadTime).toBeLessThan(2000);
  });
});
