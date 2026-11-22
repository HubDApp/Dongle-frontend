"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AlertTriangle } from "lucide-react";
import {
  CONTRACT_DEPLOY_DOCS_URL,
  CONTRACT_RECHECK_MS,
  getContractHealth,
  subscribeContractHealth,
  verifyConfiguredContracts,
} from "@/lib/contract-health";

export function useContractHealth() {
  return useSyncExternalStore(subscribeContractHealth, getContractHealth, getContractHealth);
}

/** Verifies configured contracts on startup and every 5 minutes; warns if any are missing. */
export function ContractHealthBanner() {
  const health = useContractHealth();

  useEffect(() => {
    void verifyConfiguredContracts();
    const id = window.setInterval(() => void verifyConfiguredContracts(), CONTRACT_RECHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (health.status !== "missing") return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[60] flex flex-wrap items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-black"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>
        On-chain actions are disabled: contract{health.missing.length > 1 ? "s" : ""} not found on
        network ({health.missing.join(", ")}).
      </span>
      <a href={CONTRACT_DEPLOY_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">
        How to deploy contracts
      </a>
    </div>
  );
}

export default ContractHealthBanner;
