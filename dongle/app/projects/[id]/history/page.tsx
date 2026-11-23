"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  History,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useOnChainTransaction } from "@/hooks/useOnChainTransaction";
import { projectHistoryService } from "@/services/project/project-history.service";
import { projectService } from "@/services/project/project.service";
import { sorobanService } from "@/services/stellar/soroban.service";
import type { Project } from "@/types/project";
import type { ProjectVersion } from "@/types/history";

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function getSnapshotChanges(older: ProjectVersion, newer: ProjectVersion) {
  const keys = new Set([
    ...Object.keys(older.snapshot),
    ...Object.keys(newer.snapshot),
  ]);
  return Array.from(keys)
    .filter(
      (key) =>
        JSON.stringify(older.snapshot[key as keyof Project]) !==
        JSON.stringify(newer.snapshot[key as keyof Project]),
    )
    .map((field) => ({
      field,
      oldValue: older.snapshot[field as keyof Project],
      newValue: newer.snapshot[field as keyof Project],
    }));
}

export default function ProjectHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { isAdmin, gate } = useAdminAccess();
  const { progress, run, isInProgress } = useOnChainTransaction();
  const [history, setHistory] = useState<ProjectVersion[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [olderVersionId, setOlderVersionId] = useState("");
  const [newerVersionId, setNewerVersionId] = useState("");
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const reloadHistory = () => {
    const versions = projectHistoryService.getProjectHistory(projectId);
    setHistory(versions);
    setOlderVersionId((current) => current || versions[1]?.id || versions[0]?.id || "");
    setNewerVersionId((current) => current || versions[0]?.id || "");
  };

  useEffect(() => {
    setProject(projectService.getProjectById(projectId));
    reloadHistory();
  }, [projectId]);

  const olderVersion = history.find((version) => version.id === olderVersionId);
  const newerVersion = history.find((version) => version.id === newerVersionId);
  const changes = useMemo(
    () =>
      olderVersion && newerVersion
        ? getSnapshotChanges(olderVersion, newerVersion)
        : [],
    [olderVersion, newerVersion],
  );
  const ownerAddress =
    project?.ownerAddress ??
    history.find((version) => version.snapshot.ownerAddress)?.snapshot.ownerAddress;
  const isOwner = Boolean(gate.publicKey && ownerAddress === gate.publicKey);

  const selectForComparison = (version: ProjectVersion) => {
    const index = history.findIndex((item) => item.id === version.id);
    setNewerVersionId(version.id);
    setOlderVersionId(history[index + 1]?.id ?? version.id);
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-${projectId}-history.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreVersion = async (version: ProjectVersion) => {
    if (!isOwner || !gate.publicKey) return;
    const snapshot = version.snapshot;
    if (!snapshot.name || !snapshot.primaryCategory || !snapshot.description) {
      toast.error("This version does not contain enough project data to restore.");
      return;
    }

    setRestoringVersionId(version.id);
    const result = await run((onPhaseChange) =>
      sorobanService.updateProject(
        projectId,
        {
          name: snapshot.name!,
          category: snapshot.primaryCategory!,
          description: snapshot.description!,
          websiteUrl: snapshot.websiteUrl ?? "",
          githubUrl: snapshot.githubUrl,
          logoUrl: snapshot.logoUrl,
          docsUrl: snapshot.docsUrl,
          contractAddresses: snapshot.contractAddresses,
        },
        { onPhaseChange },
      ),
    );

    if (result) {
      projectHistoryService.recordVersion(
        projectId,
        snapshot,
        gate.publicKey,
        "restore",
      );
      reloadHistory();
      toast.success("Project restored to the selected version.");
    }
    setRestoringVersionId(null);
  };

  if (!project && history.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-28 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to project
          </Button>
          <div className="py-20 text-center">
            <History className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
            <h1 className="text-2xl font-semibold">No version history yet</h1>
            <p className="mt-2 text-zinc-500">Edits will appear here after they are saved.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-28 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Project
            </Button>
            <div className="mt-5 flex items-center gap-3">
              <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
                  {project?.name ?? history[0]?.snapshot.name ?? "Project"} history
                </h1>
                <p className="mt-1 text-sm text-zinc-500">{history.length} of 50 versions retained</p>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin access
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={exportHistory} disabled={history.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>

        {isInProgress && <TransactionProgressPanel progress={progress} onRetry={() => undefined} />}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section aria-labelledby="versions-heading">
            <h2 id="versions-heading" className="mb-3 text-sm font-semibold uppercase text-zinc-500">
              Versions
            </h2>
            <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {history.map((version) => (
                <li key={version.id} className="flex items-start gap-3 py-4">
                  <button
                    type="button"
                    onClick={() => selectForComparison(version)}
                    className={`min-w-0 flex-1 text-left ${newerVersionId === version.id ? "text-blue-700 dark:text-blue-300" : "text-zinc-900 dark:text-zinc-100"}`}
                  >
                    <span className="block font-medium">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      {version.updatedBy} · {version.action}
                    </span>
                    <span className="mt-2 block text-sm text-zinc-600 dark:text-zinc-400">
                      {version.changes.length
                        ? version.changes.map((change) => change.field).join(", ")
                        : "Initial snapshot"}
                    </span>
                  </button>
                  {isOwner && version.action !== "create" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isInProgress || restoringVersionId === version.id}
                      onClick={() => void restoreVersion(version)}
                      aria-label={`Restore version from ${new Date(version.timestamp).toLocaleString()}`}
                    >
                      {restoringVersionId === version.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="comparison-heading">
            <h2 id="comparison-heading" className="mb-3 text-sm font-semibold uppercase text-zinc-500">
              Compare versions
            </h2>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Before
                <select
                  className="mt-1 block w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={olderVersionId}
                  onChange={(event) => setOlderVersionId(event.target.value)}
                >
                  {history.map((version) => (
                    <option key={version.id} value={version.id}>
                      {new Date(version.timestamp).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                After
                <select
                  className="mt-1 block w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={newerVersionId}
                  onChange={(event) => setNewerVersionId(event.target.value)}
                >
                  {history.map((version) => (
                    <option key={version.id} value={version.id}>
                      {new Date(version.timestamp).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {changes.length === 0 ? (
              <p className="border-y border-zinc-200 py-6 text-sm text-zinc-500 dark:border-zinc-800">
                Select two different versions to view their changes.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {changes.map((change) => (
                  <div key={change.field} className="py-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {change.field}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <pre className="min-w-0 overflow-auto whitespace-pre-wrap break-words rounded border-l-2 border-rose-500 bg-rose-50 p-3 text-xs text-zinc-800 dark:bg-rose-950/20 dark:text-zinc-200">
                        {formatValue(change.oldValue)}
                      </pre>
                      <pre className="min-w-0 overflow-auto whitespace-pre-wrap break-words rounded border-l-2 border-emerald-500 bg-emerald-50 p-3 text-xs text-zinc-800 dark:bg-emerald-950/20 dark:text-zinc-200">
                        {formatValue(change.newValue)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}