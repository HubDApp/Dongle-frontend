/**
 * Phone Number Validation & E.164 Parsing Service
 */

import type { PhoneValidationResult } from "./types";

interface CallingCodeMeta {
  callingCode: string;
  countryCode: string;
  countryName: string;
  expectedLengths: number[]; // total length of national number digits
  mobilePrefixes?: string[];
}

const COUNTRY_DIALING_CODES: CallingCodeMeta[] = [
  {
    callingCode: "+1",
    countryCode: "US",
    countryName: "United States / Canada",
    expectedLengths: [10],
    mobilePrefixes: [],
  },
  {
    callingCode: "+44",
    countryCode: "GB",
    countryName: "United Kingdom",
    expectedLengths: [10],
    mobilePrefixes: ["7"],
  },
  {
    callingCode: "+49",
    countryCode: "DE",
    countryName: "Germany",
    expectedLengths: [10, 11],
    mobilePrefixes: ["15", "16", "17"],
  },
  {
    callingCode: "+33",
    countryCode: "FR",
    countryName: "France",
    expectedLengths: [9],
    mobilePrefixes: ["6", "7"],
  },
  {
    callingCode: "+81",
    countryCode: "JP",
    countryName: "Japan",
    expectedLengths: [10],
    mobilePrefixes: ["70", "80", "90"],
  },
  {
    callingCode: "+65",
    countryCode: "SG",
    countryName: "Singapore",
    expectedLengths: [8],
    mobilePrefixes: ["8", "9"],
  },
  {
    callingCode: "+234",
    countryCode: "NG",
    countryName: "Nigeria",
    expectedLengths: [10],
    mobilePrefixes: ["70", "80", "81", "90", "91"],
  },
  {
    callingCode: "+91",
    countryCode: "IN",
    countryName: "India",
    expectedLengths: [10],
    mobilePrefixes: ["6", "7", "8", "9"],
  },
  {
    callingCode: "+61",
    countryCode: "AU",
    countryName: "Australia",
    expectedLengths: [9],
    mobilePrefixes: ["4"],
  },
  {
    callingCode: "+41",
    countryCode: "CH",
    countryName: "Switzerland",
    expectedLengths: [9],
    mobilePrefixes: ["7"],
  },
];

/**
 * Validate and standardize an international phone number to E.164
 */
export function validatePhone(phoneInput?: string | null): PhoneValidationResult {
  if (!phoneInput || typeof phoneInput !== "string") {
    return {
      rawInput: "",
      isValid: false,
      e164: "",
      countryCode: "",
      callingCode: "",
      nationalFormat: "",
      numberType: "unknown",
      score: 0,
      error: "Missing or empty phone number",
    };
  }

  const raw = phoneInput.trim();
  // Strip all non-digit and non-plus characters
  const cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.length < 7 || cleaned.length > 16) {
    return {
      rawInput: raw,
      isValid: false,
      e164: "",
      countryCode: "",
      callingCode: "",
      nationalFormat: "",
      numberType: "unknown",
      score: 0,
      error: "Phone number has invalid length",
    };
  }

  // Determine calling code
  let matchedMeta: CallingCodeMeta | null = null;
  let nationalDigits = "";

  const sortedCodes = [...COUNTRY_DIALING_CODES].sort(
    (a, b) => b.callingCode.length - a.callingCode.length,
  );

  for (const meta of sortedCodes) {
    if (cleaned.startsWith(meta.callingCode)) {
      matchedMeta = meta;
      nationalDigits = cleaned.slice(meta.callingCode.length);
      break;
    }
  }

  // If no leading '+' was provided, check if first digits match known codes
  if (!matchedMeta && cleaned.startsWith("+")) {
    // Unknown country code with +
    return {
      rawInput: raw,
      isValid: true,
      e164: cleaned,
      countryCode: "GLOBAL",
      callingCode: cleaned.slice(0, 3),
      nationalFormat: cleaned.slice(3),
      numberType: "mobile",
      score: 80,
    };
  }

  if (!matchedMeta) {
    // Default to US/Canada +1 if 10 digits
    const usMeta = COUNTRY_DIALING_CODES.find((c) => c.countryCode === "US") || COUNTRY_DIALING_CODES[0];
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      matchedMeta = usMeta;
      nationalDigits = digitsOnly;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      matchedMeta = usMeta;
      nationalDigits = digitsOnly.slice(1);
    } else {
      return {
        rawInput: raw,
        isValid: false,
        e164: "",
        countryCode: "",
        callingCode: "",
        nationalFormat: "",
        numberType: "unknown",
        score: 20,
        error: "Could not identify international country calling code (e.g. +1, +44)",
      };
    }
  }

  // Strip leading 0 from national digits if present
  if (nationalDigits.startsWith("0")) {
    nationalDigits = nationalDigits.slice(1);
  }

  const lengthValid = matchedMeta.expectedLengths.includes(nationalDigits.length);
  if (!lengthValid) {
    return {
      rawInput: raw,
      isValid: false,
      e164: `${matchedMeta.callingCode}${nationalDigits}`,
      countryCode: matchedMeta.countryCode,
      callingCode: matchedMeta.callingCode,
      nationalFormat: nationalDigits,
      numberType: "unknown",
      score: 40,
      error: `Expected ${matchedMeta.expectedLengths.join(" or ")} digits for ${matchedMeta.countryName}, got ${nationalDigits.length}`,
    };
  }

  // Determine number type (mobile vs fixed-line)
  let numberType: PhoneValidationResult["numberType"] = "fixed_line";
  if (matchedMeta.mobilePrefixes && matchedMeta.mobilePrefixes.length > 0) {
    const isMobile = matchedMeta.mobilePrefixes.some((p) =>
      nationalDigits.startsWith(p),
    );
    numberType = isMobile ? "mobile" : "fixed_line";
  } else if (matchedMeta.countryCode === "US") {
    // Toll free check for US (800, 888, 877, 866, 855)
    if (
      nationalDigits.startsWith("800") ||
      nationalDigits.startsWith("888") ||
      nationalDigits.startsWith("877")
    ) {
      numberType = "toll_free";
    } else {
      numberType = "mobile";
    }
  }

  const e164 = `${matchedMeta.callingCode}${nationalDigits}`;

  return {
    rawInput: raw,
    isValid: true,
    e164,
    countryCode: matchedMeta.countryCode,
    callingCode: matchedMeta.callingCode,
    nationalFormat: formatNational(nationalDigits, matchedMeta.countryCode),
    numberType,
    score: 100,
  };
}

function formatNational(digits: string, countryCode: string): string {
  if (countryCode === "US" && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (countryCode === "GB" && digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return digits;
}
