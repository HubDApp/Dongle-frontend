import type { Project } from "@/types/project";

function escapeCsvValue(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProjectsToCsv(projects: Project[]): string {
  const headers = [
    "id",
    "name",
    "category",
    "rating",
    "reviews",
    "ownerAddress",
    "createdAt",
    "websiteUrl",
  ];

  const rows = projects.map((p) =>
    [
      p.id,
      p.name,
      p.primaryCategory,
      p.rating,
      p.reviews,
      p.ownerAddress ?? "",
      p.createdAt,
      p.websiteUrl ?? "",
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
