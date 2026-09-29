import { normalizeUrl } from "@/lib/url";

export interface ProjectDomainInfo {
  domain: string;
  protocol: "http:" | "https:";
  resolves: boolean;
  sslValid: boolean;
  checkedAt: string;
  cached: boolean;
}

export interface ProjectDomainValidationResult {
  valid: boolean;
  info?: ProjectDomainInfo;
  error?: string;
}

export interface ProjectDomainValidationOptions {
  bypassCache?: boolean;
  cacheTtlMs?: number;
  resolver?: (domain: string) => Promise<boolean>;
  sslChecker?: (url: URL) => Promise<boolean>;
}

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; result: ProjectDomainValidationResult }>();

async function defaultResolver(domain: string): Promise<boolean> {
  const dns = await import("node:dns/promises");
  const results = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain),
    dns.resolveCname(domain),
  ]);

  return results.some(
    (result) => result.status === "fulfilled" && Array.isArray(result.value) && result.value.length > 0,
  );
}

async function defaultSslChecker(url: URL): Promise<boolean> {
  if (url.protocol !== "https:") return false;

  const https = await import("node:https");

  return new Promise((resolve) => {
    const request = https.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        method: "HEAD",
        path: url.pathname || "/",
        timeout: 5000,
        rejectUnauthorized: true,
      },
      (response) => {
        response.resume();
        resolve(true);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
    request.end();
  });
}

export function clearProjectDomainValidationCache(): void {
  cache.clear();
}

export async function validateProjectDomain(
  input: string | null | undefined,
  options: ProjectDomainValidationOptions = {},
): Promise<ProjectDomainValidationResult> {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: "Domain or URL is required." };
  }

  let url: URL;
  try {
    url = new URL(normalizeUrl(input));
  } catch {
    return { valid: false, error: "Invalid domain or URL." };
  }

  const domain = url.hostname.replace(/^www\./i, "").toLowerCase();
  const cacheKey = `${url.protocol}//${domain}`;
  const now = Date.now();
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  if (!options.bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        ...cached.result,
        info: cached.result.info ? { ...cached.result.info, cached: true } : undefined,
      };
    }
  }

  const resolver = options.resolver ?? defaultResolver;
  const sslChecker = options.sslChecker ?? defaultSslChecker;

  try {
    const resolves = await resolver(domain);
    if (!resolves) {
      return { valid: false, error: "Domain does not resolve." };
    }

    const sslValid = await sslChecker(url);
    const result: ProjectDomainValidationResult = {
      valid: sslValid,
      info: {
        domain,
        protocol: url.protocol as "http:" | "https:",
        resolves,
        sslValid,
        checkedAt: new Date(now).toISOString(),
        cached: false,
      },
      error: sslValid ? undefined : "Domain must serve a valid HTTPS certificate.",
    };

    cache.set(cacheKey, { result, expiresAt: now + ttl });
    return result;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Domain validation failed.",
    };
  }
}
