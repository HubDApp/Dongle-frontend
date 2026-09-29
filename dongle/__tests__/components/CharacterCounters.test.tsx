import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { FormField } from "@/components/ui/FormField";

describe("Character Counters Component Tests", () => {
  describe("TextAreaField Character Counter", () => {
    it("renders current and max length when maxLength is provided", () => {
      render(<TextAreaField label="Description" maxLength={500} value="Hello World" readOnly />);
      const counter = screen.getByText("11 / 500");
      expect(counter).toBeInTheDocument();
    });

    it("updates character count live when user types", () => {
      const TestComponent = () => {
        const [val, setVal] = React.useState("");
        return (
          <TextAreaField
            label="Description"
            maxLength={100}
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        );
      };

      render(<TestComponent />);
      expect(screen.getByText("0 / 100")).toBeInTheDocument();

      const textarea = screen.getByLabelText("Description");
      fireEvent.change(textarea, { target: { value: "Testing live update" } });

      expect(screen.getByText("19 / 100")).toBeInTheDocument();
    });

    it("applies warning styles when approaching limit (>= 90%)", () => {
      const nearLimitText = "a".repeat(92);
      render(<TextAreaField label="Description" maxLength={100} value={nearLimitText} readOnly />);

      const counter = screen.getByText("92 / 100");
      expect(counter).toHaveClass("text-amber-500");
    });

    it("applies error styles and error state when limit is reached or exceeded", () => {
      const atLimitText = "a".repeat(100);
      render(<TextAreaField label="Description" maxLength={100} value={atLimitText} readOnly />);

      const counter = screen.getByText("100 / 100");
      expect(counter).toHaveClass("text-red-500");
      const textarea = screen.getByLabelText("Description");
      expect(textarea).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("FormField Character Counter", () => {
    it("renders current and max length when maxLength is provided", () => {
      render(<FormField label="Project Name" maxLength={50} value="Soroban DApp" readOnly />);
      expect(screen.getByText("12 / 50")).toBeInTheDocument();
    });

    it("updates live when user types in FormField", () => {
      const TestComponent = () => {
        const [val, setVal] = React.useState("");
        return (
          <FormField
            label="Project Name"
            maxLength={50}
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        );
      };

      render(<TestComponent />);
      expect(screen.getByText("0 / 50")).toBeInTheDocument();

      const input = screen.getByLabelText("Project Name");
      fireEvent.change(input, { target: { value: "New DApp Name" } });

      expect(screen.getByText("13 / 50")).toBeInTheDocument();
    });
  });
});
