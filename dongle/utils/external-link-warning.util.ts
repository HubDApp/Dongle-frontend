import { ConfirmDialogOptions } from "@/components/ui/ConfirmDialog";
import { extractDomain, normalizeUrl } from "@/lib/url";

export type LinkWarningStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | null;

const CODE_HOSTS = ["github.com", "gitlab.com", "bitbucket.org"];

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Returns the project's registered destinations that may skip the interstitial
 * once the project itself is verified.
 */
export function getApprovedProjectUrls(project: {
  websiteUrl?: string;
  githubUrl?: string;
}): string[] {
  return [project.websiteUrl, project.githubUrl].filter(
    (url): url is string => Boolean(url && url.trim()),
  );
}

/**
 * True when `url` matches a registered project destination.
 *
 * Website domains match the whole host. Code hosts (GitHub/GitLab/Bitbucket)
 * only match the registered repository, not every repo on that host.
 */
export function isApprovedExternalDestination(
  url: string,
  approvedUrls: string[],
): boolean {
  const destDomain = extractDomain(url);
  if (!destDomain) return false;

  let destUrl: string;
  try {
    destUrl = stripTrailingSlash(normalizeUrl(url));
  } catch {
    return false;
  }

  return approvedUrls.some((approved) => {
    if (!approved) return false;
    const approvedDomain = extractDomain(approved);
    if (!approvedDomain) return false;

    let approvedNormalized: string;
    try {
      approvedNormalized = stripTrailingSlash(normalizeUrl(approved));
    } catch {
      return false;
    }

    if (CODE_HOSTS.includes(approvedDomain)) {
      return (
        destUrl === approvedNormalized ||
        destUrl.startsWith(`${approvedNormalized}/`)
      );
    }

    return destDomain === approvedDomain;
  });
}

/**
 * Returns true when the external link should skip the confirmation interstitial.
 * Only verified projects bypass, and only for their approved destinations when
 * those destinations are provided.
 */
export function shouldBypassLinkWarning(
  status: LinkWarningStatus,
  url?: string,
  approvedUrls?: string[],
): boolean {
  if (status !== "VERIFIED") return false;
  if (!url || !approvedUrls || approvedUrls.length === 0) return true;
  return isApprovedExternalDestination(url, approvedUrls);
}

/**
 * Builds the ConfirmDialog options for the external link interstitial, tuned
 * to the project's verification status.
 *
 * - REJECTED → stronger, red-tinted warning copy.
 * - PENDING  → softer copy noting the outcome is still unknown.
 * - NONE / null → neutral informational copy.
 */
export function getExternalLinkWarningOptions(
  targetDomain: string,
  fullUrl: string,
  status: LinkWarningStatus,
): ConfirmDialogOptions {
  const destination = `${targetDomain} (${fullUrl})`;

  if (status === "REJECTED") {
    return {
      title: "Caution: Rejected Project Link",
      description:
        `This project has been rejected by the community verification process. ` +
        `Visiting external links from rejected projects carries elevated risk.\n\n` +
        `Destination: ${destination}\n\n` +
        `Only proceed if you fully trust this site.`,
      confirmLabel: "I Understand — Open Link",
      cancelLabel: "Stay Here",
      variant: "warning",
      destinationDomain: targetDomain,
      destinationUrl: fullUrl,
    };
  }

  if (status === "PENDING") {
    return {
      title: "External Link — Verification Pending",
      description:
        `This project's verification is still under review. ` +
        `Exercise caution before visiting external links.\n\n` +
        `Destination: ${destination}\n\n` +
        `Make sure you trust this site before proceeding.`,
      confirmLabel: "Proceed to Site",
      cancelLabel: "Stay Here",
      variant: "warning",
      destinationDomain: targetDomain,
      destinationUrl: fullUrl,
    };
  }

  return {
    title: "External Link",
    description:
      `You are about to visit an external site from an unverified project. ` +
      `Make sure you trust this site before proceeding.\n\n` +
      `Destination: ${destination}`,
    confirmLabel: "Proceed to Site",
    cancelLabel: "Stay Here",
    variant: "warning",
    destinationDomain: targetDomain,
    destinationUrl: fullUrl,
  };
}
