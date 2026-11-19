import { Page, Locator } from "@playwright/test";
import { waitForPageLoad } from "../helpers/test-setup";

export class DiscoverPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly projectCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();
    this.projectCards = page.locator(
      '[data-testid="project-card"], [data-testid*="project"]'
    );
  }

  async goto() {
    await this.page.goto("/discover");
    await waitForPageLoad(this.page);
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press("Enter");
  }

  async openFirstProject() {
    await this.projectCards.first().locator("a").first().click();
    await waitForPageLoad(this.page);
  }
}
