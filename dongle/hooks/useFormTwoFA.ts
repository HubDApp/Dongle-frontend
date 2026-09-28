/**
 * Hook to integrate 2FA verification into form submissions.
 *
 * Usage:
 * ```tsx
 * const { needsVerification, requestVerification, resetVerification, isTwoFAEnabled } = useFormTwoFA();
 *
 * const handleSubmit = async () => {
 *   const allowed = await requestVerification();
 *   if (allowed) {
 *     // proceed with form submission
 *   }
 * };
 *
 * // In your component render:
 * {needsVerification && (
 *   <TwoFAVerification
 *     onVerified={handleActualSubmit}
 *     onCancel={resetVerification}
 *   />
 * )}
 * ```
 */

import { useState, useCallback, useRef } from "react";
import { useTwoFA } from "@/context/twofa.context";

export interface UseFormTwoFAReturn {
  /** Whether 2FA is required and verification is pending */
  needsVerification: boolean;
  /** Whether a verification dialog is currently shown */
  showVerification: boolean;
  /** Initiates the 2FA verification flow. Resolves with true if verified. */
  requestVerification: () => Promise<boolean>;
  /** Reset the verification state (e.g. on cancel) */
  resetVerification: () => void;
  /** Whether 2FA is enabled for form submissions */
  isTwoFAEnabled: boolean;
}

export function useFormTwoFA(): UseFormTwoFAReturn {
  const { isRequiredForSubmissions, availableMethods, remainingBackupCodeCount } = useTwoFA();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const pendingResolverRef = useRef<((value: boolean) => void) | null>(null);

  const isTwoFAEnabled = isRequiredForSubmissions;

  const requestVerification = useCallback(async (): Promise<boolean> => {
    // If 2FA is not required, allow immediately
    if (!isRequiredForSubmissions) {
      return true;
    }

    // If no methods are available, allow as a safety fallback
    if (availableMethods.length === 0 && remainingBackupCodeCount === 0) {
      return true;
    }

    setNeedsVerification(true);
    setShowVerification(true);

    return new Promise<boolean>((resolve) => {
      pendingResolverRef.current = resolve;
    });
  }, [isRequiredForSubmissions, availableMethods.length, remainingBackupCodeCount]);

  const resetVerification = useCallback(() => {
    setNeedsVerification(false);
    setShowVerification(false);
    if (pendingResolverRef.current) {
      pendingResolverRef.current(false);
      pendingResolverRef.current = null;
    }
  }, []);

  return {
    needsVerification,
    showVerification,
    requestVerification,
    resetVerification,
    isTwoFAEnabled,
  };
}