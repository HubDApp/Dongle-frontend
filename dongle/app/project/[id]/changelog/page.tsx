"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ScrollText } from "lucide-react";
import { toast } from "sonner";
import ChangelogView from "@/components/changelog/ChangelogView";
import { Button } from "@/components/ui/Button";
import { useProjectFollowing } from "@/hooks/useProjectFollowing";
import { buildChangelog } from "@/lib/changelog";
import { projectService } from "@/services/project/project.service";
import { updateService } from "@/services/update/update.service";

/**
 * Project changelog — /projects/[id]/changelog (issue #843).
 *
 * Version history built from the project's updates: newest first, filterable
 * by feature / bug fix / security / announcement, with semver badges, an RSS
 * feed, notification subscription (via project following) and Markdown export.
 */
export default function ProjectChangelogPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isFollowing, setFollowing } = useProjectFollowing(projectId);

  // Only the project's id and name are read here, which do not depend on the
  // browser-only owner/status overrides, so this is safe to compute on render.
  const project = useMemo(() => projectService.getProjectById(projectId), [projectId]);
  const entries = useMemo(
    () => (project ? buildChangelog(updateService.getUpdatesByProject(project.id)) : []),
    [project],
  );

  const toggleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const subscribed = await setFollowing(projectId, !isFollowing);
      toast.success(
        subscribed ? "Subscribed: you'll be notified of new changelog entries" : "Unsubscribed from changelog updates",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your subscription");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
      <div className="container mx-auto max-w-3xl px-4">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}`)}
          className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to project
        </button>
        {!project ? (
          <div className="py-20 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-zinc-400" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Project not found</h1>
            <Button className="mt-5" onClick={() => router.push("/discover")}>
              Back to Discover
            </Button>
          </div>
        ) : (
          <>
            <header className="mb-8 border-b border-zinc-200 pb-5 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{project.name}</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
                <ScrollText className="h-6 w-6 text-zinc-500" aria-hidden="true" />
                Changelog
              </h1>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Version history, fixes, security audits and announcements from the project team.
              </p>
            </header>
            <ChangelogView
              projectId={projectId}
              projectName={project.name}
              entries={entries}
              isSubscribed={isFollowing}
              isSubscribing={isSubscribing}
              onToggleSubscribe={() => void toggleSubscribe()}
            />
          </>
        )}
      </div>
    </div>
  );
}
