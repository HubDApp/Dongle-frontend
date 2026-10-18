import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { adminNotesService, ADMIN_NOTES_STORAGE_KEY } from "@/services/admin-notes";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

const ALICE = "GALICE";
const BOB = "GBOB";

let idCounter = 0;

describe("adminNotesService (#702)", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(() => `note-${++idCounter}`);
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
  });

  it("adds a note with author and timestamp, and rejects blank bodies", () => {
    const note = adminNotesService.add(ALICE, "project", "proj-1", "  Looks legit  ");
    expect(note).toMatchObject({ id: "note-1", author: ALICE, body: "Looks legit" });
    expect(Number.isNaN(Date.parse(note!.createdAt))).toBe(false);
    expect(adminNotesService.add(ALICE, "project", "proj-1", "   ")).toBeNull();
  });

  it("lists notes for one target only", () => {
    adminNotesService.add(ALICE, "project", "proj-1", "first");
    adminNotesService.add(BOB, "review", "proj-1", "other type");
    adminNotesService.add(BOB, "project", "proj-2", "other id");
    const notes = adminNotesService.listForTarget("project", "proj-1");
    expect(notes.map((n) => n.body)).toEqual(["first"]);
  });

  it("only lets the author edit or delete a note", () => {
    const note = adminNotesService.add(ALICE, "verification", "ver-1", "check docs")!;

    expect(adminNotesService.update(note.id, BOB, "hijack")).toBeNull();
    expect(adminNotesService.remove(note.id, BOB)).toBe(false);

    const edited = adminNotesService.update(note.id, ALICE, "docs checked");
    expect(edited?.body).toBe("docs checked");
    expect(edited?.updatedAt).toBeDefined();

    expect(adminNotesService.remove(note.id, ALICE)).toBe(true);
    expect(adminNotesService.listForTarget("verification", "ver-1")).toEqual([]);
  });

  it("searches bodies and target ids case-insensitively", () => {
    adminNotesService.add(ALICE, "project", "proj-1", "Possible SPAM ring");
    adminNotesService.add(BOB, "review", "rev-9", "fine");
    expect(adminNotesService.search("spam").map((n) => n.targetId)).toEqual(["proj-1"]);
    expect(adminNotesService.search("REV-9")).toHaveLength(1);
    expect(adminNotesService.search("  ")).toEqual([]);
  });

  it("skips corrupt stored records", () => {
    localStorage.setItem(
      ADMIN_NOTES_STORAGE_KEY,
      JSON.stringify([{ id: "x" }, { id: "y", author: ALICE, targetType: "bogus", targetId: "t", body: "b", createdAt: "2026-01-01" }]),
    );
    expect(adminNotesService.search("b")).toEqual([]);
  });
});
