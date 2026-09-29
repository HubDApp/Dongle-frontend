/**
 * Types for Form Data Enrichment System
 */

export interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  city: string;
  stateOrRegion: string;
  postalCode?: string;
  timezone: string;
  confidence: number; // 0 to 1
  source: "direct" | "city_lookup" | "country_lookup" | "fallback";
}

export interface CompanySocialProfiles {
  twitter?: string;
  github?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
}

export interface CompanyData {
  companyName: string;
  legalName?: string;
  domain: string;
  industry: string;
  sector: string;
  employeeRange: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  foundedYear?: number;
  headquarters: string;
  country: string;
  socialProfiles: CompanySocialProfiles;
  techStack: string[];
  logoUrl?: string;
  verified: boolean;
  description?: string;
  confidence: number; // 0 to 1
}

export interface EmailVerificationResult {
  email: string;
  isValid: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isFreeProvider: boolean;
  domain: string;
  mxValid: boolean;
  score: number; // 0 to 100
  status: "valid" | "risky" | "invalid";
  flags: string[];
}

export interface PhoneValidationResult {
  rawInput: string;
  isValid: boolean;
  e164: string;
  countryCode: string; // e.g. "US", "GB", "NG", "DE"
  callingCode: string; // e.g. "+1", "+44", "+234", "+49"
  nationalFormat: string;
  numberType: "mobile" | "fixed_line" | "voip" | "toll_free" | "unknown";
  score: number; // 0 to 100
  error?: string;
}

export interface DataAccuracyCheckItem {
  name: string;
  passed: boolean;
  score: number; // 0 to 100
  weight: number;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface DataAccuracyReport {
  overallScore: number; // 0 to 100
  qualityTier: "excellent" | "good" | "needs_review" | "poor";
  checks: DataAccuracyCheckItem[];
  warnings: string[];
  flags: string[];
  suggestions: string[];
}

export interface FormEnrichmentInput {
  address?: string;
  location?: string;
  domainOrWebsite?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  githubUrl?: string;
  description?: string;
  contractAddresses?: string[];
}

export interface FormEnrichmentResult {
  geocoding?: GeocodeResult | null;
  company?: CompanyData | null;
  email?: EmailVerificationResult | null;
  phone?: PhoneValidationResult | null;
  accuracy: DataAccuracyReport;
  enrichedAt: string;
}
