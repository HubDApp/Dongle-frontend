import Link from "next/link";
import { mockProjects } from "@/data/mockProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function FeaturedProjects() {
  // Get top 3 highest rated projects for the featured section
  const featuredProjects = [...mockProjects]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-4">Featured Projects</h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Discover the most trusted and highly-rated dApps on Stellar.
            </p>
          </div>
          <Link 
            href="/discover" 
            className="text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all underline underline-offset-4"
          >
            View all projects
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
