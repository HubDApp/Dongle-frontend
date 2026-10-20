import type {
  CuratedListComment,
  CuratedProjectList,
  CuratedProjectListInput,
} from "@/types/curated-list";
import { canEditCuratedList, canViewCuratedList } from "@/types/curated-list";
import { submissionSigningService } from "@/services/submission-signing";

const STORAGE_KEY = "dongle_curated_project_lists";
let remoteStorageAvailable: boolean | null = null;

function readLocalLists(): CuratedProjectList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is CuratedProjectList =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.ownerAddress === "string" &&
      Array.isArray(item.projectIds) &&
      Array.isArray(item.editorAddresses) &&
      Array.isArray(item.followers) &&
      Array.isArray(item.comments),
    );
  } catch {
    return [];
  }
}

function writeLocalLists(lists: CuratedProjectList[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = new URL(path, window.location.origin);
    let body: Record<string, unknown> | undefined;
    if (init?.body) body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const actorAddress = typeof body?.ownerAddress === "string"
      ? body.ownerAddress
      : typeof body?.actorAddress === "string"
        ? body.actorAddress
        : url.searchParams.get("viewer");

    if (actorAddress) {
      if (remoteStorageAvailable === null) {
        const probe = await fetch("/api/lists", { method: "HEAD" });
        remoteStorageAvailable = probe.ok;
      }
      if (!remoteStorageAvailable) return null;

      const signed = await submissionSigningService.signPayload({
        action: `${method}:${url.pathname}`,
        data: body ?? { viewer: actorAddress },
      }, actorAddress);
      if (method === "GET") {
        url.searchParams.set("auth", JSON.stringify(signed));
      } else {
        body = { ...body, signedPayload: signed };
        init = { ...init, body: JSON.stringify(body) };
      }
    }

    const requestPath = method === "GET" && actorAddress
      ? `${url.pathname}${url.search}`
      : path;
    const response = await fetch(requestPath, {
      ...init,
      method,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    if (response.status === 503) return null;
    if (!response.ok) {
      if (response.status === 404) return null;
      const result = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(result?.error ?? "Could not save curated list.");
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function validateInput(input: CuratedProjectListInput): string | null {
  if (!input.title.trim()) return "Add a title for your list.";
  if (input.title.trim().length > 100) return "Titles must be 100 characters or fewer.";
  if (input.description.length > 2000) return "Descriptions must be 2,000 characters or fewer.";
  if (input.projectIds.length === 0) return "Add at least one project to your list.";
  if (!new Set(["public", "unlisted", "private"]).has(input.visibility)) {
    return "Choose a valid visibility setting.";
  }
  return null;
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const curatedListService = {
  async getLists(viewerAddress?: string | null): Promise<CuratedProjectList[]> {
    const remote = await apiRequest<CuratedProjectList[]>("/api/lists");
    if (remote) return remote;
    return readLocalLists().filter((list) =>
      list.visibility === "public" || list.ownerAddress === viewerAddress,
    );
  },

  async getList(id: string, viewerAddress?: string | null): Promise<CuratedProjectList | null> {
    const path = `/api/lists/${encodeURIComponent(id)}`;
    const publicRemote = await apiRequest<CuratedProjectList>(path);
    if (publicRemote) return publicRemote;
    const remote = viewerAddress
      ? await apiRequest<CuratedProjectList>(`${path}?viewer=${encodeURIComponent(viewerAddress)}`)
      : null;
    if (remote) return remote;
    const list = readLocalLists().find((item) => item.id === id) ?? null;
    return list && canViewCuratedList(list, viewerAddress) ? list : null;
  },

  async create(input: CuratedProjectListInput, ownerAddress: string): Promise<CuratedProjectList> {
    const validationError = validateInput(input);
    if (validationError) throw new Error(validationError);
    if (!ownerAddress) throw new Error("Connect your wallet to create a list.");

    const normalized: CuratedProjectListInput = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      projectIds: [...new Set(input.projectIds)],
      editorAddresses: [...new Set(input.editorAddresses.map((address) => address.trim()).filter(Boolean))],
    };
    const remote = await apiRequest<CuratedProjectList>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ ...normalized, ownerAddress }),
    });
    if (remote) return remote;

    const now = new Date().toISOString();
    const list: CuratedProjectList = {
      ...normalized,
      id: createId(),
      ownerAddress,
      followers: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    writeLocalLists([list, ...readLocalLists()]);
    return list;
  },

  async update(
    id: string,
    actorAddress: string,
    changes: CuratedProjectListInput,
  ): Promise<CuratedProjectList> {
    const validationError = validateInput(changes);
    if (validationError) throw new Error(validationError);
    const normalized = {
      ...changes,
      title: changes.title.trim(),
      description: changes.description.trim(),
      projectIds: [...new Set(changes.projectIds)],
      editorAddresses: [...new Set(changes.editorAddresses.map((address) => address.trim()).filter(Boolean))],
    };
    const remote = await apiRequest<CuratedProjectList>(`/api/lists/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ actorAddress, changes: normalized }),
    });
    if (remote) return remote;

    const lists = readLocalLists();
    const index = lists.findIndex((list) => list.id === id);
    if (index < 0) throw new Error("List not found.");
    if (!canEditCuratedList(lists[index], actorAddress)) throw new Error("You cannot edit this list.");
    lists[index] = { ...lists[index], ...normalized, updatedAt: new Date().toISOString() };
    writeLocalLists(lists);
    return lists[index];
  },

  async follow(id: string, actorAddress: string): Promise<CuratedProjectList> {
    return this.mutate(id, actorAddress, { action: "follow" }, (list) => ({
      ...list,
      followers: list.followers.includes(actorAddress)
        ? list.followers.filter((follower) => follower !== actorAddress)
        : [...list.followers, actorAddress],
    }));
  },

  async comment(id: string, actorAddress: string, body: string): Promise<CuratedProjectList> {
    const text = body.trim();
    if (!text) throw new Error("Write a comment before posting.");
    if (text.length > 1000) throw new Error("Comments must be 1,000 characters or fewer.");
    return this.mutate(id, actorAddress, { action: "comment", body: text }, (list) => {
      const comment: CuratedListComment = {
        id: createId(),
        authorAddress: actorAddress,
        body: text,
        createdAt: new Date().toISOString(),
      };
      return { ...list, comments: [...list.comments, comment] };
    });
  },

  async fork(id: string, actorAddress: string, title?: string): Promise<CuratedProjectList> {
    const source = await this.getList(id, actorAddress);
    if (!source) throw new Error("List not found or not visible to you.");
    return this.create({
      title: title?.trim() || `${source.title} (fork)`,
      description: source.description,
      projectIds: [...source.projectIds],
      visibility: "public",
      editorAddresses: [],
    }, actorAddress);
  },

  async getFeatured(limit = 4): Promise<CuratedProjectList[]> {
    return (await this.getLists())
      .filter((list) => list.visibility === "public")
      .sort((a, b) => b.followers.length - a.followers.length || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  },

  async mutate(
    id: string,
    actorAddress: string,
    operation: { action: "follow" } | { action: "comment"; body: string },
    transform: (list: CuratedProjectList) => CuratedProjectList,
  ): Promise<CuratedProjectList> {
    const remote = await apiRequest<CuratedProjectList>(`/api/lists/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ actorAddress, ...operation }),
    });
    if (remote) return remote;

    const lists = readLocalLists();
    const index = lists.findIndex((list) => list.id === id);
    if (index < 0) throw new Error("List not found.");
    if (!canViewCuratedList(lists[index], actorAddress)) throw new Error("You cannot access this list.");
    lists[index] = { ...transform(lists[index]), updatedAt: new Date().toISOString() };
    writeLocalLists(lists);
    return lists[index];
  },
};