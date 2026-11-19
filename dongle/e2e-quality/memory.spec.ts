import { test, expect, type Page, type CDPSession } from "@playwright/test";

const ITERATIONS = 100;
const MAX_GROWTH = 0.2;

async function heapUsed(cdp: CDPSession): Promise<number> {
  await cdp.send("HeapProfiler.collectGarbage");
  const { usedSize } = await cdp.send("Runtime.getHeapUsage");
  return usedSize;
}

async function interact(page: Page, i: number) {
  const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i)).first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill(i % 2 === 0 ? "stellar" : "");
  }
  if (i % 10 === 0) {
    await page.goto("/");
    await page.goto("/discover");
  }
}

test("discover page heap stays bounded over repeated search, filter and navigation", async ({ page }, testInfo) => {
  test.setTimeout(10 * 60_000);
  const cdp = await page.context().newCDPSession(page);
  await page.goto("/discover");
  await page.waitForLoadState("networkidle");

  // Warm up once so lazy chunks and caches are loaded before the baseline.
  await interact(page, 1);
  const before = await heapUsed(cdp);

  for (let i = 0; i < ITERATIONS; i++) {
    await interact(page, i);
  }
  const after = await heapUsed(cdp);
  const growth = (after - before) / before;

  await testInfo.attach("heap.json", {
    body: JSON.stringify({ before, after, growth, iterations: ITERATIONS }, null, 2),
    contentType: "application/json",
  });

  expect(growth, `heap grew ${(growth * 100).toFixed(1)}% (${before} -> ${after} bytes)`).toBeLessThan(MAX_GROWTH);
});
