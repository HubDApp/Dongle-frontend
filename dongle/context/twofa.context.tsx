"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { twoFAService } from "@/services/twofa/twofa.service";
import { useWallet } from "@/context/wallet.context";
import {
  type TwoFAConfig,
  type TwoFAMethod,
  type TwoFAMethodConfig,
  type BackupCode,
  type TwoFASession,
  type TwoFAVerificationResult,
  DEFAULT_TWOFA_CONFIG,
} from "@/types/twofa";

// ─── Context shape ───────────────────────────────────────────────────────────

interface TwoFAContextValue {
  /** The current 2FA configuration */
  config: TwoFAConfig;
  /** Whether 2FA data is still loading */
  loading: boolean;
  /** Whether 2FA is enabled globally */
  isEnabled: boolean;
  /** Whether 2FA is required for form submissions */
  isRequiredForSubmissions: boolean;
  /** Available verification methods */
  availableMethods: TwoFAMethod[];
  /** Refresh config from storage */
  refresh: () => void;

  /** Enable 2FA globally */
  enable: () => void;
  /** Disable 2FA globally */
  disable: () => void;

  /** Enable and configure SMS method */
  enableSMS: (phoneNumber: string) => void;
  /** Enable and configure Email method */
  enableEmail: (emailAddress: string) => void;
  /** Enable TOTP method after verification */
  enableTOTP: (secret: string) => void;
  /** Disable a specific method */
  disableMethod: (method: TwoFAMethod) => void;

  /** Get backup codes */
  backupCodes: BackupCode[];
  /** Regenerate backup codes */
  regenerateBackupCodes: () => BackupCode[];
  /** Remaining backup code count */
  remainingBackupCodeCount: number;

  /** Get masked phone number */
  maskedPhoneNumber: string | undefined;
  /** Get masked email */
  maskedEmail: string | undefined;

  /** Create a verification session */
  createSession: (method: TwoFAMethod) => TwoFASession;
  /** Get the current verification session */
  getSession: () => TwoFASession | null;
  /** Clear the current verification session */
  clearSession: () => void;
  /** Verify a code */
  verifyCode: (method: TwoFAMethod, code: string) => Promise<TwoFAVerificationResult>;

  /** Generate a TOTP secret for setup */
  generateTotpSecret: () => string;
  /** Generate a TOTP URI for QR code */
  generateTotpUri: (secret: string) => string;

  /** Set whether 2FA is required for form submissions */
  setRequiredForSubmissions: (required: boolean) => void;
}

