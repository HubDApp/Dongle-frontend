import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const PLACEHOLDER = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const REAL = "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

describe("ProductionConfigBanner", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/constants/contracts");
    vi.unstubAllEnvs();
  });

  it("renders nothing in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.doMock("@/constants/contracts", () => ({
      DONGLE_CONTRACTS: {
        PROJECT_REGISTRY: PLACEHOLDER,
        REVIEW_REGISTRY: PLACEHOLDER,
        VERIFICATION_REGISTRY: PLACEHOLDER,
      },
      hasPlaceholderContracts: () => true,
    }));

    const { default: ProductionConfigBanner } = await import(
      "../../components/layout/ProductionConfigBanner"
    );
    const { container } = render(<ProductionConfigBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an alert when production still has placeholder contracts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/constants/contracts", () => ({
      DONGLE_CONTRACTS: {
        PROJECT_REGISTRY: PLACEHOLDER,
        REVIEW_REGISTRY: PLACEHOLDER,
        VERIFICATION_REGISTRY: PLACEHOLDER,
      },
      hasPlaceholderContracts: () => true,
    }));

    const { default: ProductionConfigBanner } = await import(
      "../../components/layout/ProductionConfigBanner"
    );
    render(<ProductionConfigBanner />);
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/Production configuration incomplete/i);
    expect(
      screen.getByRole("link", { name: /Deployment checklist/i }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("DEPLOYMENT.md"),
    );
  });

  it("renders nothing when production contracts are real", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/constants/contracts", () => ({
      DONGLE_CONTRACTS: {
        PROJECT_REGISTRY: REAL,
        REVIEW_REGISTRY: REAL,
        VERIFICATION_REGISTRY: REAL,
      },
      hasPlaceholderContracts: () => false,
    }));

    const { default: ProductionConfigBanner } = await import(
      "../../components/layout/ProductionConfigBanner"
    );
    const { container } = render(<ProductionConfigBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
