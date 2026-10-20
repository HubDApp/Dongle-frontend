/**
 * Admin Notes Service (#702)
 *
 * Internal notes admins leave on projects, reviews and verifications. Notes are
 * admin-only: nothing here is exposed to the public project/review pages.
 * Persisted to localStorage, same pattern as audit-log.service.ts.
 *
 * Rules enforced here:
 * - Only a note's author can edit or delete it.
 * - Corrupt or partial records are skipped during hydration (never throw).
 */

import { generateId } from "@/lib/id-generator";

export const ADMIN_NOTES_STORAGE_KEY = "dongle_admin_notes";

export type AdminNoteTarget = "project" | "review" | "verification";

export interface AdminNote {
  id: string;
  /** Stellar G… public key of the admin who wrote the note. */
  author: string;
  targetType: AdminNoteTarget;
  targetId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

const VALID_TARGETS: ReadonlySet<string> = new Set(["project", "review", "verification"]);

function loadNotes(): AdminNote[] {
  if (typeof window === "undefined") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(localStorage.getItem(ADMIN_NOTES_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((item): item is AdminNote => {
    if (!item || typeof item !== "object") return false;
    const r = item as Record<string, unknown>;
    return (
      typeof r.id === "string" && !!r.id &&
      typeof r.author === "string" && !!r.author &&
      typeof r.targetType === "string" && VALID_TARGETS.has(r.targetType) &&
      typeof r.targetId === "string" && !!r.targetId &&
      typeof r.body === "string" &&
      typeof r.createdAt === "string" && !!r.createdAt
    );
  });
}

function saveNotes(notes: AdminNote[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

const byNewest = (a: AdminNote, b: AdminNote) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const adminNotesService = {
  /** Add a note. Returns null when the body is blank. */
  add(author: string, targetType: AdminNoteTarget, targetId: string, body: string): AdminNote | null {
    const trimmed = body.trim();
    if (!trimmed) return null;
    const note: AdminNote = {
      id: generateId(),
      author,
      targetType,
      targetId,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    saveNotes([...loadNotes(), note]);
    return note;
  },

  /** Edit a note's body. Returns null unless `author` wrote it and the body is non-blank. */
  update(id: string, author: string, body: string): AdminNote | null {
    const trimmed = body.trim();
    const notes = loadNotes();
    const note = notes.find((n) => n.id === id);
    if (!note || note.author !== author || !trimmed) return null;
    const updated = { ...note, body: trimmed, updatedAt: new Date().toISOString() };
    saveNotes(notes.map((n) => (n.id === id ? updated : n)));
    return updated;
  },

  /** Delete a note. Returns false unless `author` wrote it. */
  remove(id: string, author: string): boolean {
    const notes = loadNotes();
    const note = notes.find((n) => n.id === id);
    if (!note || note.author !== author) return false;
    saveNotes(notes.filter((n) => n.id !== id));
    return true;
  },

  /** Notes on one project/review/verification, newest first. */
  listForTarget(targetType: AdminNoteTarget, targetId: string): AdminNote[] {
    return loadNotes()
      .filter((n) => n.targetType === targetType && n.targetId === targetId)
      .sort(byNewest);
  },

  /** Case-insensitive search over note bodies and target ids, for the audit log viewer. */
  search(query: string): AdminNote[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return loadNotes()
      .filter((n) => n.body.toLowerCase().includes(q) || n.targetId.toLowerCase().includes(q))
      .sort(byNewest);
  },
};
