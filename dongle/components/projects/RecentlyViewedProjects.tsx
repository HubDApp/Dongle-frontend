import { useRouter } from "next/navigation";
import { Project } from "@/types/project";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import ProjectImage from "@/components/projects/ProjectImage";
import { Clock, X, Star } from "lucide-react";

interface RecentlyViewedProjectsProps {
  projects: Project[];
  onClear?: () => void;
  compact?: boolean;
}

export function RecentlyViewedProjects({
  projects,
  onClear,
  compact = false,
}: RecentlyViewedProjectsProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recently Viewed
          </h3>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              aria-label="Clear history"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-3">
          {projects.slice(0, 5).map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer group"
            >
              <ProjectImage
                logoUrl={project.logoUrl}
                name={project.name}
                className="w-10 h-10 shrink-0"
                fallbackTextSize="text-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {project.primaryCategory}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span>{project.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {projects.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => router.push("/profile")}
          >
            View All ({projects.length})
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Recently Viewed
        </h2>
        {onClear && (
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => router.push(`/projects/${project.id}`)}
            className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all cursor-pointer group"
          >
            <ProjectImage
              logoUrl={project.logoUrl}
              name={project.name}
              className="w-16 h-16 shrink-0"
              fallbackTextSize="text-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {project.name}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1">
                {project.description}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {project.primaryCategory}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {project.rating}
                  </span>
                  <span>({project.reviews})</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
