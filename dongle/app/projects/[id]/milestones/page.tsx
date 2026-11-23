"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import ProjectMilestones from "@/components/projects/ProjectMilestones";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { projectService } from "@/services/project/project.service";

export default function ProjectMilestonesPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const projectId = params.id as string;
  const [project, setProject] = useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProject(projectService.getProjectById(projectId));
    setLoading(false);
  }, [projectId]);

  const canManage = Boolean(project && gate.publicKey && project.ownerAddress === gate.publicKey);

  return (
    <LayoutWrapper>
      <main className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
        <div className="container mx-auto max-w-4xl px-4">
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to project
          </button>
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : !project ? (
            <div className="py-20 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-zinc-400" aria-hidden="true" />
              <h1 className="text-xl font-semibold">Project not found</h1>
              <Button className="mt-5" onClick={() => router.push("/discover")}>Back to Discover</Button>
            </div>
          ) : (
            <>
              <header className="mb-8 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{project.name}</p>
                <h1 className="mt-1 text-2xl font-bold">Development milestones</h1>
                {!canManage && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Milestones are read-only. Only the project owner can manage them.</p>}
              </header>
              <ProjectMilestones projectId={projectId} canManage={canManage} manageMode />
            </>
          )}
        </div>
      </main>
    </LayoutWrapper>
  );
}