import { describe, expect, it } from "vitest";
import { canEditCuratedList, canViewCuratedList } from "@/types/curated-list";
import type { CuratedProjectList } from "@/types/curated-list";

const list: CuratedProjectList = {
  id: "list-1",
  title: "Private list",
  description: "",
  projectIds: ["project-1"],
  visibility: "private",
  ownerAddress: "GOWNER",
  editorAddresses: ["GEDITOR"],
  followers: [],
  comments: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("curated list permissions", () => {
  it("only exposes private lists to their owner and editors", () => {
    expect(canViewCuratedList(list, "GOWNER")).toBe(true);
    expect(canViewCuratedList(list, "GEDITOR")).toBe(true);
    expect(canViewCuratedList(list, "GOTHER")).toBe(false);
  });

  it("allows editors to edit but does not let them manage ownership", () => {
    expect(canEditCuratedList(list, "GEDITOR")).toBe(true);
    expect(canEditCuratedList(list, "GOTHER")).toBe(false);
  });

  it("allows direct viewing of public and unlisted lists", () => {
    expect(canViewCuratedList({ ...list, visibility: "public" }, null)).toBe(true);
    expect(canViewCuratedList({ ...list, visibility: "unlisted" }, null)).toBe(true);
  });
});