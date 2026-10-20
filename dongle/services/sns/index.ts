/**
 * Stellar Name Service resolution (Issue #727).
 */

export type {
  SnsForwardResult,
  SnsOwnershipRecord,
  SnsResolver,
  SnsReverseResult,
} from "@/types/sns";

export {
  SNS_CACHE_TTL_S,
  SNS_DOMAIN_REGEX,
  isValidSnsDomain,
  normalizeSnsDomain,
} from "@/types/sns";

export {
  _clearOwnershipRegistry,
  _clearSnsCache,
  getOwnershipRecord,
  invalidateSnsCache,
  isDomainVerified,
  resetSnsResolver,
  resolveAddressToDomain,
  resolveDomainToAddress,
  setSnsResolver,
  verifyDomainOwnership,
} from "./sns.service";
