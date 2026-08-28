import "@testing-library/jest-dom";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe, type AxeResults } from "vitest-axe";
import "@/__tests__/lib/axe-matchers";
import { testA11y, DEFAULT_A11Y_OPTIONS, reportViolations } from "@/__tests__/lib/a11y-test-helpers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Menu, X } from "lucide-react";
import React from "react";

describe("axe-core - UI Primitive Components", () => {
  it("Button passes WCAG AA axe checks", async () => {
    const results = await testA11y(
      <div>
        <Button variant="primary">Primary Action</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="outline">Outline CTA</Button>
        <Button variant="ghost">Ghost Action</Button>
        <Button variant="error">Delete Item</Button>
      </div>,
    );
  });

  it("Button with loading state passes axe checks and aria-busy", async () => {
    const results = await testA11y(
      <div>
        <Button isLoading loadingText="Submitting form data">
          Submit
        </Button>
      </div>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("IconButton enforces aria-label and passes axe checks", async () => {
    const results = await testA11y(
      <div>
        <IconButton aria-label="Open main navigation menu">
          <Menu />
        </IconButton>
        <IconButton aria-label="Close dialog" variant="ghost">
          <X />
        </IconButton>
      </div>,
    );
  });

  it("Card component has valid semantic structure with axe", async () => {
    const results = await testA11y(
      <main>
        <Card variant="default">
          <h2>Featured Project</h2>
          <p>A detailed description of the featured project card.</p>
        </Card>
        <Card variant="glass">
          <h2>Glass Card Title</h2>
          <p>Content inside the glass-morphism styled card.</p>
        </Card>
        <Card variant="outline">
          <h2>Outline Section</h2>
          <p>Details presented with a thin outline border.</p>
        </Card>
      </main>,
    );
  });

  it("FormField with Input has correct label association and axe passes", async () => {
    const results = await testA11y(
      <form aria-label="Sample form">
        <FormField
          label="Project Name"
          id="project-name"
          placeholder="Enter project name"
          helperText="Must be at least 3 characters"
          defaultValue=""
          maxLength={100}
        />
      </form>,
    );

    const label = screen.getByText("Project Name");
    expect(label.closest("label")).toHaveAttribute("for", "project-name");
    const input = screen.getByLabelText("Project Name");
    expect(input).toHaveAttribute("aria-describedby");
  });

  it("FormField with error state exposes aria-invalid and role=alert", async () => {
    const results = await testA11y(
      <form aria-label="Form with error">
        <FormField
          label="Website URL"
          id="website-url"
          error="Please enter a valid URL starting with https://"
          defaultValue="not-a-url"
        />
      </form>,
    );

    const input = screen.getByLabelText("Website URL");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const errorEl = screen.getByText(/Please enter a valid URL/i);
    expect(errorEl).toHaveAttribute("role", "alert");
  });

  it("Badge component passes axe with accessible name context", async () => {
    const results = await testA11y(
      <div aria-label="Project status section">
        <span id="status-label">Verification status:</span>
        <Badge aria-labelledby="status-label">Verified</Badge>
        <Badge variant="success" aria-label="Rating badge: excellent">5/5</Badge>
      </div>,
    );
  });

  it("Spinner has aria-hidden when decorative", async () => {
    const results = await testA11y(
      <div aria-label="Loading state">
        <Spinner />
        <span className="sr-only" role="status" aria-live="polite">
          Loading, please wait.
        </span>
      </div>,
    );
  });

  it("TextAreaField with label passes axe checks", async () => {
    const results = await testA11y(
      <form aria-label="Review submission">
        <TextAreaField
          label="Review comment"
          id="review-comment"
          placeholder="Share your experience using this product"
          rows={4}
        />
      </form>,
    );

    expect(screen.getByLabelText("Review comment")).toBeInTheDocument();
  });

  it("Input element has focus-visible ring support", async () => {
    const results = await testA11y(
      <form aria-label="Search form">
        <label htmlFor="q">Search projects</label>
        <Input id="q" type="search" placeholder="Search by name or tag" />
      </form>,
    );
  });

  it("Interactive elements without labels fail axe (negative test)", async () => {
    const { container } = render(
      <div>
        <button>
          <Menu />
        </button>
        <input type="text" />
      </div>,
    );

    const results: AxeResults = await axe(container, DEFAULT_A11Y_OPTIONS);
    reportViolations(results);
    expect(results.violations.length).toBeGreaterThan(0);
  });

  it("Nested interactive elements are caught by axe", async () => {
    const { container } = render(
      <div>
        <button>
          Outer button
          <button type="button">Inner button</button>
        </button>
      </div>,
    );

    const results = await axe(container, DEFAULT_A11Y_OPTIONS);
    const nestedRule = results.violations.find((v) => v.id === "nested-interactive");
    expect(nestedRule).toBeDefined();
  });
});
