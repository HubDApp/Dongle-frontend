import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  downloadFormSubmissionPdf,
  downloadPrintableHtml,
} from "@/utils/pdf-export.util";

describe("pdf export (#538)", () => {
  const sample = {
    name: "Soroban Swap",
    primaryCategory: "defi",
    tags: ["amm", "defi"],
    description: "A decentralized exchange on Stellar.",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com/example/repo",
    logoUrl: "https://example.com/logo.png",
    docsUrl: "https://docs.example.com",
    auditReportUrl: "https://audit.example.com",
    bugBountyUrl: "",
    contractAddresses: ["C".padEnd(56, "A")],
    submittedAt: "2026-01-01T00:00:00.000Z",
    mode: "create" as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a print-ready window with professional formatting and images", () => {
    const write = vi.fn();
    const close = vi.fn();
    const open = vi.fn().mockReturnValue({
      document: { open: vi.fn(), write, close },
      focus: vi.fn(),
      print: vi.fn(),
    });
    vi.stubGlobal("open", open);

    downloadFormSubmissionPdf(sample, { autoPrint: false });

    expect(open).toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
    const html = String(write.mock.calls[0][0]);
    expect(html).toContain("Dongle · Form Submission Export");
    expect(html).toContain("Soroban Swap");
    expect(html).toContain("page-break");
    expect(html).toContain('class="logo"');
    expect(html).toContain("@media print");
    expect(html).toContain("Print / Save as PDF");
  });

  it("falls back to HTML download when popups are blocked", () => {
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));

    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);
    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadPrintableHtml(sample);

    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });
});
