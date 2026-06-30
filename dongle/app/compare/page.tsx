"use client";

import React, { useEffect, useState } from "react";
import { useComparison } from "@/context/comparison.context";
import { useRouter } from "next/navigation";
import { Star, ExternalLink, Github, FileText, Shield, Bug, X, AlertCircle } from "lucide-react";
import ProjectImage from "@/components/projects/ProjectImage";
import { Button } from "@/components/ui/Button";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";
import { sorobanService } from "@/services/stellar/soroban.service";

export default function ComparePage() {
  const { selectedProjects, removeProject, clearComparison } = useComparison();
  const router = useRouter();
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

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

    if (selectedProjects.length > 0) {
      void fetchStatuses();
    } else {
      setIsLoading(false);
    }
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
            <div className="flex gap-3">
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
                        onClick={() => removeProject(project.id)}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
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
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          Visit Site
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-400 text-sm">N/A</span>
                      )}
                    </div>
                  ))}
                />

                <ComparisonRow
                  label="GitHub"
                  icon={<Github className="w-4 h-4" />}
                  values={selectedProjects.map((p) => (
                    <div key={p.id}>
                      {p.githubUrl ? (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          View Repo
                          <Github className="w-3 h-3" />
                        </a>
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
                        <a
                          href={p.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 justify-center"
                        >
                          Read Docs
                          <FileText className="w-3 h-3" />
                        </a>
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
                        <a
                          href={p.auditReportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 justify-center font-medium"
                        >
                          View Report
                          <ExternalLink className="w-3 h-3" />
                        </a>
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
                        <a
                          href={p.bugBountyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 justify-center font-medium"
                        >
                          View Program
                          <ExternalLink className="w-3 h-3" />
                        </a>
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
                  onClick={() => removeProject(project.id)}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
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
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        Visit Site
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="GitHub"
                  value={
                    project.githubUrl ? (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        View Repo
                        <Github className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Documentation"
                  value={
                    project.docsUrl ? (
                      <a
                        href={project.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                      >
                        Read Docs
                        <FileText className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Audit Report"
                  value={
                    project.auditReportUrl ? (
                      <a
                        href={project.auditReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 font-medium"
                      >
                        View Report
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">Not available</span>
                    )
                  }
                />
                <MobileComparisonItem
                  label="Bug Bounty"
                  value={
                    project.bugBountyUrl ? (
                      <a
                        href={project.bugBountyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 font-medium"
                      >
                        View Program
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
