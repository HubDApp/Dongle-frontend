import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import TwoFAVerification from "@/components/twofa/TwoFAVerification";

// Mock the 2FA context
const mockVerifyCode = vi.fn();
const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockClearSession = vi.fn();

vi.mock("@/context/twofa.context", () => ({
  useTwoFA: () => ({
    availableMethods: ["sms", "email", "totp"],
    createSession: mockCreateSession,
    verifyCode: mockVerifyCode,
    maskedPhoneNumber: "+1***7890",
    maskedEmail: "us***@example.com",
    remainingBackupCodeCount: 5,
    backupCodes: [],
    config: {
      enabled: true,
      methods: {
        sms: { enabled: true, phoneNumber: "+1***7890" },
        email: { enabled: true, emailAddress: "us***@example.com" },
        totp: { enabled: true, totpVerified: true },
        backup_code: { enabled: true },
      },
    },
    getSession: mockGetSession,
    clearSession: mockClearSession,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TwoFAVerification", () => {
  const onVerified = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCode.mockResolvedValue({ success: true, method: "totp" });
    mockCreateSession.mockReturnValue({
      method: "sms",
      sentCode: "123456",
      createdAt: Date.now(),
      attemptsRemaining: 3,
    });
  });

  it("renders method selection when no method is selected", () => {
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    expect(screen.getByText("Two-Factor Authentication")).toBeDefined();
    expect(screen.getByText("SMS Code")).toBeDefined();
    expect(screen.getByText("Email Code")).toBeDefined();
    expect(screen.getByText("Authenticator App")).toBeDefined();
    expect(screen.getByText("Use a Backup Code")).toBeDefined();
  });

  it("allows selecting a TOTP method and entering a code", async () => {
    const user = userEvent.setup();
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    // Select TOTP method
    await user.click(screen.getByText("Authenticator App"));

    // Should show code input
    expect(screen.getByLabelText("Verification Code")).toBeDefined();

    // Enter code and verify
    await user.type(screen.getByLabelText("Verification Code"), "123456");
    await user.click(screen.getByText("Verify"));

    expect(mockVerifyCode).toHaveBeenCalledWith("totp", "123456");
  });

  it("shows SMS target when selecting SMS", async () => {
    const user = userEvent.setup();
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    await user.click(screen.getByText("SMS Code"));
    expect(screen.getByText(/Sending to/)).toBeDefined();
  });

  it("calls onVerified when verification succeeds", async () => {
    mockVerifyCode.mockResolvedValue({ success: true, method: "totp" });

    const user = userEvent.setup();
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    await user.click(screen.getByText("Authenticator App"));
    await user.type(screen.getByLabelText("Verification Code"), "123456");
    await user.click(screen.getByText("Verify"));

    // Wait for async
    await vi.waitFor(() => {
      expect(onVerified).toHaveBeenCalled();
    });
  });

  it("shows error when verification fails", async () => {
    mockVerifyCode.mockResolvedValue({
      success: false,
      method: "totp",
      error: "Invalid code",
    });

    const user = userEvent.setup();
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    await user.click(screen.getByText("Authenticator App"));
    await user.type(screen.getByLabelText("Verification Code"), "000000");
    await user.click(screen.getByText("Verify"));

    await vi.waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeDefined();
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TwoFAVerification onVerified={onVerified} onCancel={onCancel} />,
    );

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});