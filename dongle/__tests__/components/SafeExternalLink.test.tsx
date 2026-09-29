import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SafeExternalLink } from "@/components/ui/SafeExternalLink";
import { useConfirm } from "@/hooks/useConfirm";

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
}));

describe("SafeExternalLink", () => {
  const confirmMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfirm).mockReturnValue(confirmMock);
  });

  it("opens verified approved destinations without a confirmation interstitial", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <SafeExternalLink
        href="https://secure-test.xyz"
        verificationStatus="VERIFIED"
        approvedUrls={["https://secure-test.xyz"]}
      >
        Website
      </SafeExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Website" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(link);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://secure-test.xyz",
      "_blank",
      "noopener,noreferrer",
    );

    windowOpenSpy.mockRestore();
  });

  it("shows the full destination before opening an unknown domain", async () => {
    confirmMock.mockResolvedValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <SafeExternalLink href="https://unknown-phish.example/wallet" verificationStatus="NONE">
        Website
      </SafeExternalLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Website" }));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationDomain: "unknown-phish.example",
        destinationUrl: "https://unknown-phish.example/wallet",
      }),
    );
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://unknown-phish.example/wallet",
        "_blank",
        "noopener,noreferrer",
      );
    });

    windowOpenSpy.mockRestore();
  });

  it("does not open the link when the interstitial is cancelled", async () => {
    confirmMock.mockResolvedValue(false);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <SafeExternalLink href="https://unknown-phish.example" verificationStatus="NONE">
        Website
      </SafeExternalLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Website" }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(windowOpenSpy).not.toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });
});
