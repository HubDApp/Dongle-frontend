"use client";

import React from "react";
import { useComparison } from "@/context/comparison.context";
import { X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import ProjectImage from "@/components/projects/ProjectImage";

export function ComparisonFloatingButton() {
  const { selectedProjects, removeProject, clearComparison } = useComparison();
  const router = useRouter();

  if (selectedProjects.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-white dark:bg-zinc-900 border-2 border-blue-500 rounded-3xl shadow-2xl p-4 min-w-[320px] max-w-[90vw]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">
            Compare Projects ({selectedProjects.length}/4)
          </h3>
          <button
            onClick={clearComparison}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
          >
            Clear all
          </button>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 hide-scrollbar">
          {selectedProjects.map((project) => (
            <div
              key={project.id}
              className="relative flex-shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2 pr-8 min-w-[120px]"
            >
              <div className="flex items-center gap-2">
                <ProjectImage
                  logoUrl={project.logoUrl}
                  name={project.name}
                  className="!w-8 !h-8"
                  fallbackTextSize="text-xs"
                />
                <span className="text-xs font-medium truncate max-w-[60px]">
                  {project.name}
                </span>
              </div>
              <button
                onClick={() => removeProject(project.id)}
                className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/compare")}
          disabled={selectedProjects.length < 2}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          Compare Now
          <ArrowRight className="w-4 h-4" />
        </button>
        
        {selectedProjects.length < 2 && (
          <p className="text-xs text-zinc-400 text-center mt-2">
            Select at least 2 projects to compare
          </p>
        )}
      </div>
    </div>
  );
}
