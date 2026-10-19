import { getIpfsGatewayUrls, logGatewayFailure } from "@/lib/ipfs-gateway";
import {
  isProjectRoadmap,
  type ProjectRoadmap,
  type RoadmapMilestone,
} from "@/types/roadmap";

export async function uploadProjectRoadmap(roadmap: ProjectRoadmap): Promise<string> {
  const response = await fetch("/api/roadmaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roadmap),
  });
  const data = (await response.json()) as { cid?: string; error?: string };

  if (!response.ok || !data.cid) {
    throw new Error(data.error ?? "Could not store the project roadmap.");
  }

  return data.cid;
}

export async function fetchProjectRoadmap(cid: string): Promise<ProjectRoadmap> {
  const urls = getIpfsGatewayUrls(`ipfs://${cid}`);

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        logGatewayFailure(url, new Error(`HTTP ${response.status}`));
        continue;
      }

      const roadmap: unknown = await response.json();
      if (isProjectRoadmap(roadmap)) return roadmap;
      logGatewayFailure(url, new Error("Invalid roadmap content"));
    } catch (error) {
      logGatewayFailure(url, error);
    }
  }

  throw new Error("Roadmap is currently unavailable from IPFS gateways.");
}

export function getMilestoneStatusChanges(
  previous: RoadmapMilestone[] = [],
  next: RoadmapMilestone[] = [],
): Array<{ title: string; previousStatus: string; status: string }> {
  return next.flatMap((milestone, index) => {
    const oldMilestone =
      previous.find((candidate) => candidate.title === milestone.title) ?? previous[index];
    if (!oldMilestone || oldMilestone.status === milestone.status) return [];

    return [{
      title: milestone.title,
      previousStatus: oldMilestone.status,
      status: milestone.status,
    }];
  });
}
