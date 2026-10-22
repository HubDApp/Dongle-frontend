"use client";

import React, { useEffect, useState } from "react";
import { useComparison } from "@/context/comparison.context";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, ExternalLink, GitBranch, FileText, Shield, Bug, X, AlertCircle, History, Link as LinkIcon, Download } from "lucide-react";
import ProjectImage from "@/components/projects/ProjectImage";
import { Button } from "@/components/ui/Button";
import { SafeExternalLink } from "@/components/ui/SafeExternalLink";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";
import { sorobanService } from "@/services/stellar/soroban.service";
import { getApprovedProjectUrls } from "@/lib/externalLinkWarning";
import type { Project } from "@/types/project";
import { projectService } from "@/services/project/project.service";
import { buildComparisonPermalink, getComparisonProjectIdsFromQuery } from "@/utils/comparison-history.util";
import { toast } from "sonner";
import { getIpfsGatewayUrls } from "@/lib/ipfs-gateway";

type ExportFormat = "pdf" | "png" | "csv";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export default function ComparePage() {
  const { selectedProjects, removeProject, clearComparison, restoreProjects, saveCurrentComparison } = useComparison();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);

  const exportComparison = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `dongle-comparison-${date}`;
    const rows: Array<[string, (project: Project) => string]> = [
      ["Rating", (project) => String(project.rating ?? "")],
      ["Reviews", (project) => String(project.reviews ?? 0)],
      ["Verification", (project) => verificationStatuses[project.id] ?? "NONE"],
      ["Category", (project) => project.primaryCategory ?? ""],
      ["Tags", (project) => (project.tags ?? []).join(", ")],
      ["Description", (project) => project.description ?? ""],
      ["Logo", (project) => project.logoUrl ?? ""],
      ["Website", (project) => project.websiteUrl ?? ""],
      ["GitHub", (project) => project.githubUrl ?? ""],
      ["Documentation", (project) => project.docsUrl ?? ""],
      ["Audit Report", (project) => project.auditReportUrl ?? ""],
      ["Bug Bounty", (project) => project.bugBountyUrl ?? ""],
    ];

    try {
      if (exportFormat === "csv") {
        const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const csv = [
          ["Attribute", ...selectedProjects.map((project) => project.name)],
          ...rows.map(([label, value]) => [label, ...selectedProjects.map(value)]),
        ].map((row) => row.map(quote).join(",")).join("\r\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else if (exportFormat === "pdf") {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast.error("Allow pop-ups to export this comparison as PDF");
          return;
        }
        const columns = selectedProjects.map((project) => {
          const logo = project.logoUrl ? getIpfsGatewayUrls(project.logoUrl)[0] : "";
          return `<th><img src="${escapeHtml(logo)}" alt="" /><strong>${escapeHtml(project.name)}</strong></th>`;
        }).join("");
        const tableRows = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th>${selectedProjects.map((project) => `<td>${escapeHtml(value(project))}</td>`).join("")}</tr>`).join("");
        printWindow.document.write(`<!doctype html><html><head><title>${filename}.pdf</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#18181b}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d4d4d8;padding:10px;text-align:left;vertical-align:top}thead th{text-align:center}thead img{display:block;width:56px;height:56px;object-fit:contain;margin:0 auto 8px}thead strong{display:block} @media print{body{padding:0}}</style></head><body><h1>Project Comparison</h1><table><thead><tr><th>Attribute</th>${columns}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
        printWindow.document.close();
        printWindow.requestAnimationFrame(() => printWindow.print());
      } else {
        const columnWidth = 420;
        const padding = 48;
        const rowHeight = 92;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1400, padding * 2 + columnWidth * (selectedProjects.length + 1));
        canvas.height = 240 + rowHeight * rows.length;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas export is unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#18181b";
        context.font = "bold 38px sans-serif";
        context.fillText("Project Comparison", padding, 62);
        context.font = "bold 24px sans-serif";
        selectedProjects.forEach((project, index) => {
          const x = padding + columnWidth * (index + 1);
          context.fillText(project.name.slice(0, 24), x, 138);
        });
        rows.forEach(([label, value], rowIndex) => {
          const y = 240 + rowHeight * rowIndex;
          context.strokeStyle = "#e4e4e7";
          context.beginPath();
          context.moveTo(padding, y);
          context.lineTo(canvas.width - padding, y);
          context.stroke();
          context.fillStyle = "#3f3f46";
          context.font = "bold 20px sans-serif";
          context.fillText(label, padding, y + 34);
          selectedProjects.forEach((project, index) => {
            context.fillStyle = "#18181b";
            context.font = "18px sans-serif";
            const text = value(project);
            context.fillText(text.slice(0, 48), padding + columnWidth * (index + 1), y + 34);
          });
        });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not generate PNG");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch {
      toast.error("Could not export this comparison");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const idsText = searchParams.get("ids");
    const ids = getComparisonProjectIdsFromQuery(idsText);
    if (!ids.length) return;

    const nextProjects = ids
      .map((id) => projectService.getProjectById(id))
      .filter((project): project is Project => Boolean(project));

    if (nextProjects.length >= 2) {
      restoreProjects(nextProjects.slice(0, 4));
    }
  }, [searchParams, restoreProjects]);

  useEffect(() => {
    const fetchStatuses = async () => {
      const statuses: Record<string, VerificationStatus> = {};
      await Promise.all(
        selectedProjects.map(async (project) => {
          try {
            const status = await sorobanService.getVerificationStatus(project.id);
            statuses[project.id] = status;
          } catch {
            statuses[project.id] = "NONE";
          }
        })
      );
      setVerificationStatuses(statuses);
      setIsLoading(false);
    };

    void fetchStatuses();
  }, [selectedProjects]);

  if (selectedProjects.length === 0) {
    return (
      <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-24">
            <AlertCircle className="w-16 h-16 text-zinc-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">No Projects Selected</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">
              Start by adding projects from the discover page to compare their features,
              ratings, and security resources.
            </p>
            <Button onClick={() => router.push("/discover")}>
              Browse Projects
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (selectedProjects.length === 1) {
    return (
      <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-24">
            <AlertCircle className="w-16 h-16 text-blue-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Add More Projects</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">
              You need at least 2 projects to compare. Add more projects from the discover page.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={clearComparison}>
                Clear Selection
              </Button>
              <Button onClick={() => router.push("/discover")}>
                Add More Projects
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Compare Projects</h1>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                </select>
                <Button variant="outline" onClick={() => void exportComparison()} isLoading={isExporting}>
                  <Download className="mr-2 h-4 w-4" />Export
                </Button>
              </div>
              <Button variant="outline" onClick={() => router.push("/compare/history")}>
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button variant="outline" onClick={() => {
                const entry = saveCurrentComparison();
                if (entry) {
                  toast.success("Comparison saved to history");
                } else {
                  toast.error("Select at least two projects to save a comparison");
                }
              }}>
                Save Snapshot
              </Button>
              <Button variant="outline" onClick={async () => {
                const link = buildComparisonPermalink(selectedProjects.map((project) => project.id));
                await navigator.clipboard.writeText(link);
                toast.success("Shareable comparison link copied");
              }}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={() => router.push("/discover")}>
                Add More
              </Button>
              <Button variant="outline" onClick={clearComparison}>
                Clear All
              </Button>
            </div>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Side-by-side comparison of {selectedProjects.length} projects
          </p>
        </div>

        {/* Desktop View - Horizontal Scrollable Table */}
        <div className="hidden md:block overflow-x-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left p-6 font-bold bg-zinc-50 dark:bg-zinc-800/50 sticky left-0 z-10 min-w-[200px]">
                    Attribute
                  </th>
                  {selectedProjects.map((project) => (
                    <th key={project.id} className="p-6 min-w-[250px] relative">
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${project.name} from comparison`}
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <div className="flex flex-col items-center gap-3">
                        <ProjectImage
                          logoUrl={project.logoUrl}
                          name={project.name}
                          className="!w-16 !h-16"
                        />
                        <h3 className="font-bold text-lg">{project.name}</h3>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rating */}
                <ComparisonRow
                  label="Rating"
                  icon={<Star className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id} className="flex items-center justify-center gap-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-lg">{p.rating}</span>
                    </div>
                  ))}
                />

                {/* Reviews */}
                <ComparisonRow
                  label="Reviews"
                  values={selectedProjects.map((p) => (
                    <span key={p.id} className="font-semibold">{p.reviews} reviews</span>
                  ))}
                />

                {/* Category */}
                <ComparisonRow
                  label="Category"
                  values={selectedProjects.map((p) => (
                    <span
                      key={p.id}
                      className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold"
                    >
                      {p.primaryCategory}
                    </span>
                  ))}
                />

                {/* Verification */}
                <ComparisonRow
                  label="Verification"
                  icon={<Shield className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {isLoading ? (
                        <span className="text-zinc-400 text-sm">Loading...</span>
                      ) : (
                        <VerificationBadge status={verificationStatuses[p.id] || "NONE"} />
                      )}
                    </div>
                  ))}
                />

                {/* Tags */}
                <ComparisonRow
                  label="Tags"
                  values={selectedProjects.map((p) => (
                    <div key={p.id} className="flex flex-wrap gap-2 justify-center">
                      {p.tags && p.tags.length > 0 ? (
                        p.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-400 text-sm">No tags</span>
                      )}
                    </div>
                  ))}
                />

                {/* Description */}
                <ComparisonRow
                  label="Description"
                  values={selectedProjects.map((p) => (
                    <p key={p.id} className="text-sm text-zinc-600 dark:text-zinc-400">
                      {p.description}
                    </p>
                  ))}
                />

                {/* Links */}
                <ComparisonRow
                  label="Website"
                  icon={<ExternalLink className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.websiteUrl ? (
                        <CompareExternalLink
                          href={p.websiteUrl}
                          project={p}
                          status={verificationStatuses[p.id]}
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          Visit Site
                          <ExternalLink className="w-3 h-3" />
                        </CompareExternalLink>
                      ) : (
                        <span className="text-zinc-400 text-sm">N/A</span>
                      )}
                    </div>
                  ))}
                />

                <ComparisonRow
                  label="GitHub"
                  icon={<GitBranch className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.githubUrl ? (
                        <CompareExternalLink
                          href={p.githubUrl}
                          project={p}
                          status={verificationStatuses[p.id]}
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          View Repo
                          <GitBranch className="w-3 h-3" />
                        </CompareExternalLink>
                      ) : (
                        <span className="text-zinc-400 text-sm">N/A</span>
                      )}
                    </div>
                  ))}
                />

                <ComparisonRow
                  label="Documentation"
                  icon={<FileText className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.docsUrl ? (
                        <CompareExternalLink
                          href={p.docsUrl}
                          project={p}
                          status={verificationStatuses[p.id]}
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          Read Docs
                          <FileText className="w-3 h-3" />
                        </CompareExternalLink>
                      ) : (
                        <span className="text-zinc-400 text-sm">N/A</span>
                      )}
                    </div>
                  ))}
                />

                {/* Security Resources */}
                <ComparisonRow
                  label="Audit Report"
                  icon={<Shield className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.auditReportUrl ? (
                        <CompareExternalLink
                          href={p.auditReportUrl}
                          project={p}
                          status={verificationStatuses[p.id]}
                          className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 justify-center font-medium"
                        >
                          View Report
                          <ExternalLink className="w-3 h-3" />
                        </CompareExternalLink>
                      ) : (
                        <span className="text-zinc-400 text-sm">Not available</span>
                      )}
                    </div>
                  ))}
                />

                <ComparisonRow
                  label="Bug Bounty"
                  icon={<Bug className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.bugBountyUrl ? (
                        <CompareExternalLink
                          href={p.bugBountyUrl}
                          project={p}
                          status={verificationStatuses[p.id]}
                          className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 justify-center font-medium"
                        >
                          View Program
                          <ExternalLink className="w-3 h-3" />
                        </CompareExternalLink>
                      ) : (
                        <span className="text-zinc-400 text-sm">Not available</span>
                      )}
                    </div>
                  ))}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View - Stacked Cards */}
        <div className="md:hidden space-y-6">
          {selectedProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <ProjectImage
                    logoUrl={project.logoUrl}
                    name={project.name}
                    className="!w-12 !h-12"
                  />
                  <h3 className="font-bold text-lg">{project.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => removeProject(project.id)}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${project.name} from comparison`}
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <MobileComparisonItem
                  label="Rating"
                  value={
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold">{project.rating}</span>
                    </div>
                  }
                />
                <MobileComparisonItem label="Reviews" value={`${project.reviews} reviews`} />
                <MobileComparisonItem
                  label="Category"
                  value={
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
                      {project.primaryCategory}
                    </span>
                  }
                />
                <MobileComparisonItem
                  label="Verification"
                  value={
                    isLoading ? (
                      <span className="text-zinc-400 text-sm">Loading...</span>
                    ) : (
                      <VerificationBadge status={verificationStatuses[project.id] || "NONE"} />
                    )
                  }
                />
                <MobileComparisonItem
                  label="Tags"
                  value={
                    project.tags && project.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-400">No tags</span>
                    )
                  }
                />
                <MobileComparisonItem label="Description" value={project.description} />
                <MobileComparisonItem
                  label="Website"
                  value={
                    project.websiteUrl ? (
                      <CompareExternalLink
                        href={project.websiteUrl}
                        project={project}
                        status={verificationStatuses[project.id]}
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        Visit Site
                        <ExternalLink className="w-3 h-3" />
                      </CompareExternalLink>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="GitHub"
                  value={
                    project.githubUrl ? (
                      <CompareExternalLink
                        href={project.githubUrl}
                        project={project}
                        status={verificationStatuses[project.id]}
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        View Repo
                        <GitBranch className="w-3 h-3" />
                      </CompareExternalLink>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Documentation"
                  value={
                    project.docsUrl ? (
                      <CompareExternalLink
                        href={project.docsUrl}
                        project={project}
                        status={verificationStatuses[project.id]}
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        Read Docs
                        <FileText className="w-3 h-3" />
                      </CompareExternalLink>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Audit Report"
                  value={
                    project.auditReportUrl ? (
                      <CompareExternalLink
                        href={project.auditReportUrl}
                        project={project}
                        status={verificationStatuses[project.id]}
                        className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 font-medium"
                      >
                        View Report
                        <ExternalLink className="w-3 h-3" />
                      </CompareExternalLink>
                    ) : (
                      <span className="text-zinc-400">Not available</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Bug Bounty"
                  value={
                    project.bugBountyUrl ? (
                      <CompareExternalLink
                        href={project.bugBountyUrl}
                        project={project}
                        status={verificationStatuses[project.id]}
                        className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 font-medium"
                      >
                        View Program
                        <ExternalLink className="w-3 h-3" />
                      </CompareExternalLink>
                    ) : (
                      <span className="text-zinc-400">Not available</span>
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ComparisonRow({
  label,
  icon,
  values,
}: {
  label: string;
  icon?: React.ReactNode;
  values: React.ReactNode[];
}) {
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
      <td className="p-6 font-semibold bg-zinc-50 dark:bg-zinc-800/50 sticky left-0">
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
      </td>
      {values.map((value, idx) => (
        <td key={idx} className="p-6 text-center">
          {value}
        </td>
      ))}
    </tr>
  );
}

function MobileComparisonItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <span className="font-semibold text-sm text-zinc-600 dark:text-zinc-400 min-w-[100px]">
        {label}
      </span>
      <div className="text-sm text-right flex-1">{value}</div>
    </div>
  );
}

function CompareExternalLink({
  href,
  project,
  status,
  className,
  children,
}: {
  href: string;
  project: Project;
  status?: VerificationStatus;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeExternalLink
      href={href}
      verificationStatus={status ?? "NONE"}
      approvedUrls={getApprovedProjectUrls(project)}
      className={className}
    >
      {children}
    </SafeExternalLink>
  );
}
