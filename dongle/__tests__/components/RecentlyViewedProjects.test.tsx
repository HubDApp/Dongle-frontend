import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecentlyViewedProjects } from "@/components/projects/RecentlyViewedProjects";
import { PROJECT_CATEGORIES } from "@/types/project";
import type { Project } from "@/types/project";

vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: {
    getVerificationStatus: vi.fn().mockResolvedValue("NONE"),
  },
}));

vi.mock("@/components/projects/ProjectImage", () => ({
  default: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const projects: Project[] = [
  {
    id: "proj-1",
    name: "Soroban Swap",
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    description: "A DEX on Soroban.",
    rating: 4.8,
    reviews: 12,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "proj-2",
    name: "Stellar Guardians",
    primaryCategory: PROJECT_CATEGORIES.GAMING,
    description: "A strategy game.",
    rating: 4.2,
    reviews: 8,
    createdAt: "2026-01-02T00:00:00Z",
  },
];

describe("RecentlyViewedProjects", () => {
  it("renders links back to project detail pages", () => {
    render(<RecentlyViewedProjects projects={projects} />);

    expect(screen.getByRole("link", { name: /Soroban Swap/i })).toHaveAttribute(
      "href",
      "/projects/proj-1",
    );
    expect(screen.getByRole("link", { name: /Stellar Guardians/i })).toHaveAttribute(
      "href",
      "/projects/proj-2",
    );
  });

  it("lets the user clear recent history", () => {
    const onClear = vi.fn();
    render(<RecentlyViewedProjects projects={projects} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: /clear history/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when there is no history", () => {
    const { container } = render(<RecentlyViewedProjects projects={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
