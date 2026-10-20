"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Copy, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type {
  OwnershipVerificationMethod,
  PublicOwnershipVerification,
} from "@/services/project/ownership-verification.service";

interface OwnershipVerificationPanelProps {
  projectId: string;
  walletAddress: string;
  onVerifiedChange?: (verified: boolean) => void;
}

const METHODS: Array<{
  id: OwnershipVerificationMethod;
  label: string;
  placeholder: string;
}> = [
  { id: "dns_txt", label: "DNS TXT", placeholder: "example.com" },
  { id: "github_file", label: "GitHub file", placeholder: "https://github.com/owner/repository" },
  { id: "stellar_toml", label: "Stellar.toml", placeholder: "example.com" },
];

function verificationUrl(projectId: string, walletAddress: string) {
  const query = new URLSearchParams({ projectId, walletAddress });
  return `/api/projects/ownership-verifications?${query.toString()}`;
}

function instructionsFor(record: PublicOwnershipVerification, token?: string): string {
  if (!token) return "Verification token generated. Keep it available while you publish the proof.";
  if (record.method === "dns_txt") {
    return `Add a TXT record to ${record.target} with the value dongle-verify=${token}.`;
  }
  if (record.method === "github_file") {
    return `Add dongle-verify.txt to the root of ${record.target} on its default branch. The file must contain only ${token}.`;
  }
  return `Serve https://${record.target}/.well-known/stellar.toml with HOME_DOMAIN = "${record.target}", ACCOUNTS = ["${record.walletAddress}"], and DONGLE_VERIFY = "${token}".`;
}

