"use client";

import React from "react";
import { Code2, ExternalLink } from "lucide-react";
import AddressDisplay from "@/components/ui/AddressDisplay";

/**
 * Network passphrase → stellar.expert network slug mapping.
 * Falls back to "testnet" when the passphrase is not recognised.
 */
const NETWORK_SLUG =
  process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ===
  "Public Global Stellar Network ; September 2015"
    ? "public"
    : "testnet";

function stellarExpertUrl(contractId: string) {
  return `https://stellar.expert/explorer/${NETWORK_SLUG}/contract/${contractId}`;
}

interface ContractAddressListProps {
  addresses: string[];
  className?: string;
}

/**
 * Renders a labelled list of Soroban contract addresses with copy-to-clipboard
 * buttons and links to stellar.expert for each entry.
 *
 * Renders nothing when `addresses` is empty or undefined.
 */
export function ContractAddressList({
  addresses,
  className = "",
}: ContractAddressListProps) {
  // Filter out any blank strings that may have slipped through
  const valid = addresses.filter((a) => a.trim().length > 0);

  if (valid.length === 0) return null;

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 ${className}`}
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Code2 className="w-5 h-5 text-blue-500" />
        Contract Addresses
      </h3>

      <div className="space-y-3">
        {valid.map((address) => (
          <div key={address} className="space-y-1">
            <AddressDisplay
              address={address}
              copyable
              truncated={false}
              className="break-all"
            />
            <a
              href={stellarExpertUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              aria-label={`View contract ${address} on stellar.expert`}
            >
              View on stellar.expert
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContractAddressList;
