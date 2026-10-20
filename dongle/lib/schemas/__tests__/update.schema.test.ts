import { describe, it, expect } from "vitest";
import { updateFormSchema, UPDATE_CONSTRAINTS } from "../update.schema";
import { UPDATE_TYPES } from "@/types/update";

describe("updateFormSchema", () => {
  describe("title validation", () => {
    it("should accept valid titles", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "New Feature Released",
        content: "We are excited to announce a new feature that improves performance.",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("New Feature Released");
      }
    });

    it("should trim whitespace from title", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "  Trimmed Title  ",
        content: "This title should be trimmed of whitespace automatically.",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Trimmed Title");
      }
    });

    it("should reject empty title", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "",
        content: "Content is valid but title is empty and should fail.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least");
      }
    });

    it("should enforce minimum length", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "",
        content: "Testing minimum length validation for the title field.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("title");
      }
    });

    it("should enforce maximum length of 100 characters", () => {
      const longTitle = "a".repeat(UPDATE_CONSTRAINTS.TITLE_MAX_LENGTH + 1);
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: longTitle,
        content: "Testing maximum length validation for titles.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("100 characters");
      }
    });

    it("should accept title at exactly 100 characters", () => {
      const maxTitle = "a".repeat(UPDATE_CONSTRAINTS.TITLE_MAX_LENGTH);
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: maxTitle,
        content: "Testing that exactly 100 characters is valid.",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("content validation", () => {
    it("should accept valid content", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "This is a valid content description with sufficient length.",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(
          "This is a valid content description with sufficient length."
        );
      }
    });

    it("should trim whitespace from content", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "  Valid content with whitespace padding on both ends.  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(
          "Valid content with whitespace padding on both ends."
        );
      }
    });

    it("should enforce minimum length of 20 characters", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "Too short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 20");
      }
    });

    it("should accept content at exactly 20 characters", () => {
      const minContent = "a".repeat(UPDATE_CONSTRAINTS.CONTENT_MIN_LENGTH);
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: minContent,
      });

      expect(result.success).toBe(true);
    });

    it("should enforce maximum length", () => {
      const longContent = "a".repeat(
        UPDATE_CONSTRAINTS.CONTENT_MAX_LENGTH + 1
      );
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: longContent,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed");
      }
    });

    it("should reject empty content", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("content");
      }
    });
  });

  describe("link validation", () => {
    it("should accept valid URLs", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update with Link",
        content: "Check out our documentation for more details about this update.",
        link: "https://example.com/docs",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link).toBe("https://example.com/docs");
      }
    });

    it("should accept empty string for optional link", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "Update without a link is perfectly valid.",
        link: "",
      });

      expect(result.success).toBe(true);
    });

    it("should accept undefined link", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "Update without any link field provided.",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "Testing invalid URL validation for the link field.",
        link: "not-a-valid-url",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid URL");
      }
    });

    it("should accept various URL protocols", () => {
      const protocols = [
        "https://example.com",
        "http://example.com",
        "ftp://files.example.com",
      ];

      protocols.forEach((url) => {
        const result = updateFormSchema.safeParse({
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Update",
          content: "Testing URL protocol validation for links.",
          link: url,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("type validation", () => {
    it("should accept all valid update types", () => {
      const types = [
        UPDATE_TYPES.ANNOUNCEMENT,
        UPDATE_TYPES.RELEASE,
        UPDATE_TYPES.MILESTONE,
        UPDATE_TYPES.AUDIT,
      ];

      types.forEach((type) => {
        const result = updateFormSchema.safeParse({
          type,
          title: "Update",
          content: "Testing all valid update types.",
          ...(type === UPDATE_TYPES.RELEASE ? { version: "v1.0.0" } : {}),
        });

        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid update type", () => {
      const result = updateFormSchema.safeParse({
        type: "INVALID_TYPE",
        title: "Update",
        content: "Testing invalid update type validation.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid");
      }
    });
  });

  describe("version validation for RELEASE type", () => {
    it("should require version for RELEASE type", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Version 1.0.0 Release",
        content: "We are releasing version 1.0.0 with exciting new features.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Version is required");
        expect(result.error.issues[0].path).toContain("version");
      }
    });

    it("should accept version for RELEASE type", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Version 2.1.0 Release",
        content: "Version 2.1.0 includes bug fixes and performance improvements.",
        version: "v2.1.0",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe("v2.1.0");
      }
    });

    it("should trim whitespace from version", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Release",
        content: "Testing version whitespace trimming functionality.",
        version: "  v1.0.0  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe("v1.0.0");
      }
    });

    it("should not require version for non-RELEASE types", () => {
      const types = [
        UPDATE_TYPES.ANNOUNCEMENT,
        UPDATE_TYPES.MILESTONE,
        UPDATE_TYPES.AUDIT,
      ];

      types.forEach((type) => {
        const result = updateFormSchema.safeParse({
          type,
          title: "Update",
          content: "Version should not be required for non-release types.",
        });

        expect(result.success).toBe(true);
      });
    });

    it("should accept optional version for non-RELEASE types", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Update",
        content: "Version is optional for announcements but can be provided.",
        version: "1.0.0",
      });

      expect(result.success).toBe(true);
    });

    it("should enforce maximum version length", () => {
      const longVersion = "v".repeat(UPDATE_CONSTRAINTS.VERSION_MAX_LENGTH + 1);
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Release",
        content: "Testing maximum version length validation.",
        version: longVersion,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("50 characters");
      }
    });

    it("should reject empty version for RELEASE type", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Release",
        content: "Empty version should fail validation for releases.",
        version: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("version");
      }
    });
  });

  describe("complete form validation", () => {
    it("should validate complete RELEASE update", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.RELEASE,
        title: "Major Release v3.0.0",
        content:
          "We're excited to announce version 3.0.0 with breaking changes and new features.",
        version: "v3.0.0",
        link: "https://github.com/example/project/releases/v3.0.0",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          type: UPDATE_TYPES.RELEASE,
          title: "Major Release v3.0.0",
          version: "v3.0.0",
          link: "https://github.com/example/project/releases/v3.0.0",
        });
      }
    });

    it("should validate complete ANNOUNCEMENT update", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.ANNOUNCEMENT,
        title: "Important Announcement",
        content:
          "We have an important announcement regarding upcoming changes to the platform.",
        link: "https://blog.example.com/announcement",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(UPDATE_TYPES.ANNOUNCEMENT);
        expect(result.data.title).toBe("Important Announcement");
      }
    });

    it("should validate SECURITY update without version", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.AUDIT,
        title: "Security Patch Applied",
        content:
          "A critical security vulnerability has been patched. Please update immediately.",
      });

      expect(result.success).toBe(true);
    });

    it("should validate MAINTENANCE update", () => {
      const result = updateFormSchema.safeParse({
        type: UPDATE_TYPES.MILESTONE,
        title: "Scheduled Maintenance",
        content:
          "The platform will undergo scheduled maintenance this weekend for upgrades.",
        link: "https://status.example.com",
      });

      expect(result.success).toBe(true);
    });
  });
});
