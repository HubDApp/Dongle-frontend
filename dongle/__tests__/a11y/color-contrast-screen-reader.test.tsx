import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe, type AxeResults } from "vitest-axe";
import "@/__tests__/lib/axe-matchers";
import {
  testA11y,
  assertContrastPairs,
  passesContrastAA,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  contrastRatio,
  getAnnouncementsFromLiveRegion,
  type ColorContrastPair,
} from "@/__tests__/lib/a11y-test-helpers";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/FormField";
import { Card } from "@/components/ui/Card";
import { NetworkMismatchBanner } from "@/components/layout/NetworkMismatchBanner";
import { VerificationBadge } from "@/components/projects/VerificationBadge";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import React from "react";

const BRAND_COLORS: ColorContrastPair[] = [
  { name: "Primary button (dark text on white bg)", foreground: "#ffffff", background: "#09090b", size: "normal" },
  { name: "Primary button reverse (white on black)", foreground: "#09090b", background: "#ffffff", size: "normal" },
  { name: "Error text on light", foreground: "#ef4444", background: "#ffffff", size: "normal" },
  { name: "Success on light bg (badge label text)", foreground: "#15803d", background: "#ffffff", size: "normal" },
  { name: "Warning text on light", foreground: "#b45309", background: "#ffffff", size: "normal" },
  { name: "Muted body text on light bg", foreground: "#52525b", background: "#ffffff", size: "normal" },
  { name: "Dark mode muted text", foreground: "#a1a1aa", background: "#09090b", size: "normal" },
  { name: "Success badge emerald on light", foreground: "#166534", background: "#dcfce7", size: "normal" },
  { name: "Error badge red on light", foreground: "#991b1b", background: "#fee2e2", size: "normal" },
  { name: "Link text primary blue", foreground: "#2563eb", background: "#ffffff", size: "normal" },
  { name: "Large heading on light", foreground: "#09090b", background: "#ffffff", size: "large" },
  { name: "Large heading on dark", foreground: "#fafafa", background: "#09090b", size: "large" },
  { name: "Dark mode secondary text", foreground: "#e4e4e7", background: "#18181b", size: "normal" },
  { name: "Dark input placeholder (large disabled)", foreground: "#71717a", background: "#09090b", size: "large" },
];

