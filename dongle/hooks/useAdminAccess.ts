"use client";

/**
 * useAdminAccess
 *
 * Determines whether the currently connected wallet is authorized to access
 * the admin dashboard.
 *
 * ─── Source of admin truth ───────────────────────────────────────────────────
 * Authorization is driven by the NEXT_PUBLIC_ADMIN_ALLOWLIST environment
 * variable: a comma-separated list of Stellar G… public keys that are
 * permitted admin access.
 *
 *   Example (.env.local):
 *     NEXT_PUBLIC_ADMIN_ALLOWLIST=GABC...1234,GDEF...5678
 *
 * The variable is documented in dongle/.env.example.
 *
 * When the list is empty, no wallet is granted access.  When an on-chain
 * admin-role contract is available in the future, replace the ALLOWLIST check
 * with a contract query inside this hook — all admin-gating UI will
 * automatically follow.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from "react";
import { useWalletPageGate, type WalletPageGateResult } from "@/hooks/useWalletPageGate";

// Parsed once at module load — NEXT_PUBLIC_* values are inlined at build time.
const ADMIN_ALLOWLIST: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);

export interface AdminAccessResult {
  /** True only when the wallet is connected, on the correct network, and in the allowlist. */
  isAdmin: boolean;
  /**
   * True while the wallet gate has not yet settled (Freighter availability
   * check, session restore, or account loading).  Show a loading indicator
   * instead of an access-denied screen during this window.
   */
  isAdminChecking: boolean;
  /** Forward the full gate result so pages can render per-state wallet panels. */
  gate: WalletPageGateResult;
}

export function useAdminAccess(): AdminAccessResult {
  const gate = useWalletPageGate();

  // The gate is still settling while Freighter availability is unknown (null)
  // or an existing session is being restored (account-loading).
  const isAdminChecking = gate.state === "account-loading";

  const isAdmin = useMemo(
    () =>
      gate.state === "ready" &&
      gate.publicKey !== null &&
      ADMIN_ALLOWLIST.has(gate.publicKey),
    [gate.state, gate.publicKey],
  );

  return { isAdmin, isAdminChecking, gate };
}
