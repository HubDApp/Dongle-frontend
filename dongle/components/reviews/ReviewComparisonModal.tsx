"use client";

import React from "react";
import { X, Star, CheckCircle2, DollarSign, ShieldCheck } from "lucide-react";

export interface ComparisonProject {
  id: string;
  name: string;
  category: string;
  averageRating: number;
  totalReviews: number;
  features: string[];
  price: string;
  isVerified: boolean;
}

interface ReviewComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ComparisonProject;
  similarProjects: ComparisonProject[];
  onReferenceProject?: (projectName: string) => void;
}

/**
 * Side-by-side comparison modal for reviewers (#679).
 * Shows the current project vs. 3 similar projects with key metrics.
 */
export function ReviewComparisonModal({
  isOpen,
  onClose,
  currentProject,
  similarProjects,
  onReferenceProject,
}: ReviewComparisonModalProps) {
  if (!isOpen) return null;

  const allProjects = [currentProject, ...similarProjects.slice(0, 3)];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Compare similar projects"
    >
      <div className="mx-4 max-h-[80vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compare Similar Projects
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="w-32 p-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Metric
                </th>
                {allProjects.map((project) => (
                  <th
                    key={project.id}
                    className="p-2 text-left text-xs font-semibold text-gray-900 dark:text-white"
                  >
                    {project.name}
                    {project.id === currentProject.id && (
                      <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                        Reviewing
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr>
                <td className="p-2 font-medium text-gray-500">
                  <Star className="mr-1 inline h-3.5 w-3.5" /> Rating
                </td>
                {allProjects.map((p) => (
                  <td key={p.id} className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{p.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({p.totalReviews} reviews)</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-medium text-gray-500">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Features
                </td>
                {allProjects.map((p) => (
                  <td key={p.id} className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {p.features.slice(0, 4).map((f) => (
                        <span
                          key={f}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-medium text-gray-500">
                  <DollarSign className="mr-1 inline h-3.5 w-3.5" /> Price
                </td>
                {allProjects.map((p) => (
                  <td key={p.id} className="p-2">
                    {p.price}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-medium text-gray-500">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Verified
                </td>
                {allProjects.map((p) => (
                  <td key={p.id} className="p-2">
                    {p.isVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                ))}
              </tr>
              {onReferenceProject && (
                <tr>
                  <td className="p-2" />
                  {allProjects.map((p) => (
                    <td key={p.id} className="p-2">
                      {p.id !== currentProject.id && (
                        <button
                          onClick={() => {
                            onReferenceProject(p.name);
                            onClose();
                          }}
                          className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                        >
                          Reference in review
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
