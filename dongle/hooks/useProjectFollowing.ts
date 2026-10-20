"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/context/wallet.context";
import { useAuth } from "@/context/auth.context";

interface FollowingResponse {
  projectIds: string[];
  minReviewRating: number;
  followerCount: number;
  isFollowing: boolean;
}

async function readResponse(response: Response): Promise<FollowingResponse> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Could not load followed projects");
  }
  return body as FollowingResponse;
}

export function useProjectFollowing(projectId?: string) {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const recipient = user?.id ?? publicKey;
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [minReviewRating, setMinReviewRatingState] = useState(4);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (recipient) {
      await fetch("/api/notifications/identify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient }),
      });
    }
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const response = await fetch(`/api/projects/following${query}`, { credentials: "include" });
    const data = await readResponse(response);
    setProjectIds(data.projectIds);
    setMinReviewRatingState(data.minReviewRating);
    setFollowerCount(data.followerCount);
    return data;
  }, [projectId, recipient]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void refresh()
      .catch((error: unknown) => {
        if (active) console.error("[project-following] failed to load", error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const setFollowing = useCallback(
    async (targetProjectId: string, shouldFollow: boolean) => {
      if (!recipient) throw new Error("Connect your wallet to follow projects");
      const response = await fetch("/api/projects/following", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          action: shouldFollow ? "follow" : "unfollow",
        }),
      });
      const data = await readResponse(response);
      setProjectIds(data.projectIds);
      if (projectId === targetProjectId) setFollowerCount(data.followerCount);
      return data.isFollowing;
    },
    [projectId, recipient],
  );

  const setMinReviewRating = useCallback(async (rating: number) => {
    const response = await fetch("/api/projects/following", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minReviewRating: rating }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(typeof body.error === "string" ? body.error : "Could not save review preference");
    }
    setMinReviewRatingState(body.minReviewRating as number);
  }, []);

  return {
    projectIds,
    minReviewRating,
    followerCount,
    isFollowing: projectId ? projectIds.includes(projectId) : false,
    isLoading,
    refresh,
    setFollowing,
    setMinReviewRating,
  };
}