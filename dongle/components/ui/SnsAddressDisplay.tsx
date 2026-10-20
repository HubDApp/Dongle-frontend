"use client";

import React, { useEffect, useState } from "react";
import { resolveAddressToDomain } from "@/services/sns";

interface SnsAddressDisplayProps {
  address: string;
  /** Truncate the address fallback. Default: true. */
  truncated?: boolean;
  className?: string;
}

/**
 * Displays a wallet's SNS domain in place of its raw address when one is
 * registered (Issue #727). The full address is always available on hover via
 * the `title` attribute, and shown as a fallback when no domain resolves.
 */
export default function SnsAddressDisplay({
  address,
  truncated = true,
  className = "",
}: SnsAddressDisplayProps) {
  const [domain, setDomain] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!address) return;
    resolveAddressToDomain(address)
      .then((result) => {
        if (cancelled) return;
        setDomain(result.domain);
        setResolved(true);
      })
      .catch(() => {
        if (!cancelled) setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return null;

  const fallback = truncated
    ? `${address.substring(0, 6)}…${address.substring(address.length - 4)}`
    : address;

  const label = resolved && domain ? domain : fallback;

  return (
    <span
      className={`font-mono text-xs text-zinc-600 dark:text-zinc-400 select-all ${className}`}
      title={address}
      aria-label={domain ? `${domain} (${address})` : address}
      data-sns-resolved={domain ? "true" : "false"}
    >
      {label}
    </span>
  );
}
