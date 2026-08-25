import { ConfirmDialogOptions } from "@/components/ui/ConfirmDialog";

export type LinkWarningStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | null;

/**
 * Returns true when the external link should skip the confirmation interstitial.
 * Only verified projects bypass the warning.
 */
export function shouldBypassLinkWarning(status: LinkWarningStatus): boolean {
  return status === "VERIFIED";
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
    };
  }

  // NONE or null
  return {
    title: "External Link",
    description:
      `You are about to visit an external site from an unverified project. ` +
      `Make sure you trust this site before proceeding.\n\n` +
      `Destination: ${destination}`,
    confirmLabel: "Proceed to Site",
    cancelLabel: "Stay Here",
    variant: "warning",
  };
}
