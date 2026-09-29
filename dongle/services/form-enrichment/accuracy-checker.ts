/**
 * Data Accuracy Checking Service
 * Cross-validates submission fields, calculates overall data accuracy, and surfaces quality risks.
 */

import { extractDomain } from "@/lib/url";
import { isValidSorobanContractId } from "@/lib/stellar-address";
import type {
  DataAccuracyReport,
  DataAccuracyCheckItem,
  FormEnrichmentInput,
  EmailVerificationResult,
  PhoneValidationResult,
  GeocodeResult,
  CompanyData,
} from "./types";

/**
 * Check overall data accuracy and coherence across form fields
 */
export function checkDataAccuracy(params: {
  input: FormEnrichmentInput;
  emailResult?: EmailVerificationResult | null;
  phoneResult?: PhoneValidationResult | null;
  geocodeResult?: GeocodeResult | null;
  companyData?: CompanyData | null;
}): DataAccuracyReport {
  const { input, emailResult, phoneResult, geocodeResult, companyData } = params;
  const checks: DataAccuracyCheckItem[] = [];
  const warnings: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  // 1. Email Verification Check (Weight: 25)
  if (emailResult) {
    if (emailResult.isValid && !emailResult.isDisposable) {
      checks.push({
        name: "Email Validity",
        passed: true,
        score: emailResult.score,
        weight: 25,
        message: "Email syntax is valid with deliverable domain",
        severity: "info",
      });
    } else {
      checks.push({
        name: "Email Validity",
        passed: false,
        score: emailResult.score,
        weight: 25,
        message: emailResult.flags[0] || "Invalid email address",
        severity: "error",
      });
      warnings.push(`Email issue: ${emailResult.flags.join(", ")}`);
    }
  }

  // 2. Domain Alignment Check: Does contact email domain match project website? (Weight: 20)
  if (input.domainOrWebsite && emailResult?.domain) {
    let siteDomain = "";
    try {
      siteDomain = extractDomain(input.domainOrWebsite).toLowerCase().replace(/^www\./, "");
    } catch {
      siteDomain = input.domainOrWebsite.toLowerCase();
    }

    const emailDomain = emailResult.domain.toLowerCase().replace(/^www\./, "");

    if (siteDomain && emailDomain) {
      if (siteDomain === emailDomain || emailDomain.endsWith(`.${siteDomain}`)) {
        checks.push({
          name: "Domain Alignment",
          passed: true,
          score: 100,
          weight: 20,
          message: `Contact email domain matches project domain (${siteDomain})`,
          severity: "info",
        });
      } else if (emailResult.isFreeProvider) {
        checks.push({
          name: "Domain Alignment",
          passed: true,
          score: 75,
          weight: 20,
          message: "Contact uses personal consumer email rather than organization domain",
          severity: "warning",
        });
        warnings.push("Contact uses consumer email rather than project domain");
        suggestions.push("Use an email address matching your project domain for higher trust");
      } else {
        checks.push({
          name: "Domain Alignment",
          passed: false,
          score: 50,
          weight: 20,
          message: `Email domain (${emailDomain}) differs from project website (${siteDomain})`,
          severity: "warning",
        });
        warnings.push(`Email domain (${emailDomain}) does not match website domain (${siteDomain})`);
      }
    }
  }

  // 3. Location / Address Geocoding Precision (Weight: 20)
  if (geocodeResult) {
    const geoScore = Math.round(geocodeResult.confidence * 100);
    checks.push({
      name: "Geocoding Precision",
      passed: geocodeResult.confidence >= 0.7,
      score: geoScore,
      weight: 20,
      message: `Location successfully geocoded to ${geocodeResult.formattedAddress}`,
      severity: geocodeResult.confidence >= 0.7 ? "info" : "warning",
    });
  } else if (input.address || input.location) {
    checks.push({
      name: "Geocoding Precision",
      passed: false,
      score: 30,
      weight: 20,
      message: "Address could not be accurately geocoded",
      severity: "warning",
    });
    warnings.push("Address could not be geocoded to coordinates");
  }

  // 4. Phone Number Validation (Weight: 15)
  if (phoneResult) {
    checks.push({
      name: "Phone Number Validation",
      passed: phoneResult.isValid,
      score: phoneResult.score,
      weight: 15,
      message: phoneResult.isValid
        ? `Valid E.164 phone format (${phoneResult.e164})`
        : phoneResult.error || "Invalid phone number",
      severity: phoneResult.isValid ? "info" : "warning",
    });
    if (!phoneResult.isValid && phoneResult.error) {
      warnings.push(`Phone validation: ${phoneResult.error}`);
    }
  }

  // 5. Smart Contract Address Validation (Weight: 20)
  if (input.contractAddresses && input.contractAddresses.length > 0) {
    let validContracts = 0;
    for (const address of input.contractAddresses) {
      if (isValidSorobanContractId(address.trim().toUpperCase())) {
        validContracts++;
      }
    }
    const contractScore = Math.round((validContracts / input.contractAddresses.length) * 100);
    const allValid = validContracts === input.contractAddresses.length;

    checks.push({
      name: "Soroban Contract IDs",
      passed: allValid,
      score: contractScore,
      weight: 20,
      message: `${validContracts} of ${input.contractAddresses.length} Soroban contract IDs are valid 56-char C... format`,
      severity: allValid ? "info" : "error",
    });

    if (!allValid) {
      flags.push("Contains invalid Soroban contract ID strings");
      warnings.push("One or more Soroban contract IDs failed validation");
    }
  }

  // 6. Organization Verification (Bonus signal)
  if (companyData?.verified) {
    checks.push({
      name: "Verified Entity",
      passed: true,
      score: 100,
      weight: 10,
      message: `Verified organization: ${companyData.companyName}`,
      severity: "info",
    });
  }

  // Calculate weighted overall score
  let totalScoreWeight = 0;
  let earnedScore = 0;

  for (const check of checks) {
    earnedScore += (check.score / 100) * check.weight;
    totalScoreWeight += check.weight;
  }

  const overallScore = totalScoreWeight > 0
    ? Math.round((earnedScore / totalScoreWeight) * 100)
    : 85;

  let qualityTier: DataAccuracyReport["qualityTier"];
  if (overallScore >= 85) {
    qualityTier = "excellent";
  } else if (overallScore >= 70) {
    qualityTier = "good";
  } else if (overallScore >= 50) {
    qualityTier = "needs_review";
  } else {
    qualityTier = "poor";
  }

  return {
    overallScore,
    qualityTier,
    checks,
    warnings,
    flags,
    suggestions,
  };
}
