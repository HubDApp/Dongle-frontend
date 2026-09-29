/**
 * Email Verification & Quality Scoring Service
 */

import type { EmailVerificationResult } from "./types";

// RFC 5322 compliant regex for basic syntax
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Common disposable / burner email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "trashmail.com",
  "sharklasers.com",
  "yopmail.com",
  "dispostable.com",
  "getnada.com",
  "mohmal.com",
  "temp-mail.org",
  "burnermail.io",
  "fakeinbox.com",
  "generator.email",
  "inboxkitten.com",
]);

// Free consumer email providers
const FREE_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "gmx.com",
  "mail.com",
]);

// Role-based prefixes
const ROLE_BASED_PREFIXES = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "info",
  "contact",
  "sales",
  "billing",
  "marketing",
  "press",
  "legal",
  "security",
  "compliance",
  "jobs",
  "careers",
  "office",
  "team",
  "postmaster",
  "hostmaster",
  "root",
  "noreply",
  "no-reply",
]);

/**
 * Verify email address format, deliverability risk, disposable check, and role accounts
 */
export function verifyEmail(emailInput?: string | null): EmailVerificationResult {
  if (!emailInput || typeof emailInput !== "string") {
    return {
      email: "",
      isValid: false,
      isDisposable: false,
      isRoleBased: false,
      isFreeProvider: false,
      domain: "",
      mxValid: false,
      score: 0,
      status: "invalid",
      flags: ["Missing or empty email address"],
    };
  }

  const email = emailInput.trim().toLowerCase();
  const flags: string[] = [];

  // 1. Basic format check
  if (!EMAIL_REGEX.test(email)) {
    return {
      email,
      isValid: false,
      isDisposable: false,
      isRoleBased: false,
      isFreeProvider: false,
      domain: "",
      mxValid: false,
      score: 0,
      status: "invalid",
      flags: ["Invalid email syntax / format"],
    };
  }

  const [localPart, domain] = email.split("@");

  // 2. Disposable check
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  if (isDisposable) {
    flags.push("Disposable / burner email domain detected");
  }

  // 3. Role-based check
  const isRoleBased = ROLE_BASED_PREFIXES.has(localPart);
  if (isRoleBased) {
    flags.push(`Role-based mailbox account (${localPart}@)`);
  }

  // 4. Free provider check
  const isFreeProvider = FREE_PROVIDERS.has(domain);
  if (isFreeProvider) {
    flags.push("Free consumer email provider (personal rather than corporate/project domain)");
  }

  // 5. Domain / TLD validation
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  const mxValid = domainParts.length >= 2 && tld.length >= 2;

  // Calculate score (0 to 100)
  let score = 100;

  if (isDisposable) {
    score -= 80;
  }
  if (isRoleBased) {
    score -= 15;
  }
  if (isFreeProvider) {
    score -= 10;
  }
  if (!mxValid) {
    score -= 50;
  }

  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: "valid" | "risky" | "invalid";
  if (isDisposable || score < 40) {
    status = "invalid";
  } else if (isRoleBased || isFreeProvider || score < 80) {
    status = "risky";
  } else {
    status = "valid";
  }

  return {
    email,
    isValid: status !== "invalid",
    isDisposable,
    isRoleBased,
    isFreeProvider,
    domain,
    mxValid,
    score,
    status,
    flags,
  };
}
