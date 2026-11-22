import type { Metadata } from "next";
import { projectService } from "@/services/project/project.service";

interface ChangelogLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/** Title for the changelog page and RSS autodiscovery (`<link rel="alternate">`). */
export async function generateMetadata({ params }: ChangelogLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const project = projectService.getProjectById(id);
  if (!project) return { title: "Project Not Found – Dongle" };
  return {
    title: `${project.name} changelog – Dongle`,
    description: `Version history, fixes, security audits and announcements for ${project.name}.`,
    alternates: {
      types: {
        "application/rss+xml": [
          { url: `/projects/${encodeURIComponent(id)}/changelog/rss`, title: `${project.name} changelog` },
        ],
      },
    },
  };
}

export default function ChangelogLayout({ children }: ChangelogLayoutProps) {
  return children;
}