const TwoFAContext = createContext<TwoFAContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function TwoFAProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [config, setConfig] = useState<TwoFAConfig>({ ...DEFAULT_TWOFA_CONFIG });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const cfg = twoFAService.getConfig(publicKey);
    setConfig(cfg);
    setLoading(false);
  }, [publicKey]);

  // Load config on mount and when publicKey changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = config.enabled;
  const isRequiredForSubmissions = config.enabled && config.requiredForSubmissions;

  const availableMethods = useMemo(() => {
    return twoFAService.getAvailableMethods(publicKey);
  }, [publicKey, config]);

  const enable = useCallback(() => {
    twoFAService.enable(config, publicKey);
    refresh();
  }, [config, publicKey, refresh]);

  const disable = useCallback(() => {
    twoFAService.disable(publicKey);
    refresh();
  }, [publicKey, refresh]);

  const enableSMS = useCallback(
    (phoneNumber: string) => {
      twoFAService.enableSMS(phoneNumber, config, publicKey);
      refresh();
    },
    [config, publicKey, refresh],
  );

  const enableEmail = useCallback(
    (emailAddress: string) => {
      twoFAService.enableEmail(emailAddress, config, publicKey);
      refresh();
    },
    [config, publicKey, refresh],
  );

  const enableTOTP = useCallback(
    (secret: string) => {
      twoFAService.enableTOTP(secret, config, publicKey);
      refresh();
    },
    [config, publicKey, refresh],
  );

  const disableMethod = useCallback(
    (method: TwoFAMethod) => {
      twoFAService.disableMethod(method, publicKey);
      refresh();
    },
    [publicKey, refresh],
  );

  const backupCodes = config.backupCodes;

  const regenerateBackupCodes = useCallback(() => {
    const codes = twoFAService.regenerateBackupCodes(publicKey);
    refresh();
    return codes;
  }, [publicKey, refresh]);

  const remainingBackupCodeCount = twoFAService.getRemainingBackupCodeCount(publicKey);

  const maskedPhoneNumber = twoFAService.getMaskedPhoneNumber(publicKey);
  const maskedEmail = twoFAService.getMaskedEmail(publicKey);

  const createSession = useCallback(
    (method: TwoFAMethod) => twoFAService.createSession(method, publicKey),
    [publicKey],
  );

  const getSession = useCallback(() => twoFAService.getSession(), []);

  const clearSession = useCallback(() => twoFAService.clearSession(), []);

  const verifyCode = useCallback(
    (method: TwoFAMethod, code: string) => twoFAService.verifyCode(method, code, publicKey),
    [publicKey],
  );

  const generateTotpSecret = useCallback(() => twoFAService.generateTotpSecret(), []);

  const generateTotpUri = useCallback(
    (secret: string) => twoFAService.generateTotpUri(secret),
    [],
  );

  const setRequiredForSubmissions = useCallback(
    (required: boolean) => {
      twoFAService.setRequiredForSubmissions(required, publicKey);
      refresh();
    },
    [publicKey, refresh],
  );

  const value = useMemo<TwoFAContextValue>(
    () => ({
      config,
      loading,
      isEnabled,
      isRequiredForSubmissions,
      availableMethods,
      refresh,
      enable,
      disable,
      enableSMS,
      enableEmail,
      enableTOTP,
      disableMethod,
      backupCodes,
      regenerateBackupCodes,
      remainingBackupCodeCount,
      maskedPhoneNumber,
      maskedEmail,
      createSession,
      getSession,
      clearSession,
      verifyCode,
      generateTotpSecret,
      generateTotpUri,
      setRequiredForSubmissions,
    }),
    [
      config,
      loading,
      isEnabled,
      isRequiredForSubmissions,
      availableMethods,
      refresh,
      enable,
      disable,
      enableSMS,
      enableEmail,
      enableTOTP,
      disableMethod,
      backupCodes,
      regenerateBackupCodes,
      remainingBackupCodeCount,
      maskedPhoneNumber,
      maskedEmail,
      createSession,
      getSession,
      clearSession,
      verifyCode,
      generateTotpSecret,
      generateTotpUri,
      setRequiredForSubmissions,
    ],
  );

  return <TwoFAContext.Provider value={value}>{children}</TwoFAContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const FALLBACK_VALUE: TwoFAContextValue = {
  config: { ...DEFAULT_TWOFA_CONFIG },
  loading: false,
  isEnabled: false,
  isRequiredForSubmissions: false,
  availableMethods: [],
  refresh: () => {},
  enable: () => {},
  disable: () => {},
  enableSMS: () => {},
  enableEmail: () => {},
  enableTOTP: () => {},
  disableMethod: () => {},
  backupCodes: [],
  regenerateBackupCodes: () => [],
  remainingBackupCodeCount: 0,
  maskedPhoneNumber: undefined,
  maskedEmail: undefined,
  createSession: () => ({ method: "totp", createdAt: 0, attemptsRemaining: 3 }),
  getSession: () => null,
  clearSession: () => {},
  verifyCode: async () => ({ success: false, method: "totp", error: "2FA context not available" }),
  generateTotpSecret: () => "",
  generateTotpUri: () => "",
  setRequiredForSubmissions: () => {},
};

export function useTwoFA(): TwoFAContextValue {
  return useContext(TwoFAContext) ?? FALLBACK_VALUE;
}