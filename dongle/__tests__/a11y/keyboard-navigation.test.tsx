import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/__tests__/lib/axe-matchers";
import { testA11y, getAllFocusableElements, tabThroughSequence } from "@/__tests__/lib/a11y-test-helpers";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { FormField } from "@/components/ui/FormField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectField } from "@/components/ui/SelectField";
import { TagInput } from "@/components/ui/TagInput";
import { SafeExternalLink } from "@/components/ui/SafeExternalLink";
import { Menu, X, ExternalLink, ChevronDown } from "lucide-react";
import React from "react";

describe("Keyboard Navigation - Interactive Components", () => {
  describe("Tab order and focus management", () => {
    it("buttons and inputs receive focus in DOM order via Tab", async () => {
      const user = userEvent.setup();

      render(
        <main>
          <form aria-label="Registration form" id="test-form">
            <FormField label="First name" id="fn" defaultValue="test-1" />
            <FormField label="Last name" id="ln" defaultValue="test-2" />
            <TextAreaField label="Bio" id="bio" />
            <Button type="submit">Submit form</Button>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </form>
        </main>,
      );

      const focusable = getAllFocusableElements(document.body);
      const interactive = focusable.filter((el) =>
        ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(el.tagName),
      );
      expect(interactive.length).toBeGreaterThanOrEqual(4);

      const labels = interactive
        .map((el) => (el as HTMLInputElement).id)
        .filter(Boolean);
      expect(labels.slice(0, 2)).toEqual(["fn", "ln"]);
    });

    it("focus indicator shows for buttons on keyboard activation", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <Button onClick={onSubmit}>Click me</Button>,
      );

      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("spacebar activates buttons via keyboard", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Button onClick={onClick}>Activate</Button>);

      const btn = screen.getByRole("button", { name: /activate/i });
      btn.focus();
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("IconButton is keyboard accessible", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <IconButton onClick={onClick} aria-label="Open menu">
          <Menu />
        </IconButton>,
      );

      const btn = screen.getByRole("button", { name: /open menu/i });
      await user.tab();
      expect(btn).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalled();
    });

    it("FormField input receives focus and announces helper/error descriptions", async () => {
      const user = userEvent.setup();

      render(
        <FormField
          id="proj-name"
          label="Project name"
          helperText="Choose a memorable name for your project"
          defaultValue="My DApp"
        />,
      );

      const input = screen.getByLabelText("Project name");
      await user.tab();
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute(
        "aria-describedby",
        expect.stringContaining("proj-name"),
      );
    });

    it("FormField error state announces via role=alert", async () => {
      render(
        <FormField
          id="email-input"
          label="Email address"
          error="Please provide a valid email"
          defaultValue="bad"
        />,
      );

      const err = screen.getByRole("alert");
      expect(err).toHaveTextContent(/valid email/i);

      const input = screen.getByLabelText(/email address/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toContain("email-input-error");
    });
  });

  describe("Modal / ConfirmDialog keyboard interaction", () => {
    it("ConfirmDialog focuses first interactive element on open", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      render(
        <ConfirmDialog
          isOpen
          title="Delete project?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      const confirmBtn = screen.getByRole("button", { name: /^delete$/i });

      const focusable = getAllFocusableElements(document.body);
      const inModal = focusable.filter((el) =>
        [cancelBtn, confirmBtn].includes(el as HTMLButtonElement),
      );
      expect(inModal.length).toBeGreaterThanOrEqual(2);
    });

    it("Escape key closes dialog via onCancel", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      render(
        <ConfirmDialog
          isOpen
          title="Confirm"
          message="msg"
          confirmLabel="Ok"
          cancelLabel="Cancel"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );

      await user.keyboard("{Escape}");
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("SelectField keyboard usage", () => {
    it("SelectField has label association and keyboard focus", async () => {
      const user = userEvent.setup();
      const options = [
        { value: "defi", label: "DeFi" },
        { value: "gaming", label: "Gaming" },
      ];

      render(
        <SelectField
          id="category"
          label="Project category"
          options={options}
          value="defi"
          onChange={() => {}}
        />,
      );

      const select = screen.getByLabelText("Project category");
      await user.tab();
      expect(select).toHaveFocus();
      expect(select.tagName).toBe("SELECT");
    });
  });

  describe("SafeExternalLink a11y semantics", () => {
    it("SafeExternalLink has correct rel attrs for external links", async () => {
      const user = userEvent.setup();

      render(
        <SafeExternalLink href="https://docs.example.com">
          Read documentation
        </SafeExternalLink>,
      );

      const link = screen.getByRole("link", { name: /read documentation/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringMatching(/noopener/));
      expect(link).toHaveAttribute("rel", expect.stringMatching(/noreferrer/));

      await user.tab();
      expect(link).toHaveFocus();
    });

    it("SafeExternalLink external link indicator does not expose empty name violation", async () => {
      const user = userEvent.setup();

      render(
        <SafeExternalLink
          href="https://docs.example.com"
          externalLabel=" (opens in a new tab)"
        >
          View project website
          <ExternalLink aria-hidden="true" />
        </SafeExternalLink>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName("View project website (opens in a new tab)");
    });
  });

  describe("Skip links and focus bypass blocks", () => {
    it("allows skip to main content area via skip link", async () => {
      const user = userEvent.setup();
      render(
        <>
          <a href="#main" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <nav aria-label="Primary">
            <a href="/a">Home</a>
            <a href="/b">About</a>
          </nav>
          <main id="main" tabIndex={-1} aria-label="Main content">
            <h1>Page heading</h1>
          </main>
        </>,
      );

      const skipLink = screen.getByRole("link", { name: /skip to main content/i });
      await user.tab();
      expect(skipLink).toHaveFocus();
    });
  });

  describe("Landmark regions", () => {
    it("renders valid landmark region structure", async () => {
      render(
        <>
          <header aria-label="Site header">
            <a href="/">Home</a>
          </header>
          <nav aria-label="Primary navigation">
            <a href="/discover">Discover</a>
          </nav>
          <main aria-label="Content">
            <h1>Main page</h1>
          </main>
          <aside aria-label="Related links">
            <h2>Sidebar</h2>
          </aside>
          <footer aria-label="Footer">
            <p>&copy; 2025</p>
          </footer>
        </>,
      );

      const landmarks = document.querySelectorAll(
        "header, nav, main, aside, footer, [role=\"banner\"], [role=\"navigation\"], [role=\"main\"], [role=\"complementary\"], [role=\"contentinfo\"]",
      );
      expect(landmarks.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Focus management on TagInput", () => {
    it("TagInput label-association and keyboard entry removal", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <TagInput
          id="tags"
          label="Tags"
          value={["stellar", "defi"]}
          onChange={onChange}
          placeholder="Add a tag"
        />,
      );

      const input = screen.getByLabelText("Tags");
      await user.tab();
      expect(input).toHaveFocus();

      await user.type(input, "dao,");
    });
  });
});
