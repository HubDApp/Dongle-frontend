"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { updateService } from "@/services/update/update.service";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import UpdateList from "@/components/updates/UpdateList";
import UpdateForm from "@/components/updates/UpdateForm";
import { ProjectUpdate, UpdateType } from "@/types/update";
import { ArrowLeft, Megaphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Standalone Update Feed page  — /projects/[id]/updates
 *
 * Implements issue #243 acceptance criteria:
 *  - Project updates are visible on a dedicated page.
 *  - Updates are sortable by date (handled inside UpdateList).
 *  - Project owners can publish updates from this page.
 */
export default function ProjectUpdatesPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const confirm = useConfirm();

  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ProjectUpdate | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = projectService.getProjectById(projectId);
      setProject(found);
      if (found) {
        setUpdates(updateService.getUpdatesByProject(found.id));
      }
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [projectId]);

  const isOwner =
    project && gate.publicKey && project.ownerAddress === gate.publicKey;

  const handleSubmitUpdate = (data: {
    type: UpdateType;
    title: string;
    content: string;
    version?: string;
  }) => {
    if (!gate.publicKey || !project) return;

    if (editingUpdate) {
      updateService.updateUpdate(editingUpdate.id, data, gate.publicKey);
      toast.success("Update edited successfully");
    } else {
      updateService.addUpdate(
        { projectId: project.id, ...data, authorAddress: gate.publicKey },
        gate.publicKey,
      );
      toast.success("Update published successfully");
    }

    setUpdates(updateService.getUpdatesByProject(projectId));
    setIsAddingUpdate(false);
    setEditingUpdate(null);
  };

  const handleEditUpdate = (update: ProjectUpdate) => {
    setEditingUpdate(update);
    setIsAddingUpdate(true);
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!gate.publicKey) return;
    const ok = await confirm({
      title: "Delete update",
      description:
        "This will permanently remove this update. This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    try {
      updateService.deleteUpdate(id, gate.publicKey);
      setUpdates(updateService.getUpdatesByProject(projectId));
      toast.success("Update deleted");
    } catch {
      toast.error("Failed to delete update");
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center py-24">
          <Spinner size="lg" className="mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading updates…</p>
        </div>
      </main>
    );
  }

  // ── Not found state ───────────────────────────────────────────────────────
  if (!project) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Project Not Found</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              The project you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button variant="primary" onClick={() => router.push("/discover")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discover
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Back navigation */}
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {project.name}
        </button>

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-zinc-500" aria-hidden="true" />
              <h1 className="text-2xl font-bold">Update Feed</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {project.name} &mdash; {updates.length} update
              {updates.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isOwner && !isAddingUpdate && (
            <Button variant="primary" onClick={() => setIsAddingUpdate(true)}>
              <Megaphone className="w-4 h-4 mr-2" />
              Post Update
            </Button>
          )}
        </div>

        {/* Inline update form (owner only) */}
        {isAddingUpdate && (
          <div className="mb-6">
            <UpdateForm
              projectId={projectId}
              initialUpdate={editingUpdate ?? undefined}
              onSubmit={handleSubmitUpdate}
              onCancel={() => {
                setIsAddingUpdate(false);
                setEditingUpdate(null);
              }}
            />
          </div>
        )}

        {/* Update list with sort/filter controls */}
        <UpdateList
          updates={updates}
          canManage={Boolean(isOwner)}
          onEdit={handleEditUpdate}
          onDelete={handleDeleteUpdate}
        />
      </div>
    </main>
  );
}
