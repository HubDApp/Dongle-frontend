import type { Project } from "@/types/project";

export type CuratedListVisibility = "public" | "unlisted" | "private";

export interface CuratedListComment {
  id: string;
  authorAddress: string;
  body: string;
  createdAt: string;
}

export interface CuratedProjectList {
  id: string;
  title: string;
  description: string;
  projectIds: string[];
  visibility: CuratedListVisibility;
  ownerAddress: string;
  editorAddresses: string[];
  followers: string[];
  comments: CuratedListComment[];
  createdAt: string;
  updatedAt: string;
}

export type CuratedProjectListInput = Pick<
  CuratedProjectList,
  "title" | "description" | "projectIds" | "visibility" | "editorAddresses"
>;

export function canViewCuratedList(
  list: CuratedProjectList,
  viewerAddress?: string | null,
): boolean {
  return list.visibility !== "private" ||
    list.ownerAddress === viewerAddress ||
    list.editorAddresses.includes(viewerAddress ?? "");
}

export function canEditCuratedList(
  list: CuratedProjectList,
  actorAddress?: string | null,
): boolean {
  return Boolean(actorAddress) && (
    list.ownerAddress === actorAddress || list.editorAddresses.includes(actorAddress!)
  );
}

export function resolveListProjects(
  list: CuratedProjectList,
  projects: Project[],
): Project[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return list.projectIds
    .map((id) => byId.get(id))
    .filter((project): project is Project => Boolean(project));
}