const STORAGE_KEY_OWNER_OVERRIDES = "dongle_project_owner_overrides";

export const projectOwnerService = {
  getProjectOwnerOverride(projectId: string): string | undefined {
    if (typeof window === "undefined") return undefined;

    const stored = localStorage.getItem(STORAGE_KEY_OWNER_OVERRIDES);
    if (!stored) return undefined;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return undefined;
    }

    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    const overrides = parsed as Record<string, unknown>;
    const override = overrides[projectId];
    return typeof override === "string" && override.trim() ? override : undefined;
  },

  setProjectOwnerOverride(projectId: string, ownerAddress: string | null | undefined): void {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY_OWNER_OVERRIDES);
    let overrides: Record<string, string> = {};

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          overrides = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(
              ([, value]) => typeof value === "string" && Boolean(value)
            )
          ) as Record<string, string>;
        }
      } catch {
        overrides = {};
      }
    }

    if (!ownerAddress || !ownerAddress.trim()) {
      delete overrides[projectId];
    } else {
      overrides[projectId] = ownerAddress;
    }

    localStorage.setItem(STORAGE_KEY_OWNER_OVERRIDES, JSON.stringify(overrides));
  },
};
