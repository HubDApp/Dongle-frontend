import { describe, it, expect, beforeEach, vi } from "vitest";
import { twoFAService } from "@/services/twofa/twofa.service";
import type { TwoFAConfig } from "@/types/twofa";
import { DEFAULT_TWOFA_CONFIG } from "@/types/twofa";

// Mock crypto-storage
vi.mock("@/lib/crypto-storage", () => ({
  getItemAndDecrypt: vi.fn(),
  setItemAndEncrypt: vi.fn(),
}));

import { getItemAndDecrypt, setItemAndEncrypt } from "@/lib/crypto-storage";

// Mock crypto.getRandomValues
const mockGetRandomValues = (array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = i % 256;
  }
  return array;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TwoFAService", () => {
  describe("getConfig / saveConfig", () => {
    it("returns default config when nothing is stored", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue(null);

      const config = twoFAService.getConfig("test-key");
      expect(config.enabled).toBe(false);
      expect(config.methods.sms.enabled).toBe(false);
      expect(config.methods.email.enabled).toBe(false);
      expect(config.methods.totp.enabled).toBe(false);
      expect(config.methods.backup_code.enabled).toBe(true);
      expect(config.backupCodes).toEqual([]);
    });

    it("returns stored config when available", () => {
      const stored: TwoFAConfig = {
        ...DEFAULT_TWOFA_CONFIG,
        enabled: true,
        updatedAt: 1000,
      };
      vi.mocked(getItemAndDecrypt).mockReturnValue(stored);

      const config = twoFAService.getConfig("test-key");
      expect(config.enabled).toBe(true);
      expect(config.updatedAt).toBe(1000);
    });

    it("saves config with updated timestamp", () => {
      const config = { ...DEFAULT_TWOFA_CONFIG };
      twoFAService.saveConfig(config, "test-key");
      expect(setItemAndEncrypt).toHaveBeenCalledWith(
        "dongle_twofa_config",
        expect.objectContaining({ enabled: false, updatedAt: expect.any(Number) }),
        "test-key",
      );
    });
  });

  describe("isEnabled / isRequiredForSubmissions", () => {
    it("isEnabled returns false by default", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue(null);
      expect(twoFAService.isEnabled("test-key")).toBe(false);
    });

    it("isEnabled returns true when enabled", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({
        ...DEFAULT_TWOFA_CONFIG,
        enabled: true,
      });
      expect(twoFAService.isEnabled("test-key")).toBe(true);
    });

    it("isRequiredForSubmissions returns false when disabled", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue(null);
      expect(twoFAService.isRequiredForSubmissions("test-key")).toBe(false);
    });

    it("isRequiredForSubmissions returns true when enabled and required", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({
        ...DEFAULT_TWOFA_CONFIG,
        enabled: true,
        requiredForSubmissions: true,
      });
      expect(twoFAService.isRequiredForSubmissions("test-key")).toBe(true);
    });
  });

  describe("getAvailableMethods", () => {
    it("returns empty array when no methods are configured", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue(null);
      expect(twoFAService.getAvailableMethods("test-key")).toEqual([]);
    });

    it("returns SMS when enabled and phone number is set", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({
        ...DEFAULT_TWOFA_CONFIG,
        methods: {
          ...DEFAULT_TWOFA_CONFIG.methods,
          sms: { enabled: true, phoneNumber: "+1***7890" },
        },
      });
      expect(twoFAService.getAvailableMethods("test-key")).toEqual(["sms"]);
    });
  });

  describe("enable / disable", () => {
    it("enable sets enabled to true", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({ ...DEFAULT_TWOFA_CONFIG });
      const config = twoFAService.getConfig("test-key");
      twoFAService.enable(config, "test-key");
      expect(setItemAndEncrypt).toHaveBeenCalledWith(
        "dongle_twofa_config",
        expect.objectContaining({ enabled: true }),
        "test-key",
      );
    });

    it("disable resets to defaults", () => {
      twoFAService.disable("test-key");
      expect(setItemAndEncrypt).toHaveBeenCalledWith(
        "dongle_twofa_config",
        expect.objectContaining({ enabled: false, methods: expect.any(Object) }),
        "test-key",
      );
    });
  });

  describe("backup codes", () => {
    it("regenerateBackupCodes generates new codes", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({ ...DEFAULT_TWOFA_CONFIG });
      const codes = twoFAService.regenerateBackupCodes("test-key");
      expect(codes.length).toBe(10);
      expect(codes[0]).toHaveProperty("code");
      expect(codes[0]).toHaveProperty("used");
      expect(codes[0].used).toBe(false);
      // Codes should be formatted as XXXXX-XXXXX
      expect(codes[0].code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    });

    it("getRemainingBackupCodeCount returns correct count", () => {
      vi.mocked(getItemAndDecrypt).mockReturnValue({
        ...DEFAULT_TWOFA_CONFIG,
        backupCodes: [
          { code: "AAAAA-BBBBB", used: false },
          { code: "CCCCC-DDDDD", used: true },
        ],
      });
      expect(twoFAService.getRemainingBackupCodeCount("test-key")).toBe(1);
    });
  });

  describe("generateTotpSecret", () => {
    it("generates a base32-encoded secret", () => {
      const secret = twoFAService.generateTotpSecret();
      expect(secret).toBeTruthy();
      expect(typeof secret).toBe("string");
      // Base32 strings contain A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });
  });

  describe("generateTotpUri", () => {
    it("generates a valid otpauth URI", () => {
      const uri = twoFAService.generateTotpUri("JBSWY3DPEHPK3PXP", "test-user");
      expect(uri).toContain("otpauth://totp/");
      expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
      expect(uri).toContain("issuer=Dongle");
      expect(uri).toContain("algorithm=SHA1");
      expect(uri).toContain("digits=6");
      expect(uri).toContain("period=30");
    });
  });

  describe("session management", () => {
    beforeEach(() => {
      // Mock sessionStorage
      const store: Record<string, string> = {};
      vi.stubGlobal("sessionStorage", {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
      });
    });

    it("creates and retrieves a session", () => {
      const session = twoFAService.createSession("sms", "test-key");
      expect(session.method).toBe("sms");
      expect(session.sentCode).toBeTruthy();
      expect(session.sentCode).toMatch(/^\d{6}$/);
      expect(session.attemptsRemaining).toBe(3);

      const retrieved = twoFAService.getSession();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.method).toBe("sms");
    });

    it("clears a session", () => {
      twoFAService.createSession("email", "test-key");
      twoFAService.clearSession();
      expect(twoFAService.getSession()).toBeNull();
    });
  });

  describe("TOTP secret generation", () => {
    it("generates a unique secret each time", () => {
      const secret1 = twoFAService.generateTotpSecret();
      const secret2 = twoFAService.generateTotpSecret();
      expect(secret1).not.toBe(secret2);
    });
  });
});