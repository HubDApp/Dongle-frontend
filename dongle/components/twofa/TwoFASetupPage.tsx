"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { toast } from "sonner";
import { useTwoFA } from "@/context/twofa.context";
import { useWallet } from "@/context/wallet.context";
import {
  smsSetupSchema,
  emailSetupSchema,
  totpSetupSchema,
  type SmsSetupFormData,
  type EmailSetupFormData,
  type TotpSetupFormData,
} from "@/lib/schemas/twofa.schema";
import type { TwoFAMethod } from "@/types/twofa";

// ─── TOTP Setup Sub-component ────────────────────────────────────────────────

function TotpSetupSection() {
  const { config, enableTOTP, generateTotpSecret, generateTotpUri } = useTwoFA();
  const [secret, setSecret] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TotpSetupFormData>({
    resolver: zodResolver(totpSetupSchema),
    defaultValues: {
      secret: "",
      code: "",
    },
  });

  // Generate a new secret on first render
  useEffect(() => {
    const newSecret = generateTotpSecret();
    setSecret(newSecret);
    setValue("secret", newSecret);
  }, [generateTotpSecret, setValue]);

  const handleCopySecret = useCallback(() => {
    navigator.clipboard.writeText(secret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Secret key copied to clipboard");
  }, [secret]);

  const handleVerify = useCallback(
    async (data: TotpSetupFormData) => {
      enableTOTP(data.secret);
      toast.success("TOTP authentication enabled successfully");
    },
    [enableTOTP],
  );

  const isEnabled = config.methods.totp.enabled && config.methods.totp.totpVerified;

  if (isEnabled) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
          <CheckCheck className="w-5 h-5" />
          <span className="font-medium">Authenticator App Enabled</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500">
          TOTP is active. Use your authenticator app to generate codes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Set up your authenticator app
        </p>
        <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 list-decimal list-inside">
          <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
          <li>Tap "Add" or "+" and select "Enter a setup key"</li>
          <li>Paste the secret key below or scan it manually</li>
          <li>Enter the 6-digit code from the app to verify</li>
        </ol>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Secret Key</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showSecret ? "text" : "password"}
              value={secret}
              readOnly
              className="w-full font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-10 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label={showSecret ? "Hide secret key" : "Show secret key"}
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySecret}
            className="shrink-0"
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleVerify)} className="space-y-3">
        <input type="hidden" {...register("secret")} />

        <FormField
          label="Verification Code"
          placeholder="000000"
          maxLength={6}
          {...register("code")}
          error={errors.code?.message}
        />

        <Button type="submit" className="w-full">
          Verify & Enable TOTP
        </Button>
      </form>
    </div>
  );
}

// ─── Backup Codes Sub-component ──────────────────────────────────────────────

