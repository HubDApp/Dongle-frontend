import { beforeEach, describe, expect, it } from "vitest";
import { getStoredItem, removeStoredItem, setStoredItem } from "@/lib/indexed-storage";

// jsdom has no IndexedDB, so these exercise the localStorage fallback path.
describe("indexed-storage fallback", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips values through localStorage when IndexedDB is unavailable", async () => {
    expect(await setStoredItem("k", { a: 1 })).toBe(true);
    expect(await getStoredItem("k")).toEqual({ a: 1 });
    await removeStoredItem("k");
    expect(await getStoredItem("k")).toBeNull();
  });

  it("reads existing localStorage data written before migration", async () => {
    localStorage.setItem("legacy", JSON.stringify(["x"]));
    expect(await getStoredItem("legacy")).toEqual(["x"]);
  });
});
