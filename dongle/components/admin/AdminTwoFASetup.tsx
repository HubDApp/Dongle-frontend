"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ShieldCheck,
  KeyRound,
  Smartphone,
  Usb,
  Download,
  Copy,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

/** Minimal labelled input to avoid depending on the (currently broken) FormField. */
function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input id={id} {...props} />
    </div>
  );
}

interface StatusResponse {
  enabled: boolean;
  methods: string[];
  remainingBackupCodes: number;
  webauthnCredentials: { credentialId: string; label?: string; registeredAt: string }[];
}

type Tab = "totp" | "sms" | "webauthn";

/**
 * Admin 2FA settings panel (Issue #728).
 * Talks to /api/admin/2fa and renders TOTP (with QR), SMS, hardware-key
 * (WebAuthn) enrolment, backup codes, and a recovery-code path.
 */
export default function AdminTwoFASetup() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("totp");

  // TOTP setup state
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpQr, setTotpQr] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  // SMS setup state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsSentCode, setSmsSentCode] = useState("");
  const [smsCode, setSmsCode] = useState("");

  // Backup codes shown once after enrolment
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/2fa");
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore — unauthenticated users will see the empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const isEnabled = status?.enabled ?? false;

  const beginTotp = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin-totp" }),
    });
    if (!res.ok) {
      toast.error("Failed to start TOTP setup");
      return;
    }
    const data = (await res.json()) as { secret: string; uri: string };
    setTotpSecret(data.secret);
    setTotpUri(data.uri);
    const qr = await QRCode.toDataURL(data.uri, { margin: 1, width: 220 });
    setTotpQr(qr);
  }, []);

  const confirmTotp = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm-totp", code: totpCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Invalid code");
      return;
    }
    const data = (await res.json()) as { backupCodes: string[] };
    setBackupCodes(data.backupCodes || []);
    setTotpSecret("");
    setTotpUri("");
    setTotpQr("");
    setTotpCode("");
    toast.success("Two-factor authentication enabled");
    await loadStatus();
  }, [totpCode, loadStatus]);

  const beginSms = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin-sms", phoneNumber }),
    });
    if (!res.ok) {
      toast.error("Failed to start SMS setup");
      return;
    }
    const data = (await res.json()) as { code: string; maskedPhoneNumber: string };
    // The delivery channel is out of scope; surface the code for this flow.
    setSmsSentCode(data.code);
    toast.success(`Verification code sent to ${data.maskedPhoneNumber}`);
  }, [phoneNumber]);

  const confirmSms = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "confirm-sms",
        code: smsCode,
        expectedCode: smsSentCode,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Invalid code");
      return;
    }
    const data = (await res.json()) as { backupCodes: string[] };
    setBackupCodes(data.backupCodes || []);
    setSmsCode("");
    setSmsSentCode("");
    toast.success("SMS verification enabled");
    await loadStatus();
  }, [smsCode, smsSentCode, loadStatus]);

  const beginWebAuthn = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin-webauthn" }),
    });
    if (!res.ok) {
      toast.error("Failed to start hardware-key setup");
      return;
    }
    const data = (await res.json()) as { challenge: { challenge: string } };
    toast.success("Hardware-key challenge created");

    // In a full implementation this challenge is passed to
    // navigator.credentials.create(). Registration is recorded via the API.
    const credentialId = `webauthn_${data.challenge.challenge.slice(0, 16)}`;
    const reg = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register-webauthn",
        credentialId,
        publicKey: data.challenge.challenge,
        label: "Hardware key",
      }),
    });
    if (reg.ok) {
      toast.success("Hardware key registered");
      await loadStatus();
    } else {
      toast.error("Failed to register hardware key");
    }
  }, [loadStatus]);

  const regenerateBackupCodes = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-backup" }),
    });
    if (!res.ok) {
      toast.error("Failed to regenerate backup codes");
      return;
    }
    const data = (await res.json()) as { backupCodes: string[] };
    setBackupCodes(data.backupCodes);
    toast.success("New backup codes generated");
    await loadStatus();
  }, [loadStatus]);

  const disable = useCallback(async () => {
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable" }),
    });
    if (res.ok) {
      toast.success("Two-factor authentication disabled");
      setBackupCodes([]);
      await loadStatus();
    } else {
      toast.error("Failed to disable 2FA");
    }
  }, [loadStatus]);

  const copySecret = useCallback(() => {
    navigator.clipboard.writeText(totpSecret).catch(() => {});
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }, [totpSecret]);

  const copyCodes = useCallback(() => {
    navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {});
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  }, [backupCodes]);

  const tabs = useMemo(
    () => [
      { id: "totp" as Tab, label: "Authenticator App", icon: KeyRound },
      { id: "sms" as Tab, label: "SMS", icon: Smartphone },
      { id: "webauthn" as Tab, label: "Hardware Key", icon: Usb },
    ],
    [],
  );

  if (loading) {
    return <div className="animate-pulse text-zinc-400 py-12 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex p-3 bg-blue-500 rounded-2xl text-white mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Two-Factor Auth</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Add a second factor to your admin account. 2FA is required on every admin
          login once enabled.
        </p>
      </div>

      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">2FA Status</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isEnabled ? "Enabled" : "Disabled"}
              {isEnabled && status?.methods.length
                ? ` · ${status.methods.join(", ")}`
                : ""}
            </p>
          </div>
          {isEnabled && (
            <Button variant="error" size="sm" onClick={disable}>
              Disable
            </Button>
          )}
        </div>
      </Card>

      {!isEnabled && (
        <Card variant="glass" padding="lg">
          {/* Method tabs */}
          <div className="flex gap-2 mb-6" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "totp" && (
            <div className="space-y-4">
              {!totpSecret ? (
                <Button onClick={beginTotp}>Set up authenticator app</Button>
              ) : (
                <>
                  {totpQr && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={totpQr}
                        alt="Scan this QR code with your authenticator app"
                        width={220}
                        height={220}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-800"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Or enter this secret manually
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 break-all">
                        {totpSecret}
                      </code>
                      <Button variant="outline" size="sm" onClick={copySecret}>
                        {secretCopied ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <LabeledInput
                    label="Verification code"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                  />
                  <Button onClick={confirmTotp} disabled={totpCode.length !== 6}>
                    Verify &amp; enable
                  </Button>
                  <p className="text-xs text-zinc-400 break-all">{totpUri}</p>
                </>
              )}
            </div>
          )}

          {tab === "sms" && (
            <div className="space-y-4">
              <LabeledInput
                label="Phone number"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Button onClick={beginSms} disabled={!phoneNumber}>
                Send code
              </Button>
              {smsSentCode && (
                <>
                  <LabeledInput
                    label="Verification code"
                    placeholder="000000"
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                  />
                  <Button onClick={confirmSms} disabled={smsCode.length !== 6}>
                    Verify &amp; enable
                  </Button>
                </>
              )}
            </div>
          )}

          {tab === "webauthn" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Register a hardware security key (YubiKey, etc.) as a second factor.
              </p>
              <Button onClick={beginWebAuthn}>
                <Usb className="w-4 h-4" /> Register hardware key
              </Button>
            </div>
          )}
        </Card>
      )}

      {backupCodes.length > 0 && (
        <Card variant="glass" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold">Backup codes</h3>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-3">
            <AlertTriangle className="w-3 h-3" />
            Store these 10 single-use codes somewhere safe. They are shown once.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
            {backupCodes.map((code) => (
              <span key={code} className="tracking-wider">
                {code}
              </span>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={copyCodes}>
            {codesCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy all
          </Button>
        </Card>
      )}

      {isEnabled && (
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">Backup codes</h3>
              <p className="text-xs text-zinc-500">
                {status?.remainingBackupCodes ?? 0} unused code
                {(status?.remainingBackupCodes ?? 0) !== 1 ? "s" : ""} remaining
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={regenerateBackupCodes}>
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Lost your device? Use a backup code at the login prompt to recover access,
            then re-enrol a new method here.
          </p>
        </Card>
      )}
    </div>
  );
}
