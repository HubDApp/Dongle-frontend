"use client";

import { DONGLE_CONTRACTS, hasPlaceholderContracts } from "@/constants/contracts";

/**
 * Surfaces a hard-to-miss warning when a production build still has
 * development placeholder contract IDs, so users are not sent into
 * broken on-chain flows.
 */
export default function ProductionConfigBanner() {
  // Only relevant outside local development.
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  if (!hasPlaceholderContracts(DONGLE_CONTRACTS)) {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-b border-red-500/40 bg-red-600 text-white"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          Production configuration incomplete: contract IDs are still set to
          development placeholders. On-chain reads and writes will not work
          until real Soroban contract IDs are configured and the app is
          redeployed.
        </p>
        <a
          href="https://github.com/HubDApp/Dongle-frontend/blob/main/dongle/DEPLOYMENT.md"
          className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-100"
          target="_blank"
          rel="noreferrer"
        >
          Deployment checklist
        </a>
      </div>
    </div>
  );
}
