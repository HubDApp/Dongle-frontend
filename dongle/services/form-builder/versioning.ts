/**
 * Form versioning — history, changelog, view, and revert.
 *
 * Historical versions stay immutable. Reverting creates a *new* version that
 * copies an older schema so past decisions / submissions keep their references.
 */

import type {
  FormChangelogEntry,
  FormSchemaSnapshot,
  FormVersionRecord,
  FormVersionStore,
} from "./types";

export const FORM_VERSION_STORAGE_PREFIX = "dongle_form_versions:";
export const FORM_VERSION_SCHEMA = 1;

function now(): number {
  return Date.now();
}

function storageKey(formId: string): string {
  return `${FORM_VERSION_STORAGE_PREFIX}${formId}`;
}

function emptyStore(formId: string): FormVersionStore {
  return {
    formId,
    versions: [],
    activeVersion: 0,
    updatedAt: now(),
  };
}

function readStore(formId: string): FormVersionStore {
  if (typeof window === "undefined") return emptyStore(formId);
  try {
    const raw = window.localStorage.getItem(storageKey(formId));
    if (!raw) return emptyStore(formId);
    const parsed = JSON.parse(raw) as FormVersionStore;
    if (!parsed || parsed.formId !== formId || !Array.isArray(parsed.versions)) {
      return emptyStore(formId);
    }
    return parsed;
  } catch {
    return emptyStore(formId);
  }
}

function writeStore(store: FormVersionStore): FormVersionStore {
  const next = { ...store, updatedAt: now() };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(store.formId), JSON.stringify(next));
    } catch {
      // Quota / private mode — still return in-memory result for this session.
    }
  }
  return next;
}

function cloneSchema(schema: FormSchemaSnapshot): FormSchemaSnapshot {
  return structuredClone(schema);
}

function markActive(versions: FormVersionRecord[], activeVersion: number): FormVersionRecord[] {
  return versions.map((v) => ({ ...v, isActive: v.version === activeVersion }));
}

/**
 * Publish a new schema version. Increments version number and appends a
 * changelog entry. Does not mutate prior version records.
 */
export function publishVersion(
  formId: string,
  schema: FormSchemaSnapshot,
  summary: string,
  options?: { author?: string; changedPaths?: string[] },
): FormVersionRecord {
  const store = readStore(formId);
  const nextVersion = store.versions.reduce((max, v) => Math.max(max, v.version), 0) + 1;
  const createdAt = now();
  const changelog: FormChangelogEntry = {
    version: nextVersion,
    summary,
    author: options?.author,
    createdAt,
    changedPaths: options?.changedPaths,
  };
  const record: FormVersionRecord = {
    version: nextVersion,
    schema: { ...cloneSchema(schema), formId },
    changelog,
    createdAt,
    isActive: true,
  };
  const versions = markActive([...store.versions, record], nextVersion);
  writeStore({
    formId,
    versions,
    activeVersion: nextVersion,
    updatedAt: createdAt,
  });
  return record;
}

/** Initialize a form with its first version if none exists yet. */
export function ensureInitialVersion(
  formId: string,
  schema: FormSchemaSnapshot,
  summary = "Initial form schema",
): FormVersionStore {
  const store = readStore(formId);
  if (store.versions.length > 0) return store;
  publishVersion(formId, schema, summary, { author: "system" });
  return getVersionStore(formId);
}

export function getVersionStore(formId: string): FormVersionStore {
  return readStore(formId);
}

export function listVersions(formId: string): FormVersionRecord[] {
  return [...readStore(formId).versions].sort((a, b) => b.version - a.version);
}

export function getVersion(formId: string, version: number): FormVersionRecord | null {
  return readStore(formId).versions.find((v) => v.version === version) ?? null;
}

export function getActiveVersion(formId: string): FormVersionRecord | null {
  const store = readStore(formId);
  return store.versions.find((v) => v.version === store.activeVersion) ?? null;
}

export function getChangelog(formId: string): FormChangelogEntry[] {
  return listVersions(formId).map((v) => v.changelog);
}

/**
 * Revert by publishing a *new* version that copies an older schema.
 * Historical versions and their timestamps remain unchanged.
 */
export function revertToVersion(
  formId: string,
  targetVersion: number,
  options?: { author?: string },
): FormVersionRecord {
  const target = getVersion(formId, targetVersion);
  if (!target) {
    throw new Error(`Form "${formId}" has no version ${targetVersion}`);
  }
  return publishVersion(
    formId,
    cloneSchema(target.schema),
    `Reverted to version ${targetVersion}`,
    {
      author: options?.author,
      changedPaths: ["*"],
    },
  );
}

/** Clear all stored versions for a form (tests / admin reset). */
export function clearVersions(formId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(formId));
  } catch {
    // ignore
  }
}
