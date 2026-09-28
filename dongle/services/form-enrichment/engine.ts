/**
 * Form Enrichment Engine
 * Combines geocoding, company lookup, email verification, phone validation, and accuracy checks.
 */

import { nowUTC } from "@/lib/date";
import { geocodeAddress } from "./geocoding";
import { lookupCompany } from "./company";
import { verifyEmail } from "./email-verifier";
import { validatePhone } from "./phone-validator";
import { checkDataAccuracy } from "./accuracy-checker";
import type {
  FormEnrichmentInput,
  FormEnrichmentResult,
} from "./types";

/**
 * Execute full enrichment pipeline on form submission data
 */
export async function enrichFormData(
  input: FormEnrichmentInput,
): Promise<FormEnrichmentResult> {
  // Execute async lookups in parallel
  const [geocodeResult, companyData] = await Promise.all([
    input.address || input.location
      ? geocodeAddress(input.address || input.location)
      : Promise.resolve(null),
    input.domainOrWebsite || input.companyName
      ? lookupCompany(input.domainOrWebsite || input.companyName)
      : Promise.resolve(null),
  ]);

  // Synchronous verifications
  const emailResult = input.email ? verifyEmail(input.email) : null;
  const phoneResult = input.phone ? validatePhone(input.phone) : null;

  // Run comprehensive data accuracy check
  const accuracy = checkDataAccuracy({
    input,
    emailResult,
    phoneResult,
    geocodeResult,
    companyData,
  });

  return {
    geocoding: geocodeResult,
    company: companyData,
    email: emailResult,
    phone: phoneResult,
    accuracy,
    enrichedAt: nowUTC(),
  };
}
