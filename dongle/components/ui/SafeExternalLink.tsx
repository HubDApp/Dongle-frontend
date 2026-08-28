"use client";

import React from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { extractDomain } from "@/lib/url";
import {
  getExternalLinkWarningOptions,
  shouldBypassLinkWarning,
  type LinkWarningStatus,
} from "@/lib/externalLinkWarning";

export interface SafeExternalLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> {
  href: string;
  verificationStatus?: LinkWarningStatus;
  approvedUrls?: string[];
  children: React.ReactNode;
}

/**
 * External anchor that always opens in a new tab with noopener/noreferrer,
 * and shows a confirmation interstitial for unknown / unverified destinations.
 */
export function SafeExternalLink({
  href,
  verificationStatus = null,
  approvedUrls,
  children,
  onClick,
  ...rest
}: SafeExternalLinkProps) {
  const confirm = useConfirm();

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    event.preventDefault();

    if (shouldBypassLinkWarning(verificationStatus, href, approvedUrls)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    const targetDomain = extractDomain(href) || href;
    const ok = await confirm(
      getExternalLinkWarningOptions(targetDomain, href, verificationStatus),
    );
    if (ok) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
