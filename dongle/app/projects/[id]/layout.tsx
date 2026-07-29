import { Metadata, ResolvingMetadata } from "next";
import { projectService } from "@/services/project/project.service";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: ProjectLayoutProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const project = projectService.getProjectById(id);

  if (!project) {
    return {
      title: "Project Not Found – Dongle",
      description: "The project you're looking for doesn't exist.",
    };
  }

  const ogImage = project.logoUrl || "https://dongle.app/og-project.png";

  return {
    title: `${project.name} – Dongle`,
    description: project.description,
    openGraph: {
      title: `${project.name} – Dongle`,
      description: project.description,
      url: `https://dongle.app/projects/${id}`,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${project.name} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} – Dongle`,
      description: project.description,
      images: [ogImage],
    },
  };
}

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