export function OwnershipVerificationPanel({
  projectId,
  walletAddress,
  onVerifiedChange,
}: OwnershipVerificationPanelProps) {
  const [method, setMethod] = useState<OwnershipVerificationMethod>("dns_txt");
  const [target, setTarget] = useState("");
  const [records, setRecords] = useState<PublicOwnershipVerification[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(verificationUrl(projectId, walletAddress), { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { verifications: PublicOwnershipVerification[] };
        if (active) {
          setRecords(body.verifications);
          onVerifiedChange?.(body.verifications.some((record) => record.status === "verified"));
        }
      } catch {
        if (active) onVerifiedChange?.(false);
      }
    };
    const checkPending = async () => {
      try {
        const response = await fetch(verificationUrl(projectId, walletAddress), { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { verifications: PublicOwnershipVerification[] };
        const pending = body.verifications.filter((record) => record.status === "pending");
        if (!pending.length) {
          if (active) {
            setRecords(body.verifications);
            onVerifiedChange?.(body.verifications.some((record) => record.status === "verified"));
          }
          return;
        }
        await Promise.all(pending.map((record) => fetch("/api/projects/ownership-verifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "check",
            projectId,
            walletAddress,
            verificationId: record.id,
          }),
        })));
        await refresh();
      } catch {
        if (active) setFeedback((current) => ({ ...current, poll: "Automatic check failed. Use Verify now to retry." }));
      }
    };

    void refresh();
    const timer = setInterval(() => void checkPending(), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId, walletAddress, onVerifiedChange]);

  const createVerification = async (selectedMethod = method, selectedTarget = target) => {
    if (!selectedTarget.trim()) {
      toast.error("Enter the domain or GitHub repository first.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/projects/ownership-verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          projectId,
          walletAddress,
          method: selectedMethod,
          target: selectedTarget,
        }),
      });
      const body = await response.json() as {
        verification?: PublicOwnershipVerification & { token: string };
        error?: string;
      };
      if (!response.ok || !body.verification) throw new Error(body.error ?? "Could not generate token.");
      setTokens((current) => ({ ...current, [body.verification!.id]: body.verification!.token }));
      setFeedback((current) => ({ ...current, [body.verification!.id]: "Token generated. Publish the proof, then verify ownership." }));
      const listResponse = await fetch(verificationUrl(projectId, walletAddress), { cache: "no-store" });
      if (listResponse.ok) {
        const list = await listResponse.json() as { verifications: PublicOwnershipVerification[] };
        setRecords(list.verifications);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate token.");
    } finally {
      setCreating(false);
    }
  };

  const verifyNow = async (id: string) => {
    setChecking(id);
    try {
      const response = await fetch("/api/projects/ownership-verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", projectId, walletAddress, verificationId: id }),
      });
      const body = await response.json() as { verification?: PublicOwnershipVerification; message?: string; error?: string };
      if (!response.ok || !body.verification) throw new Error(body.error ?? "Verification check failed.");
      setRecords((current) => current.map((record) => record.id === id ? body.verification! : record));
      setFeedback((current) => ({ ...current, [id]: body.message ?? "Verification checked." }));
      onVerifiedChange?.(body.verification.status === "verified" || records.some((record) => record.id !== id && record.status === "verified"));
      if (body.verification.status === "verified") toast.success("Ownership verified.");
    } catch (error) {
      setFeedback((current) => ({ ...current, [id]: error instanceof Error ? error.message : "Verification check failed." }));
    } finally {
      setChecking(null);
    }
  };

  const selectedMethod = METHODS.find((item) => item.id === method)!;
  return (
    <section className="space-y-5 border-y border-zinc-200 py-6 dark:border-zinc-800" aria-labelledby="ownership-verification-title">
      <header className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <h2 id="ownership-verification-title" className="font-semibold">Verify project ownership</h2>
          <p className="mt-1 text-sm text-zinc-500">Prove control of a project domain or repository before submitting your claim. Each proof remains valid for 90 days.</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-[11rem_1fr_auto]">
        <label className="sr-only" htmlFor="ownership-method">Verification method</label>
        <select
          id="ownership-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as OwnershipVerificationMethod)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="ownership-target">Domain or repository</label>
        <input
          id="ownership-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder={selectedMethod.placeholder}
          className="min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          disabled={creating}
          onClick={() => void createVerification()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? <LoaderCircle size={16} className="animate-spin" /> : null}
          Generate token
        </button>
      </div>

      {records.length > 0 && (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {records.map((record) => {
            const expiry = new Date(record.expiresAt);
            const needsReverification = record.status === "verified" && expiry.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000;
            const statusIcon = record.status === "verified"
              ? <CheckCircle2 size={17} className="text-green-600" />
              : record.status === "expired"
                ? <AlertCircle size={17} className="text-red-600" />
                : <Clock3 size={17} className="text-amber-600" />;
            return (
              <li key={record.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {statusIcon}
                    <span className="text-sm font-medium">{METHODS.find((item) => item.id === record.method)?.label}: {record.target}</span>
                    <span className="text-xs capitalize text-zinc-500">{record.status}</span>
                  </div>
                  <div className="flex gap-2">
                    {tokens[record.id] && (
                      <button
                        type="button"
                        title="Copy verification token"
                        aria-label="Copy verification token"
                        onClick={() => void navigator.clipboard.writeText(tokens[record.id])}
                        className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      ><Copy size={16} /></button>
                    )}
                    <button
                      type="button"
                      disabled={checking === record.id || record.status === "verified"}
                      onClick={() => void verifyNow(record.id)}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      {checking === record.id ? "Checking…" : record.status === "verified" ? "Verified" : "Verify now"}
                    </button>
                    {(record.status === "expired" || needsReverification) && (
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => void createVerification(record.method, record.target)}
                        className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
                      >Re-verify</button>
                    )}
                  </div>
                </div>
                {tokens[record.id] && <p className="break-all rounded bg-zinc-100 px-3 py-2 font-mono text-xs dark:bg-zinc-800">{instructionsFor(record, tokens[record.id])}</p>}
                {record.status === "verified" && (
                  <p className="text-xs text-green-700 dark:text-green-400">Verified. Expires {expiry.toLocaleDateString()}.</p>
                )}
                {needsReverification && <p className="text-xs text-amber-700 dark:text-amber-400">This verification expires within 14 days. Re-verify now to keep ownership current.</p>}
                {(feedback[record.id] || record.lastCheckMessage) && <p aria-live="polite" className="text-xs text-zinc-500">{feedback[record.id] ?? record.lastCheckMessage}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {feedback.poll && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">{feedback.poll}</p>}
      <p className="text-xs text-zinc-500">DNS uses a TXT record named <code>dongle-verify</code>; GitHub uses a root-level <code>dongle-verify.txt</code>; Stellar.toml must list your wallet and verification token. Checks also run automatically every 15 seconds while pending.</p>
    </section>
  );
}