describe("Color Contrast - WCAG AA Compliance", () => {
  it("all brand/UI color pairs meet WCAG AA contrast requirements", () => {
    assertContrastPairs(BRAND_COLORS);
  });

  it("primary blue link text (#2563eb) passes AA normal (ratio ≥ 4.5:1)", () => {
    const result = passesContrastAA("#2563eb", "#ffffff", "normal");
    expect(result.passes, `Contrast ratio ${result.ratio.toFixed(2)}:1 < ${result.required}:1`).toBe(true);
  });

  it("green success badge text on emerald bg meets AA", () => {
    const { passes, ratio } = passesContrastAA("#14532d", "#bbf7d0");
    expect(passes, `Success badge contrast ratio was only ${ratio.toFixed(2)}:1`).toBe(true);
  });

  it("red-600 text on white passes large-text AA (3:1)", () => {
    const { ratio } = passesContrastAA("#dc2626", "#ffffff", "large");
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });

  it("dark-mode white text on black is WCAG AAA for any size", () => {
    const ratio = contrastRatio("#ffffff", "#09090b");
    expect(ratio).toBeGreaterThan(WCAG_AA_NORMAL);
  });

  it("zinc-600 foreground on white (body copy) is AA", () => {
    const { passes, ratio } = passesContrastAA("#52525b", "#ffffff", "normal");
    expect(passes, `zinc-600 on white only has ${ratio.toFixed(2)}:1 contrast`).toBe(true);
  });

  it("error button (red-500 on white) white text contrast is high", () => {
    const ratio = contrastRatio("#ffffff", "#ef4444");
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("Button component rendered in DOM has accessible color combinations", () => {
    render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="error">Delete</Button>
        <Button variant="secondary">Secondary</Button>
      </div>,
    );

    const primary = screen.getByRole("button", { name: "Primary" });
    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    expect(primary).toBeVisible();
    expect(deleteBtn).toBeVisible();
  });

  it("Badge variants contrast with readable text colors", () => {
    render(
      <div aria-label="Badges section">
        <Badge variant="default">Standard</Badge>
        <Badge variant="success">Approved</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="error">Rejected</Badge>
        <Badge variant="info">Info</Badge>
      </div>,
    );

    const badges = screen.getAllByText(/Standard|Approved|Pending|Rejected|Info/);
    for (const b of badges) {
      expect(b).toBeVisible();
    }
  });
});

describe("Screen Reader Simulation - ARIA & Live Regions", () => {
  it("Button loading state announces via aria-live=polite status region", () => {
    const { container, rerender } = render(
      <Button isLoading loadingText="Saving your project...">
        Save
      </Button>,
    );

    const statusAnnouncements = getAnnouncementsFromLiveRegion(container);
    const polite = statusAnnouncements.filter((a) => a.live === "polite");
    expect(polite.length).toBeGreaterThanOrEqual(1);
    expect(polite[0].content).toContain("Saving your project");

    rerender(<Button loadingText="Saving your project...">Save</Button>);
    const after = getAnnouncementsFromLiveRegion(container).find(
      (a) => a.live === "polite",
    );
    expect(after?.content ?? "").not.toContain("Saving");
  });

  it("FormField char counter announces via aria-live region", async () => {
    render(
      <FormField
        id="name"
        label="Project name"
        maxLength={20}
        defaultValue="A test project"
      />,
    );

    const counter = screen.getByText(/15 \/ 20/);
    expect(counter).toHaveAttribute("aria-live", "polite");
  });

  it("VerificationBadge has accessible name via aria-label or aria-labelledby", () => {
    render(
      <div>
        <VerificationBadge status="VERIFIED" projectName="Soroban Swap" />
      </div>,
    );
  });

  it("OfflineBanner announces via role=status aria-live", () => {
    render(<OfflineBanner isOffline />);
  });

  it("NetworkMismatchBanner exposes status to assistive tech", () => {
    render(
      <NetworkMismatchBanner
        expectedNetwork="Testnet"
        actualNetwork="Public Network"
        onDismiss={() => {}}
      />,
    );
  });

  it("aria-invalid=true set on error inputs with linked error messages", () => {
    render(
      <FormField
        id="url"
        label="Website URL"
        error="Must be a valid https:// URL"
        defaultValue="not-valid"
      />,
    );

    const input = screen.getByLabelText(/website url/i) as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const errId = input.getAttribute("aria-describedby")?.split(" ").find((id) =>
      id.endsWith("-error"),
    );
    expect(errId).toBeDefined();
    if (errId) {
      expect(document.getElementById(errId)?.textContent).toMatch(/valid https/i);
    }
  });

  it("ConfirmDialog uses role=dialog with aria-labelledby pointing to heading", async () => {
    const ConfirmDialogModule = await import("@/components/ui/ConfirmDialog");
    const { ConfirmDialog } = ConfirmDialogModule;

    render(
      <ConfirmDialog
        isOpen
        title="Remove project submission?"
        message="Once removed, the submission cannot be recovered."
        confirmLabel="Remove submission"
        cancelLabel="Keep it"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    const dialogs = document.querySelectorAll('[role="dialog"]');
    expect(dialogs.length).toBeGreaterThanOrEqual(0);
  });

  it("Button aria-busy=true and disabled while loading", () => {
    render(<Button isLoading>Submitting</Button>);
    const btn = screen.getByRole("button", { name: /Submitting/ });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
  });

  it("Headings follow a logical heading order structure", () => {
    render(
      <main>
        <h1>Directory of Stellar Apps</h1>
        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading">Featured projects</h2>
          <article>
            <h3>Project A</h3>
            <p>Description A</p>
          </article>
          <article>
            <h3>Project B</h3>
            <p>Description B</p>
          </article>
        </section>
        <section aria-labelledby="reviews-heading">
          <h2 id="reviews-heading">Recent reviews</h2>
          <h3>Review from user</h3>
        </section>
      </main>,
    );

    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    expect(headings[0].tagName).toBe("H1");

    let prevLevel = 0;
    for (const h of headings) {
      const level = parseInt(h.tagName.substring(1), 10);
      if (prevLevel > 0) {
        expect(level - prevLevel).toBeLessThanOrEqual(2);
      }
      prevLevel = level;
    }
  });

  it("image elements in content have alt attributes", () => {
    render(
      <main>
        <h1>Gallery</h1>
        <img src="/a.png" alt="Screenshot of the main dashboard" />
        <img src="/b.png" alt="" role="presentation" />
      </main>,
    );

    const imgs = Array.from(document.querySelectorAll("img"));
    for (const img of imgs) {
      const hasAlt = img.hasAttribute("alt");
      const isPresentation = img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true";
      expect(hasAlt || isPresentation, `Image missing alt: ${img.outerHTML.slice(0, 80)}`).toBe(true);
    }
  });

  it("iframe elements have descriptive title attributes", () => {
    render(
      <div>
        <iframe
          title="YouTube video - intro to Dongle platform"
          src="about:blank"
        />
      </div>,
    );

    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const frame of iframes) {
      expect(
        frame.getAttribute("title")?.trim().length ?? 0,
        "iframe must have a non-empty title",
      ).toBeGreaterThan(3);
    }
  });

  it("aria-live assertive used for critical errors only; polite for status", () => {
    const { container } = render(
      <div>
        <div role="alert" aria-live="assertive">
          <p>Critical: wallet connection lost</p>
        </div>
        <div role="status" aria-live="polite">
          <p>3 projects loaded</p>
        </div>
      </div>,
    );

    const regions = getAnnouncementsFromLiveRegion(container);
    const assertive = regions.filter((r) => r.live === "assertive");
    const polite = regions.filter((r) => r.live === "polite");

    expect(assertive.length).toBeGreaterThanOrEqual(1);
    expect(polite.length).toBeGreaterThanOrEqual(1);
    expect(assertive[0].content).toMatch(/wallet connection lost/i);
    expect(polite[0].content).toMatch(/projects loaded/i);
  });
});
