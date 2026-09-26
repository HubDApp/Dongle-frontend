"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck, Smartphone, Mail, KeyRound, HelpCircle, Copy, CheckCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useTwoFA } from "@/context/twofa.context";
import { twoFAVerificationSchema, type TwoFAVerificationFormData } from "@/lib/schemas/twofa.schema";
import type { TwoFAMethod } from "@/types/twofa";
import { toast } from "sonner";

// ─── Props ───────────────────────────────────────────────────────────────────

interface TwoFAVerificationProps {
  /** Called when verification succeeds */
  onVerified: () => void;
  /** Called when the user cancels verification */
  onCancel: () => void;
  /** Optional title for the verification dialog */
  title?: string;
  /** Optional description */
  description?: string;
}

// ─── Method display info ─────────────────────────────────────────────────────

interface MethodInfo {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function getMethodInfo(method: TwoFAMethod): MethodInfo {
  switch (method) {
    case "sms":
      return {
        icon: <Smartphone className="w-5 h-5" />,
        label: "SMS Code",
        description: "Send code via text message",
      };
    case "email":
      return {
        icon: <Mail className="w-5 h-5" />,
        label: "Email Code",
        description: "Send code to your email",
      };
    case "totp":
      return {
        icon: <KeyRound className="w-5 h-5" />,
        label: "Authenticator App",
        description: "Use your TOTP app (e.g. Google Authenticator)",
      };
    case "backup_code":
      return {
        icon: <HelpCircle className="w-5 h-5" />,
        label: "Backup Code",
        description: "Use one of your recovery codes",
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TwoFAVerification({
  onVerified,
  onCancel,
  title = "Two-Factor Authentication",
  description = "Please complete two-factor authentication to continue.",
}: TwoFAVerificationProps) {
  const {
    availableMethods,
    createSession,
    verifyCode,
    maskedPhoneNumber,
    maskedEmail,
    remainingBackupCodeCount,
  } = useTwoFA();

  const [selectedMethod, setSelectedMethod] = useState<TwoFAMethod | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TwoFAVerificationFormData>({
    resolver: zodResolver(twoFAVerificationSchema),
    defaultValues: {
      method: "totp",
      code: "",
    },
  });

  // Focus the input when method is selected
  useEffect(() => {
    if (selectedMethod && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedMethod]);

  const handleSelectMethod = useCallback(
    (method: TwoFAMethod) => {
      setSelectedMethod(method);
      setCodeSent(false);
      setVerificationError(null);
      reset({ method, code: "" });
    },
    [reset],
  );

  const handleSendCode = useCallback(async () => {
    if (!selectedMethod || selectedMethod === "totp" || selectedMethod === "backup_code") {
      // TOTP and backup codes don't need a code sent
      setCodeSent(true);
      return;
    }

    setIsSending(true);
    setVerificationError(null);

    try {
      createSession(selectedMethod);
      setCodeSent(true);
      toast.success(`Verification code sent to ${
        selectedMethod === "sms"
          ? maskedPhoneNumber || "your phone"
          : maskedEmail || "your email"
      }`);
    } catch (error) {
      setVerificationError(
        `Failed to send code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSending(false);
    }
  }, [selectedMethod, createSession, maskedPhoneNumber, maskedEmail]);

  const onSubmitVerification = useCallback(
    async (data: TwoFAVerificationFormData) => {
      if (!selectedMethod) return;

      setIsVerifying(true);
      setVerificationError(null);

      try {
        const result = await verifyCode(selectedMethod, data.code);

        if (result.success) {
          toast.success("Verification successful");
          onVerified();
        } else {
          setVerificationError(result.error || "Verification failed. Please try again.");
        }
      } catch (error) {
        setVerificationError(
          `Verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [selectedMethod, verifyCode, onVerified],
  );

  // If no methods are available, show a fallback
  if (availableMethods.length === 0 && selectedMethod !== "backup_code") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <Card variant="glass" padding="lg" className="w-full max-w-md animate-fade-up">
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">2FA Not Available</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              No two-factor authentication methods are configured. Please set up 2FA in your settings first.
            </p>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card variant="glass" padding="lg" className="w-full max-w-md animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500 rounded-xl text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>

        {/* Method Selection */}
        {!selectedMethod && (
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Choose a verification method:
            </p>
            {availableMethods.map((method) => {
              const info = getMethodInfo(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleSelectMethod(method)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left"
                >
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{info.label}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {method === "sms" && maskedPhoneNumber
                        ? `Code sent to ${maskedPhoneNumber}`
                        : method === "email" && maskedEmail
                          ? `Code sent to ${maskedEmail}`
                          : info.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Backup code option always available if codes exist */}
            {remainingBackupCodeCount > 0 && (
              <button
                type="button"
                onClick={() => handleSelectMethod("backup_code")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left"
              >
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Use a Backup Code</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {remainingBackupCodeCount} code{remainingBackupCodeCount !== 1 ? "s" : ""} remaining
                  </p>
                </div>
              </button>
            )}

            <div className="pt-2">
              <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Verification Form */}
        {selectedMethod && (
          <form onSubmit={handleSubmit(onSubmitVerification)} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {getMethodInfo(selectedMethod).icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{getMethodInfo(selectedMethod).label}</p>
                  {selectedMethod === "sms" && maskedPhoneNumber && (
                    <p className="text-xs text-zinc-500">Sending to {maskedPhoneNumber}</p>
                  )}
                  {selectedMethod === "email" && maskedEmail && (
                    <p className="text-xs text-zinc-500">Sending to {maskedEmail}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMethod(null)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change
              </button>
            </div>

            <input type="hidden" {...register("method")} value={selectedMethod} />

            {/* Send code button (SMS/Email only) */}
            {(selectedMethod === "sms" || selectedMethod === "email") && !codeSent && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                isLoading={isSending}
                onClick={handleSendCode}
              >
                {isSending ? "Sending..." : `Send Code to ${selectedMethod === "sms" ? "Phone" : "Email"}`}
              </Button>
            )}

            {/* Code input (shown once sent for SMS/email, always for TOTP/backup) */}
            {(codeSent || selectedMethod === "totp" || selectedMethod === "backup_code") && (
              <>
                <div>
                  <label htmlFor="2fa-code" className="block text-sm font-medium mb-1.5">
                    {selectedMethod === "backup_code" ? "Backup Code" : "Verification Code"}
                  </label>
                  <Input
                    id="2fa-code"
                    ref={inputRef}
                    {...register("code")}
                    placeholder={
                      selectedMethod === "backup_code"
                        ? "XXXXX-XXXXX"
                        : "000000"
                    }
                    autoComplete="one-time-code"
                    inputMode={selectedMethod === "backup_code" ? "text" : "numeric"}
                    maxLength={selectedMethod === "backup_code" ? 11 : 6}
                    error={!!errors.code?.message || !!verificationError}
                    className="text-center text-lg tracking-widest font-mono"
                  />
                  {errors.code?.message && (
                    <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>
                  )}
                  {verificationError && (
                    <p className="text-xs text-red-500 mt-1">{verificationError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    isLoading={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>

                {/* Resend link for SMS/Email */}
                {(selectedMethod === "sms" || selectedMethod === "email") && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSending}
                    className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    {isSending ? "Sending..." : "Resend code"}
                  </button>
                )}
              </>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}