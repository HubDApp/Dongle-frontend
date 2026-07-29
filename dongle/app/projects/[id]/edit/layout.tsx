import { Metadata, ResolvingMetadata } from "next";
import { projectService } from "@/services/project/project.service";

interface EditLayoutProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: EditLayoutProps,
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

  return {
    title: `Edit ${project.name} – Dongle`,
    description: `Edit the project details for ${project.name} on Dongle.`,
  };
}

export default function EditProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
