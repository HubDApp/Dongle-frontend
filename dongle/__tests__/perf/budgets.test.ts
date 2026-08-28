import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(relativePath, "utf8")) as T;
}

describe("performance budgets (#378)", () => {
  const budget = readJson<{
    routes: Record<string, { maxGzippedJsKb: number }>;
    lighthouse: {
      performance: number;
      accessibility: number;
      firstContentfulPaintMs: number;
      cumulativeLayoutShift: number;
    };
  }>("performance-budget.json");

  it("covers the critical routes with a 200 KB gzipped JS cap", () => {
    expect(Object.keys(budget.routes).sort()).toEqual(
      ["/", "/discover", "/projects/new"].sort(),
    );
    for (const route of Object.keys(budget.routes)) {
      expect(budget.routes[route].maxGzippedJsKb).toBe(200);
    }
  });

  it("sets Lighthouse category thresholds", () => {
    expect(budget.lighthouse.performance).toBe(90);
    expect(budget.lighthouse.accessibility).toBe(95);
  });

  it("sets FCP < 1.5s and CLS < 0.1", () => {
    expect(budget.lighthouse.firstContentfulPaintMs).toBe(1500);
    expect(budget.lighthouse.cumulativeLayoutShift).toBe(0.1);
  });
});

describe("Lighthouse CI config (#378)", () => {
  it("asserts the required metrics on critical pages", () => {
    const config = readJson<{
      ci: {
        collect: { url: string[] };
        assert: { assertions: Record<string, [string, Record<string, number>]> };
      };
    }>("lighthouserc.json");

    expect(config.ci.collect.url).toEqual([
      "http://127.0.0.1:3000/",
      "http://127.0.0.1:3000/discover",
      "http://127.0.0.1:3000/projects/new",
    ]);

    expect(config.ci.assert.assertions["categories:performance"]).toEqual([
      "error",
      { minScore: 0.9 },
    ]);
    expect(config.ci.assert.assertions["categories:accessibility"]).toEqual([
      "error",
      { minScore: 0.95 },
    ]);
    expect(config.ci.assert.assertions["first-contentful-paint"]).toEqual([
      "error",
      { maxNumericValue: 1500 },
    ]);
    expect(config.ci.assert.assertions["cumulative-layout-shift"]).toEqual([
      "error",
      { maxNumericValue: 0.1 },
    ]);
  });
});
