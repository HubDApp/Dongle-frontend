"use client";

import React from "react";
import { Code2, ExternalLink, AlertTriangle } from "lucide-react";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { DEV_CONTRACT_PLACEHOLDER } from "@/constants/contracts";

// ── Network helpers ────────────────────────────────────────────────────────

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? "";

const IS_MAINNET =
  NETWORK_PASSPHRASE === "Public Global Stellar Network ; September 2015";

const NETWORK_SLUG = IS_MAINNET ? "public" : "testnet";

const NETWORK_LABEL = IS_MAINNET ? "Mainnet" : "Testnet";

const NETWORK_BADGE_CLASS = IS_MAINNET
  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

function stellarExpertUrl(contractId: string) {
  return `https://stellar.expert/explorer/${NETWORK_SLUG}/contract/${contractId}`;
}

/** True when the address is the all-A dev placeholder — not a real deployment. */
function isPlaceholder(address: string) {
  return address.toUpperCase() === DEV_CONTRACT_PLACEHOLDER.toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────────────

interface ContractAddressListProps {
  addresses: string[];
  className?: string;
}

/**
 * Renders a labelled list of Soroban contract addresses with:
 * - Network badge (Mainnet / Testnet)
 * - Copy-to-clipboard via AddressDisplay
 * - stellar.expert deep-link for each contract
 * - Warning when a placeholder / dev contract ID is detected
 *
 * Renders nothing when `addresses` is empty or all entries are blank.
 */
export function ContractAddressList({
  addresses,
  className = "",
}: ContractAddressListProps) {
  const valid = addresses.filter((a) => a.trim().length > 0);

  if (valid.length === 0) return null;

  const hasPlaceholder = valid.some(isPlaceholder);

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Code2 className="w-5 h-5 text-blue-500" aria-hidden="true" />
          Contract{valid.length > 1 ? "s" : ""}
          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({valid.length})
          </span>
        </h3>

        {/* Network badge */}
        <span
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${NETWORK_BADGE_CLASS}`}
          title={`Contracts are on ${NETWORK_LABEL}`}
        >
          {NETWORK_LABEL}
        </span>
      </div>

      {/* Placeholder warning */}
      {hasPlaceholder && (
        <div className="flex gap-2 mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle
            className="w-4 h-4 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p>
            One or more addresses are development placeholders and are not
            deployed on-chain. They will not resolve on stellar.expert.
          </p>
        </div>
      )}

      {/* Address list */}
      <div className="space-y-4">
        {valid.map((address, i) => {
          const placeholder = isPlaceholder(address);
          return (
            <div
              key={address}
              className="space-y-1.5"
              aria-label={`Contract address ${i + 1}`}
            >
              {/* Index label */}
              <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wide">
                Contract {i + 1}
                {placeholder && (
                  <span className="ml-2 text-amber-500">— placeholder</span>
                )}
              </p>

              {/* Address with copy button */}
              <AddressDisplay
                address={address}
                copyable
                truncated={false}
                className={`break-all font-mono text-xs ${
                  placeholder
                    ? "text-zinc-400 dark:text-zinc-600 line-through"
                    : ""
                }`}
              />

              {/* stellar.expert link — disabled for placeholders */}
              {!placeholder ? (
                <a
                  href={stellarExpertUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  aria-label={`View contract ${address} on stellar.expert`}
                >
                  View on stellar.expert
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-600 italic">
                  Not deployed — stellar.expert link unavailable
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ContractAddressList;