function BackupCodesSection() {
  const { backupCodes, regenerateBackupCodes, config } = useTwoFA();
  const [showCodes, setShowCodes] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  const unusedCodes = backupCodes.filter((bc) => !bc.used);
  const usedCodes = backupCodes.filter((bc) => bc.used);

  const handleRegenerate = useCallback(() => {
    const confirmed = window.confirm(
      "Regenerating backup codes will invalidate all existing codes. Continue?",
    );
    if (confirmed) {
      regenerateBackupCodes();
      setShowCodes(true);
      toast.success("New backup codes generated");
    }
  }, [regenerateBackupCodes]);

  const handleCopyAll = useCallback(() => {
    const codesText = unusedCodes.map((bc) => bc.code).join("\n");
    navigator.clipboard.writeText(codesText).catch(() => {});
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
    toast.success("Backup codes copied to clipboard");
  }, [unusedCodes]);

  const hasCodes = backupCodes.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {unusedCodes.length} unused code{unusedCodes.length !== 1 ? "s" : ""}
          </p>
          {usedCodes.length > 0 && (
            <p className="text-xs text-zinc-500">
              {usedCodes.length} used code{usedCodes.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {hasCodes && (
            <Button type="button" variant="ghost" size="sm" onClick={handleCopyAll}>
              {codesCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCodes(!showCodes)}
          >
            {showCodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCodes ? "Hide" : "View"}
          </Button>
        </div>
      </div>

      {showCodes && (
        <div className="space-y-2">
          {hasCodes ? (
            <>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 font-mono text-sm space-y-1.5">
                {unusedCodes.map((bc) => (
                  <div key={bc.code} className="flex items-center justify-between">
                    <span className="tracking-wider text-zinc-800 dark:text-zinc-200">
                      {bc.code}
                    </span>
                    <span className="text-[10px] text-green-600 font-medium uppercase">Active</span>
                  </div>
                ))}
                {usedCodes.map((bc) => (
                  <div key={bc.code} className="flex items-center justify-between opacity-40 line-through">
                    <span className="tracking-wider text-zinc-800 dark:text-zinc-200">
                      {bc.code}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase">Used</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Store these codes securely. Each code can only be used once.
              </p>
            </>
          ) : (
            <div className="text-center py-4 text-zinc-500 text-sm">
              <p>No backup codes generated yet.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="mt-2"
              >
                Generate Backup Codes
              </Button>
            </div>
          )}

          {hasCodes && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="text-xs"
            >
              Regenerate Codes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Setup Component ────────────────────────────────────────────────────

export default function TwoFASetupPage() {
  const {
    config,
    isEnabled,
    isRequiredForSubmissions,
    enable,
    disable,
    enableSMS,
    enableEmail,
    disableMethod,
    maskedPhoneNumber,
    maskedEmail,
    setRequiredForSubmissions,
    availableMethods,
    loading,
  } = useTwoFA();
  const { isConnected, publicKey } = useWallet();

  const [activeSection, setActiveSection] = useState<TwoFAMethod | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // SMS setup form
  const smsForm = useForm<SmsSetupFormData>({
    resolver: zodResolver(smsSetupSchema),
    defaultValues: { phoneNumber: "", code: "" },
  });

  // Email setup form
  const emailForm = useForm<EmailSetupFormData>({
    resolver: zodResolver(emailSetupSchema),
    defaultValues: { emailAddress: "", code: "" },
  });

  const handleEnableSMS = useCallback(
    (data: SmsSetupFormData) => {
      enableSMS(data.phoneNumber);
      toast.success("SMS verification enabled");
      setActiveSection(null);
      smsForm.reset();
    },
    [enableSMS, smsForm],
  );

  const handleEnableEmail = useCallback(
    (data: EmailSetupFormData) => {
      enableEmail(data.emailAddress);
      toast.success("Email verification enabled");
      setActiveSection(null);
      emailForm.reset();
    },
    [enableEmail, emailForm],
  );

  const handleToggleGlobal = useCallback(() => {
    if (isEnabled) {
      setShowDisableConfirm(true);
    } else {
      enable();
      toast.success("Two-factor authentication enabled");
    }
  }, [isEnabled, enable]);

  const handleConfirmDisable = useCallback(() => {
    disable();
    setShowDisableConfirm(false);
    toast.success("Two-factor authentication disabled");
  }, [disable]);

  const handleToggleSubmissionRequirement = useCallback(() => {
    setRequiredForSubmissions(!isRequiredForSubmissions);
    toast.success(
      isRequiredForSubmissions
        ? "2FA no longer required for form submissions"
        : "2FA required for form submissions",
    );
  }, [isRequiredForSubmissions, setRequiredForSubmissions]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-zinc-400">Loading 2FA configuration...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card variant="glass" padding="lg" className="w-full max-w-2xl mx-auto text-center py-12">
        <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Please connect your Stellar wallet to manage two-factor authentication settings.
        </p>
      </Card>
    );
  }

  // ── Determine which methods have a masked value for display ────────────────

  const smsConfigured = config.methods.sms.enabled && config.methods.sms.phoneNumber;
  const emailConfigured = config.methods.email.enabled && config.methods.email.emailAddress;
  const totpConfigured = config.methods.totp.enabled && config.methods.totp.totpVerified;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-blue-500 rounded-2xl text-white mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Two-Factor Authentication
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Add an extra layer of security to your account by requiring a verification
          code in addition to your wallet connection.
        </p>
      </div>

      {/* Global Toggle */}
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">2FA Status</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isEnabled
                ? "Two-factor authentication is active"
                : "Two-factor authentication is disabled"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleGlobal}
              className="sr-only peer"
              aria-label="Toggle two-factor authentication"
            />
            <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full peer peer-checked:bg-blue-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* Disable confirmation */}
        {showDisableConfirm && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl space-y-3 mt-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Disable 2FA?</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-500">
              Disabling two-factor authentication will remove all configured methods and backup codes.
            </p>
            <div className="flex gap-3">
              <Button
                variant="error"
                size="sm"
                onClick={handleConfirmDisable}
              >
                Yes, Disable
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisableConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Submission requirement toggle (only when enabled) */}
        {isEnabled && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require for form submissions</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  When enabled, 2FA verification will be required when submitting forms
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequiredForSubmissions}
                  onChange={handleToggleSubmissionRequirement}
                  className="sr-only peer"
                  aria-label="Require 2FA for form submissions"
                />
                <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full peer peer-checked:bg-blue-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Methods Configuration (only when enabled) */}
      {isEnabled && (
        <>
          {/* SMS Verification */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">SMS Verification</h3>
                  {smsConfigured && maskedPhoneNumber ? (
                    <p className="text-xs text-zinc-500">{maskedPhoneNumber}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">Not configured</p>
                  )}
                </div>
              </div>
              {smsConfigured ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => disableMethod("sms")}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection(activeSection === "sms" ? null : "sms")}
                >
                  {activeSection === "sms" ? "Cancel" : <><Plus className="w-4 h-4" /> Add</>}
                </Button>
              )}
            </div>

            {activeSection === "sms" && !smsConfigured && (
              <form onSubmit={smsForm.handleSubmit(handleEnableSMS)} className="space-y-3">
                <FormField
                  label="Phone Number"
                  placeholder="+1234567890"
                  {...smsForm.register("phoneNumber")}
                  error={smsForm.formState.errors.phoneNumber?.message}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enter your phone number including country code. You will receive a verification code via SMS.
                </p>
                <Button type="submit" className="w-full">
                  Send Verification Code
                </Button>
              </form>
            )}
          </Card>

          {/* Email Verification */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Email Verification</h3>
                  {emailConfigured && maskedEmail ? (
                    <p className="text-xs text-zinc-500">{maskedEmail}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">Not configured</p>
                  )}
                </div>
              </div>
              {emailConfigured ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => disableMethod("email")}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection(activeSection === "email" ? null : "email")}
                >
                  {activeSection === "email" ? "Cancel" : <><Plus className="w-4 h-4" /> Add</>}
                </Button>
              )}
            </div>

            {activeSection === "email" && !emailConfigured && (
              <form onSubmit={emailForm.handleSubmit(handleEnableEmail)} className="space-y-3">
                <FormField
                  label="Email Address"
                  placeholder="user@example.com"
                  type="email"
                  {...emailForm.register("emailAddress")}
                  error={emailForm.formState.errors.emailAddress?.message}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enter your email address. You will receive a verification code via email.
                </p>
                <Button type="submit" className="w-full">
                  Send Verification Code
                </Button>
              </form>
            )}
          </Card>

          {/* TOTP (Authenticator App) */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Authenticator App (TOTP)</h3>
                  {totpConfigured ? (
                    <p className="text-xs text-green-600 dark:text-green-400">Configured and verified</p>
                  ) : (
                    <p className="text-xs text-zinc-500">Not configured</p>
                  )}
                </div>
              </div>
              {totpConfigured && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => disableMethod("totp")}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {!totpConfigured && <TotpSetupSection />}
          </Card>

          {/* Backup Codes */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Backup Codes</h3>
                <p className="text-xs text-zinc-500">
                  Use a backup code if you lose access to your other methods
                </p>
              </div>
            </div>
            <BackupCodesSection />
          </Card>
        </>
      )}

      {/* Summary (when enabled) */}
      {isEnabled && (
        <Card variant="outline" padding="md" className="text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            2FA is <span className="text-green-600 dark:text-green-400 font-medium">active</span>
            {isRequiredForSubmissions && " and required for form submissions"}.
            {availableMethods.length > 0 && (
              <> {availableMethods.length} method{availableMethods.length !== 1 ? "s" : ""} configured.</>
            )}
          </p>
        </Card>
      )}
    </div>
  );
}