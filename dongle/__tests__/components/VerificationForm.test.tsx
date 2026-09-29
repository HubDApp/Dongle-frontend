import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerificationForm from "@/components/verify/VerificationForm";

const mockRequestVerification = vi.fn();

vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: {
    requestVerification: (...args: unknown[]) => mockRequestVerification(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackVerificationRequest: vi.fn(),
}));

describe("VerificationForm", () => {
  const defaultOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestVerification.mockResolvedValue({ hash: "req-123", status: "SUCCESS" });
  });

  it("renders the form with required fields", () => {
    render(<VerificationForm />);

    expect(screen.getByText("Request Verification")).toBeInTheDocument();
    expect(screen.getByText("Submit your project for community review.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Project ID or Domain/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Request/i })).toBeInTheDocument();
  });

  it("renders the shield icon", () => {
    const { container } = render(<VerificationForm />);
    const svgIcon = container.querySelector("svg");
    expect(svgIcon).toBeInTheDocument();
  });

  it("shows validation error for empty project ID", async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows validation error for project ID less than 3 characters", async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "ab");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("accepts valid project ID of 3 or more characters", async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "myproject.com");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("calls sorobanService.requestVerification with correct payload on submit", async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "test-project-id");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRequestVerification).toHaveBeenCalledWith("test-project-id", "test-project-id");
    });
  });

  it("shows loading state while submitting", async () => {
    let resolveRequest!: (value: unknown) => void;
    mockRequestVerification.mockImplementation(
      () => new Promise((resolve) => { resolveRequest = resolve; })
    );

    const user = userEvent.setup();
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "test-project");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Submitting...")).toBeInTheDocument();
    });

    expect(submitButton).toBeDisabled();

    resolveRequest({ hash: "req-123", status: "SUCCESS" });

    await waitFor(() => {
      expect(screen.getByText("Submit Request")).toBeInTheDocument();
    });
  });

  it("calls onSuccess callback with projectId after successful submission", async () => {
    const user = userEvent.setup();
    render(<VerificationForm onSuccess={defaultOnSuccess} />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "success-project");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(defaultOnSuccess).toHaveBeenCalledWith("success-project");
    });
  });

  it("does not throw when onSuccess is not provided", async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    await user.type(input, "no-callback-project");

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRequestVerification).toHaveBeenCalled();
    });
  });

  it("has accessible form field with label", () => {
    render(<VerificationForm />);

    const input = screen.getByLabelText(/Project ID or Domain/i);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("name", "projectId");
  });

  it("has proper form semantics", () => {
    render(<VerificationForm />);

    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("renders with glass card variant styling", () => {
    const { container } = render(<VerificationForm />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("max-w-lg");
  });

  it("displays placeholder text in the input", () => {
    render(<VerificationForm />);
    const input = screen.getByPlaceholderText(/yourproject\.com/i);
    expect(input).toBeInTheDocument();
  });

  it("input has correct id and name attributes for form submission", () => {
    render(<VerificationForm />);
    const input = screen.getByLabelText(/Project ID or Domain/i);
    expect(input).toHaveAttribute("name", "projectId");
  });
});