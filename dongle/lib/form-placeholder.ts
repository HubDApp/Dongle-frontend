/**
 * Dynamic, contextual placeholder text for form fields (Issue #524).
 *
 * Acceptance criteria:
 *   - Placeholder shows a format example appropriate for the field type
 *   - Changes based on field type (url, email, text, number, textarea, etc.)
 *   - Shows expected input length when a maxLength is set
 *   - Helpful without being cluttered — one concise hint per field
 *   - Accessible — placeholder text is supplementary (not the only label)
 */

export type FieldType =
  | "text"
  | "url"
  | "email"
  | "number"
  | "tel"
  | "textarea"
  | "search"
  | "password"
  | "date"
  | "contractId"
  | "stellarAddress"
  | "projectName"
  | "projectDescription"
  | "githubUrl"
  | "websiteUrl"
  | "logoUrl"
  | "docsUrl"
  | "auditUrl"
  | "bugBountyUrl"
  | "projectId"
  | "tag"
  | "reviewComment"
  | "domain";

interface PlaceholderOptions {
  /** Semantic field type; determines the example format shown. */
  fieldType?: FieldType;
  /**
   * Maximum allowed character count.
   * When set, an "(up to N chars)" hint is appended if there is room.
   */
  maxLength?: number;
  /**
   * Minimum required character count.
   * When set, an "(at least N chars)" hint is used instead of maxLength when
   * both are absent from the base placeholder.
   */
  minLength?: number;
  /**
   * Override the base example text entirely.
   * Length hint is still appended when maxLength is provided.
   */
  customExample?: string;
}

/** Base example text keyed by field type. */
const FIELD_EXAMPLES: Record<FieldType, string> = {
  text: "e.g. My Project",
  url: "https://example.com",
  email: "you@example.com",
  number: "e.g. 42",
  tel: "+1 (555) 000-0000",
  textarea: "Write your text here…",
  search: "Search…",
  password: "••••••••",
  date: "YYYY-MM-DD",
  contractId: "CAABC…XYZ (56 chars, starts with C)",
  stellarAddress: "GABC…XYZ (56 chars, starts with G)",
  projectName: "e.g. Soroban Swap",
  projectDescription: "What does your project do? (concise & engaging)",
  githubUrl: "https://github.com/owner/repo",
  websiteUrl: "https://yourproject.com",
  logoUrl: "https://cdn.example.com/logo.png",
  docsUrl: "https://docs.yourproject.com",
  auditUrl: "https://audit-firm.com/report-123",
  bugBountyUrl: "https://hackerone.com/yourproject",
  projectId: "e.g. yourproject.com or my-dapp",
  tag: "e.g. defi, swap, amm",
  reviewComment: "Share your experience with this project…",
  domain: "yourproject.com",
};

/** Fields where appending a length hint is not useful or would be cluttered. */
const NO_LENGTH_HINT_TYPES = new Set<FieldType>([
  "password",
  "date",
  "contractId",
  "stellarAddress",
  "search",
]);

/**
 * Returns a contextual placeholder string for a form field.
 *
 * @example
 * // URL field with max 200 chars
 * getFieldPlaceholder({ fieldType: "websiteUrl", maxLength: 200 })
 * // → "https://yourproject.com  (up to 200 chars)"
 *
 * @example
 * // Generic text with minLength
 * getFieldPlaceholder({ fieldType: "text", minLength: 3 })
 * // → "e.g. My Project  (at least 3 chars)"
 */
export function getFieldPlaceholder(opts: PlaceholderOptions = {}): string {
  const { fieldType = "text", maxLength, minLength, customExample } = opts;

  const base = customExample ?? FIELD_EXAMPLES[fieldType] ?? "Enter value";

  // Build length hint
  let hint = "";
  if (maxLength && !NO_LENGTH_HINT_TYPES.has(fieldType)) {
    hint = `  (up to ${maxLength} chars)`;
  } else if (minLength && !maxLength && !NO_LENGTH_HINT_TYPES.has(fieldType)) {
    hint = `  (at least ${minLength} chars)`;
  }

  return `${base}${hint}`;
}

/**
 * Infer a FieldType from an HTML input type string and an optional field name.
 * Used to auto-derive the placeholder when no explicit fieldType is given.
 */
export function inferFieldType(
  inputType: string | undefined,
  fieldName?: string,
): FieldType {
  const name = (fieldName ?? "").toLowerCase();

  // Name-based inference (most specific)
  if (name.includes("contractaddress") || name.includes("contractid")) return "contractId";
  if (name.includes("publickey") || name.includes("stellaraddress") || name.includes("walletaddress")) return "stellarAddress";
  if (name.includes("githuburl") || name.includes("repositoryurl") || name.includes("repourl")) return "githubUrl";
  if (name.includes("websiteurl") || name.includes("siteurl")) return "websiteUrl";
  if (name.includes("logourl")) return "logoUrl";
  if (name.includes("docsurl") || name.includes("documentationurl")) return "docsUrl";
  if (name.includes("auditurl") || name.includes("auditreporturl")) return "auditUrl";
  if (name.includes("bugbountyurl") || name.includes("bugbounty")) return "bugBountyUrl";
  if (name.includes("projectname") || name.includes("appname")) return "projectName";
  if (name.includes("description")) return "projectDescription";
  if (name.includes("projectid")) return "projectId";
  if (name.includes("tag")) return "tag";
  if (name.includes("comment") || name.includes("review")) return "reviewComment";
  if (name.includes("domain")) return "domain";
  if (name.includes("email")) return "email";
  if (name.includes("tel") || name.includes("phone")) return "tel";

  // Input type fallback
  switch (inputType) {
    case "url":
      return "url";
    case "email":
      return "email";
    case "number":
      return "number";
    case "tel":
      return "tel";
    case "search":
      return "search";
    case "password":
      return "password";
    case "date":
      return "date";
    default:
      return "text";
  }
}
