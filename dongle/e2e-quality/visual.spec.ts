import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "discover", path: "/discover" },
];

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const SCHEMES = ["light", "dark"] as const;

for (const pg of PAGES) {
  for (const bp of BREAKPOINTS) {
    for (const scheme of SCHEMES) {
      test(`${pg.name} ${bp.name} ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(pg.path);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`${pg.name}-${bp.name}-${scheme}.png`, {
          fullPage: false,
        });
      });
    }
  }
}
