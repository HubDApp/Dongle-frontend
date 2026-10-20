import { expect, test } from "@playwright/test";

test("global command shortcut, keyboard execution and focus restoration", async ({ page }) => {
  await page.goto("/reviews");
  const opener = page.getByRole("button", { name: /Quick actions/ });
  await opener.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Quick actions" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search projects, pages and actions" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await page.keyboard.press("Meta+k");
  await page.getByRole("combobox", { name: "Search projects, pages and actions" }).fill("Compare projects");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/compare$/);
});

test("rating ranges survive reload and Back/Forward while preserving unrelated URL state", async ({ page }) => {
  await page.goto("/reviews?reviewRating=4-5&lang=es");
  const rating = page.getByRole("combobox", { name: "Filter reviews by rating" });
  await expect(rating).toHaveValue("4-5");
  await rating.selectOption("1-2");
  await expect(page).toHaveURL(/reviewRating=1-2/);
  await page.reload(); await expect(rating).toHaveValue("1-2");
  await rating.selectOption("5");
  await page.goBack(); await expect(rating).toHaveValue("1-2");
  await page.goForward(); await expect(rating).toHaveValue("5");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(rating).toHaveValue("all");
  expect(new URL(page.url()).searchParams.has("reviewRating")).toBe(false);
  expect(new URL(page.url()).searchParams.get("lang")).toBe("es");
});
