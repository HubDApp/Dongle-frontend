import { test, expect } from "@playwright/test";
import { waitForPageLoad } from "../helpers/test-setup";

test.describe("Mobile responsive", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
  });

  test("mobile menu opens and closes", async ({ page }) => {
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.tap();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.tap();
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });

  test("menu toggle meets the 44px touch target size", async ({ page }) => {
    const box = await page.locator('button[aria-controls="mobile-menu"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("search input accepts typing on mobile", async ({ page }) => {
    await page.goto("/discover");
    await waitForPageLoad(page);
    const input = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();
    await input.tap();
    await input.fill("soroban");
    await expect(input).toHaveValue("soroban");
  });

  test("page has no horizontal overflow in landscape", async ({ page }) => {
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.height, height: size.width });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
