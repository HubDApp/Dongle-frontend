import { describe, expect, it } from "vitest";
import { validateProjectNameAvailability } from "@/lib/project-name-validation";
import type { Project } from "@/types/project";

const projects = [
  { id: "one", name: "Stellar Swap" },
  { id: "two", name: "Yield Vault" },
] as Project[];

describe("validateProjectNameAvailability", () => {
  it("matches names case-insensitively", () => {
    const result = validateProjectNameAvailability(" stellar swap ", projects);

    expect(result.available).toBe(false);
    expect(result.conflicts).toEqual([{ id: "one", name: "Stellar Swap" }]);
  });

  it("excludes the current project during edits", () => {
    const result = validateProjectNameAvailability("Stellar Swap", projects, "one");

    expect(result.available).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it("returns a validation error for empty names", () => {
    const result = validateProjectNameAvailability(" ", projects);

    expect(result.available).toBe(false);
    expect(result.error).toBe("Project name is required.");
  });
});
