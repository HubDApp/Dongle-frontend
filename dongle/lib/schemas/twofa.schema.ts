/**
 * Zod validation schemas for Two-Factor Authentication forms
 */

import { z } from "zod";

/** Phone number validation (E.164 format) */
const phoneSchema = z
  .string()
  .min(8, "Phone number must be at least 8 digits")
  .max(20, "Phone number is too long")
  .regex(
    /^\+?[1-9]\d{7,19}$/,
    "Please enter a valid phone number (e.g. +1234567890)"
  );

/** Email validation */
const emailSchema = z
  .string()
  .email("Please enter a valid email address");

/** 2FA verification code (6 digits for TOTP/SMS/email, or backup code) */
export const verificationCodeSchema = z
  .string()
  .min(1, "Verification code is required")
  .max(32, "Verification code is too long");

/** Schema for the TOTP setup form */
export const totpSetupSchema = z.object({
  secret: z.string().min(16, "Invalid secret key"),
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type TotpSetupFormData = z.infer<typeof totpSetupSchema>;

/** Schema for SMS setup form */
export const smsSetupSchema = z.object({
  phoneNumber: phoneSchema,
  code: verificationCodeSchema,
});

export type SmsSetupFormData = z.infer<typeof smsSetupSchema>;

/** Schema for Email setup form */
export const emailSetupSchema = z.object({
  emailAddress: emailSchema,
  code: verificationCodeSchema,
});

export type EmailSetupFormData = z.infer<typeof emailSetupSchema>;

/** Schema for verification form (used during form submissions) */
export const twoFAVerificationSchema = z.object({
  method: z.enum(["sms", "email", "totp", "backup_code"]),
  code: verificationCodeSchema,
});

export type TwoFAVerificationFormData = z.infer<typeof twoFAVerificationSchema>;

/** Schema for backup codes display/regeneration */
export const backupCodesSchema = z.object({
  regenerate: z.boolean().optional().default(false),
});

export type BackupCodesFormData = z.infer<typeof backupCodesSchema>;