import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const docsRoot = join(process.cwd(), "..", "docs");

describe("ADR completeness (#385)", () => {
  const adrDir = join(docsRoot, "adr");
  const files = readdirSync(adrDir).filter(
    (name) => /^\d{4}-.+\.md$/.test(name) && name !== "0000-template.md",
  );

  it("includes the four required decision records", () => {
    expect(files.sort()).toEqual([
      "0001-context-hooks-pattern.md",
      "0002-ipfs-integration.md",
      "0003-contract-design.md",
      "0004-localstorage-persistence.md",
    ]);
  });

  it("uses the shared template sections", () => {
    const required = [
      "## Context",
      "## Decision",
      "## Consequences",
      "## Alternatives",
    ];
    for (const file of files) {
      const body = readFileSync(join(adrDir, file), "utf8");
      expect(body).toMatch(/^\s*# ADR /m);
      expect(body).toMatch(/\*\*Status:\*\*/);
      for (const heading of required) {
        expect(body.includes(heading), `${file} missing ${heading}`).toBe(true);
      }
    }
  });
});

describe("hooks guide (#387)", () => {
  const guide = readFileSync(join(docsRoot, "hooks-guide.md"), "utf8");

  it("documents the primary hooks with examples and troubleshooting", () => {
    for (const hook of [
      "useWallet",
      "useStellarAccount",
      "useDraft",
      "useWalletPageGate",
      "useSavedProjects",
      "useRecentViews",
      "useConfirm",
      "useUnsavedChanges",
      "useOnChainTransaction",
      "useDiscoverParams",
      "useProjectFilters",
      "useComparison",
    ]) {
      expect(guide).toContain(hook);
    }
    expect(guide).toContain("```tsx");
    expect(guide).toMatch(/## Troubleshooting/i);
  });
});
