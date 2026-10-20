"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Heart, X } from "lucide-react";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import WalletGate from "@/components/wallet/WalletGate";
import { Button } from "@/components/ui/Button";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useProjectFollowing } from "@/hooks/useProjectFollowing";
import { projectService } from "@/services/project/project.service";
import { toast } from "sonner";

export default function FollowingPage() {
  const router = useRouter();
  const gate = useWalletPageGate();
  const { projectIds, minReviewRating, isLoading, setFollowing, setMinReviewRating } = useProjectFollowing();
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const projects = useMemo(
    () => projectIds.map((id) => projectService.getProjectById(id)).filter((project) => project !== null),
    [projectIds],
  );

  const exportFollowing = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      reviewRatingThreshold: minReviewRating,
      projects: projects.map(({ id, name, primaryCategory, websiteUrl, createdAt }) => ({
        id,
        name,
        category: primaryCategory,
        websiteUrl,
        createdAt,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dongle-following.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateThreshold = async (rating: number) => {
    setIsSavingPreference(true);
    try {
      await setMinReviewRating(rating);
      toast.success("Review notification preference saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preference");
    } finally {
      setIsSavingPreference(false);
    }
  };

  const unfollow = async (projectId: string) => {
    try {
      await setFollowing(projectId, false);
      toast.success("Project unfollowed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unfollow project");
    }
  };

  if (gate.state !== "ready") {
    return (
      <LayoutWrapper>
        <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-32 dark:bg-zinc-950">
          <div className="mx-auto max-w-2xl">
            <WalletGate gate={gate} pagePurpose="Connect your wallet to manage followed projects." />
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-32 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <button type="button" onClick={() => router.push("/profile")} className="mb-3 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                Profile
              </button>
              <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">Following</h1>
              <p className="mt-1 text-sm text-zinc-500">{projects.length} projects</p>
            </div>
            <Button variant="outline" onClick={exportFollowing} disabled={projects.length === 0}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </header>

          <section className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-zinc-200 py-5 dark:border-zinc-800">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Review notifications</h2>
              <p className="mt-1 text-sm text-zinc-500">Notify me for reviews rated at least</p>
            </div>
            <select
              aria-label="Minimum review rating for notifications"
              value={minReviewRating}
              disabled={isSavingPreference}
              onChange={(event) => void updateThreshold(Number(event.target.value))}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating} stars</option>
              ))}
            </select>
          </section>

          {isLoading ? (
            <p className="py-12 text-center text-sm text-zinc-500">Loading followed projects...</p>
          ) : projects.length === 0 ? (
            <div className="border-y border-zinc-200 py-16 text-center dark:border-zinc-800">
              <Heart className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="font-medium text-zinc-900 dark:text-zinc-100">No followed projects</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/discover")}>
                Discover projects
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center gap-4 py-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <span className="block truncate font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</span>
                    <span className="mt-1 block text-sm text-zinc-500">{project.primaryCategory}</span>
                  </button>
                  <Button variant="outline" size="sm" onClick={() => void unfollow(project.id)} aria-label={`Unfollow ${project.name}`}>
                    <X className="h-4 w-4" />
                    Unfollow
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </LayoutWrapper>
  );
}