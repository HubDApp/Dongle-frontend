import { describe, it, expect, beforeEach } from "vitest";
import { updateService } from "@/services/update/update.service";
import { UPDATE_TYPES } from "@/types/update";

describe("UpdateService", () => {
  const mockProjectId = "project-1";
  const mockAuthorAddress = "GTEST123";

  beforeEach(() => {
    // Reset the service state between tests
    (updateService as any).updates = [];
  });

  describe("addUpdate", () => {
    it("should add a new update", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Test Update",
          content: "This is a test update",
        },
        mockAuthorAddress
      );

      expect(update).toBeDefined();
      expect(update.id).toBeDefined();
      expect(update.projectId).toBe(mockProjectId);
      expect(update.title).toBe("Test Update");
      expect(update.authorAddress).toBe(mockAuthorAddress);
      expect(update.publishedAt).toBeDefined();
    });

    it("should add a release with version", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.RELEASE,
          title: "v1.0.0 Release",
          content: "New features and improvements",
          version: "v1.0.0",
        },
        mockAuthorAddress
      );

      expect(update.version).toBe("v1.0.0");
    });
  });

  describe("getUpdatesByProject", () => {
    it("should return updates for a specific project", () => {
      updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Update 1",
          content: "Content 1",
        },
        mockAuthorAddress
      );

      updateService.addUpdate(
        {
          projectId: "project-2",
          type: UPDATE_TYPES.MILESTONE,
          title: "Update 2",
          content: "Content 2",
        },
        mockAuthorAddress
      );

      const updates = updateService.getUpdatesByProject(mockProjectId);
      expect(updates).toHaveLength(1);
      expect(updates[0].projectId).toBe(mockProjectId);
    });

    it("should return updates sorted by date (newest first)", () => {
      const first = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "First",
          content: "Content",
        },
        mockAuthorAddress
      );

      // Simulate time passing
      setTimeout(() => {
        const second = updateService.addUpdate(
          {
            projectId: mockProjectId,
            type: UPDATE_TYPES.ANNOUNCEMENT,
            title: "Second",
            content: "Content",
          },
          mockAuthorAddress
        );

        const updates = updateService.getUpdatesByProject(mockProjectId);
        expect(updates[0].id).toBe(second.id);
        expect(updates[1].id).toBe(first.id);
      }, 10);
    });
  });

  describe("updateUpdate", () => {
    it("should update an existing update", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Original",
          content: "Original content",
        },
        mockAuthorAddress
      );

      const updated = updateService.updateUpdate(
        update.id,
        { title: "Updated", content: "Updated content" },
        mockAuthorAddress
      );

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("Updated");
      expect(updated?.content).toBe("Updated content");
    });

    it("should not allow unauthorized users to update", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Test",
          content: "Content",
        },
        mockAuthorAddress
      );

      expect(() => {
        updateService.updateUpdate(
          update.id,
          { title: "Hacked" },
          "DIFFERENT_USER"
        );
      }).toThrow("Unauthorized");
    });
  });

  describe("deleteUpdate", () => {
    it("should delete an update", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Test",
          content: "Content",
        },
        mockAuthorAddress
      );

      const result = updateService.deleteUpdate(update.id, mockAuthorAddress);
      expect(result).toBe(true);

      const updates = updateService.getUpdatesByProject(mockProjectId);
      expect(updates).toHaveLength(0);
    });

    it("should not allow unauthorized users to delete", () => {
      const update = updateService.addUpdate(
        {
          projectId: mockProjectId,
          type: UPDATE_TYPES.ANNOUNCEMENT,
          title: "Test",
          content: "Content",
        },
        mockAuthorAddress
      );

      expect(() => {
        updateService.deleteUpdate(update.id, "DIFFERENT_USER");
      }).toThrow("Unauthorized");
    });
  });

  describe("canManageUpdates", () => {
    it("should return true for project owner", () => {
      const result = updateService.canManageUpdates(
        mockAuthorAddress,
        mockAuthorAddress
      );
      expect(result).toBe(true);
    });

    it("should return false for non-owner", () => {
      const result = updateService.canManageUpdates(
        mockAuthorAddress,
        "DIFFERENT_USER"
      );
      expect(result).toBe(false);
    });
  });
});
