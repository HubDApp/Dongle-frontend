import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { persistLocale, setLocale } from "@/lib/i18n";

vi.mock("next/navigation", () => {
  const replace = vi.fn();
  return {
    useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  };
});

describe("LanguageSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("en");
  });

  it("renders and can select English, Spanish, and Portuguese", () => {
    render(
      <LocaleProvider>
        <LanguageSelector />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /select language/i }));
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Português" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Español" }));
    expect(localStorage.getItem("dongle_locale")).toBe("es");
  });

  it("keeps a stable min width so longer labels do not collapse the control", () => {
    persistLocale("en");
    const { container } = render(
      <LocaleProvider>
        <LanguageSelector />
      </LocaleProvider>,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("min-w-");
  });
});
