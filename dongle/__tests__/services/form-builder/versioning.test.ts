import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_FORM_ID,
  clearVersions,
  demoIntakeSchema,
  ensureInitialVersion,
  getActiveVersion,
  getChangelog,
  getVersion,
  listVersions,
  publishVersion,
  revertToVersion,
} from "@/services/form-builder";

beforeEach(() => {
  window.localStorage.clear();
  clearVersions(DEMO_FORM_ID);
});

describe("form versioning (#541)", () => {
  it("stores version history with timestamps and changelog", () => {
    ensureInitialVersion(DEMO_FORM_ID, demoIntakeSchema, "Initial schema");
    const v1 = getActiveVersion(DEMO_FORM_ID);
    expect(v1?.version).toBe(1);
    expect(v1?.createdAt).toBeTypeOf("number");
    expect(v1?.changelog.summary).toBe("Initial schema");

    const nextSchema = {
      ...demoIntakeSchema,
      description: { en: "Updated description", es: "Desc", pt: "Desc" },
    };
    publishVersion(DEMO_FORM_ID, nextSchema, "Updated description copy", {
      author: "kate",
      changedPaths: ["description"],
    });

    const versions = listVersions(DEMO_FORM_ID);
    expect(versions).toHaveLength(2);
    expect(versions[0]?.version).toBe(2);
    expect(versions[0]?.isActive).toBe(true);
    expect(versions[1]?.isActive).toBe(false);

    const changelog = getChangelog(DEMO_FORM_ID);
    expect(changelog.map((c) => c.summary)).toEqual([
      "Updated description copy",
      "Initial schema",
    ]);
    expect(changelog[0]?.author).toBe("kate");
    expect(changelog[0]?.createdAt).toBeTypeOf("number");
  });

  it("can view an old version without changing the active one", () => {
    ensureInitialVersion(DEMO_FORM_ID, demoIntakeSchema);
    publishVersion(
      DEMO_FORM_ID,
      {
        ...demoIntakeSchema,
        name: { en: "V2 name", es: "V2", pt: "V2" },
      },
      "Rename form",
    );

    const old = getVersion(DEMO_FORM_ID, 1);
    expect(old?.schema.name.en).toBe("Project Intake");
    expect(getActiveVersion(DEMO_FORM_ID)?.schema.name.en).toBe("V2 name");
  });

  it("reverts by publishing a new version that copies the old schema", () => {
    ensureInitialVersion(DEMO_FORM_ID, demoIntakeSchema);
    publishVersion(
      DEMO_FORM_ID,
      {
        ...demoIntakeSchema,
        name: { en: "Broken", es: "Broken", pt: "Broken" },
      },
      "Bad change",
    );

    const reverted = revertToVersion(DEMO_FORM_ID, 1, { author: "kate" });
    expect(reverted.version).toBe(3);
    expect(reverted.schema.name.en).toBe("Project Intake");
    expect(reverted.changelog.summary).toContain("Reverted to version 1");

    // Historical v1 and v2 remain intact
    expect(getVersion(DEMO_FORM_ID, 1)?.schema.name.en).toBe("Project Intake");
    expect(getVersion(DEMO_FORM_ID, 2)?.schema.name.en).toBe("Broken");
    expect(listVersions(DEMO_FORM_ID)).toHaveLength(3);
  });
});
