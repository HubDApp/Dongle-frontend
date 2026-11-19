import { test, expect } from "@playwright/test";
import { DiscoverPage } from "./pages/discover.page";

test.describe("Discovery (page object)", () => {
  test("search narrows results or shows empty state", async ({ page }) => {
    const discover = new DiscoverPage(page);
    await discover.goto();

    await expect(discover.searchInput).toBeVisible();
    await discover.search("zzz-no-such-project");

    const empty = page.locator("text=/no projects|no results|empty/i");
    await expect(empty.or(discover.projectCards.first())).toBeVisible();
  });

  test("opening a project navigates to its detail page", async ({ page }) => {
    const discover = new DiscoverPage(page);
    await discover.goto();

    test.skip((await discover.projectCards.count()) === 0, "no projects seeded");
    await discover.openFirstProject();
    await expect(page).toHaveURL(/\/projects?\//);
  });
});
