export interface SubmissionChecklistInput {
  name?: string;
  description?: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  contractAddresses?: string[];
}

/**
 * Computes submission quality score (0–100) from form field completeness.
 * Mirrors the weighting used by SubmissionChecklist.
 */
export function computeQualityScore(formData: SubmissionChecklistInput): number {
  const required = [
    Boolean(formData.name?.trim()),
    Boolean(formData.description?.trim()),
    Boolean(formData.websiteUrl?.trim()),
    Boolean(formData.githubUrl?.trim()),
  ];
  const optional = [
    Boolean(formData.logoUrl?.trim()),
    Boolean(formData.docsUrl?.trim()),
    Boolean(formData.auditReportUrl?.trim()),
    Boolean(formData.bugBountyUrl?.trim()),
    Boolean(formData.contractAddresses?.some((a) => a.trim().length > 0)),
  ];

  const requiredCompleted = required.filter(Boolean).length;
  const optionalCompleted = optional.filter(Boolean).length;

  const requiredWeight = 0.6;
  const optionalWeight = 0.4;
  const requiredScore = required.length > 0 ? requiredCompleted / required.length : 1;
  const optionalScore = optional.length > 0 ? optionalCompleted / optional.length : 0;

  return Math.round((requiredScore * requiredWeight + optionalScore * optionalWeight) * 100);
}

export function detectSuspiciousFlags(
  formData: SubmissionChecklistInput,
  qualityScore: number,
  existingNames: string[],
): string[] {
  const flags: string[] = [];

  if (qualityScore < 40) {
    flags.push("Low quality score");
  }

  if (!formData.auditReportUrl?.trim()) {
    flags.push("No audit report provided");
  }

  const normName = (formData.name ?? "").toLowerCase().trim();
  if (normName && existingNames.some((n) => n.toLowerCase().trim() === normName)) {
    flags.push("Possible duplicate project name");
  }

  const desc = formData.description ?? "";
  if (desc.length < 30) {
    flags.push("Very short description");
  }

  const urlPattern = /(bit\.ly|tinyurl|t\.co|goo\.gl)/i;
  if (urlPattern.test(formData.websiteUrl ?? "")) {
    flags.push("Suspicious shortened URL");
  }

  return flags;
}
