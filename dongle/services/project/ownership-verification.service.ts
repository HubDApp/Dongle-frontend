import { randomBytes } from "node:crypto";
import { lookup, resolveTxt } from "node:dns/promises";
import { isIP } from "node:net";
import { redis } from "@/lib/redis";

export type OwnershipVerificationMethod = "dns_txt" | "github_file" | "stellar_toml";
export type OwnershipVerificationStatus = "pending" | "verified" | "expired";

export interface OwnershipVerification {
  id: string;
  projectId: string;
  walletAddress: string;
  method: OwnershipVerificationMethod;
  target: string;
  token: string;
  status: OwnershipVerificationStatus;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  lastCheckedAt?: string;
  lastCheckMessage?: string;
}

export interface PublicOwnershipVerification extends Omit<OwnershipVerification, "token"> {}

export const OWNERSHIP_VERIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;
const memoryRecords = new Map<string, OwnershipVerification>();
const memoryIndexes = new Map<string, Set<string>>();

function recordKey(id: string) {
  return `ownership-verification:record:${id}`;
}

function indexKey(projectId: string, walletAddress: string) {
  return `ownership-verification:index:${projectId}:${walletAddress}`;
}

function validWallet(address: string) {
  return /^G[A-Z2-7]{55}$/.test(address);
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!trimmed || /[/?#@]/.test(trimmed)) throw new Error("Enter a domain name only.");
  const domain = new URL(`https://${trimmed}`).hostname.toLowerCase();
  if (!domain.includes(".") || domain === "localhost" || domain.endsWith(".local") || isIP(domain)) {
    throw new Error("Enter a public domain name.");
  }
  return domain;
}

function normalizeGitHubRepository(value: string): { owner: string; repo: string; url: string } {
  let url: URL;
  try {
    url = new URL(value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`);
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname.toLowerCase() !== "github.com" || parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error("Use a public GitHub URL in the format github.com/owner/repository.");
  }
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, ""), url: `https://github.com/${parts[0]}/${parts[1]}` };
}

function normalizeTarget(method: OwnershipVerificationMethod, target: string): string {
  if (method === "dns_txt" || method === "stellar_toml") return normalizeDomain(target);
  return normalizeGitHubRepository(target).url;
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
  return !(
    normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

async function assertPublicDomain(domain: string): Promise<void> {
  const addresses = await lookup(domain, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("The domain must resolve only to public IP addresses.");
  }
}

async function saveRecord(record: OwnershipVerification): Promise<void> {
  const index = indexKey(record.projectId, record.walletAddress);
  if (redis) {
    await redis.set(recordKey(record.id), JSON.stringify(record), { ex: OWNERSHIP_VERIFICATION_TTL_SECONDS });
    await redis.sadd(index, record.id);
    await redis.expire(index, OWNERSHIP_VERIFICATION_TTL_SECONDS);
    return;
  }
  memoryRecords.set(record.id, record);
  const ids = memoryIndexes.get(index) ?? new Set<string>();
  ids.add(record.id);
  memoryIndexes.set(index, ids);
}

async function loadRecord(id: string): Promise<OwnershipVerification | null> {
  if (!redis) return memoryRecords.get(id) ?? null;
  const value = await redis.get<string | OwnershipVerification>(recordKey(id));
  if (!value) return null;
  return typeof value === "string" ? JSON.parse(value) as OwnershipVerification : value;
}

export async function listOwnershipVerifications(
  projectId: string,
  walletAddress: string,
): Promise<PublicOwnershipVerification[]> {
  const index = indexKey(projectId, walletAddress);
  const ids = redis
    ? await redis.smembers<string[]>(index)
    : [...(memoryIndexes.get(index) ?? [])];
  const records = (await Promise.all(ids.map(loadRecord)))
    .filter((record): record is OwnershipVerification => Boolean(record));
  const now = Date.now();
  for (const record of records) {
    if (record.status !== "expired" && new Date(record.expiresAt).getTime() <= now) {
      record.status = "expired";
      record.lastCheckMessage = "Verification expired. Generate a new token to re-verify.";
      await saveRecord(record);
    }
  }
  return records
    .map(({ token: _token, ...record }) => record)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOwnershipVerification(input: {
  projectId: string;
  walletAddress: string;
  method: OwnershipVerificationMethod;
  target: string;
}, now = new Date()): Promise<OwnershipVerification> {
  if (!input.projectId || input.projectId.length > 128) throw new Error("Invalid project.");
  if (!validWallet(input.walletAddress)) throw new Error("Connect a valid Stellar wallet.");
  if (!["dns_txt", "github_file", "stellar_toml"].includes(input.method)) throw new Error("Select a supported verification method.");

  const createdAt = now.toISOString();
  const record: OwnershipVerification = {
    id: randomBytes(18).toString("hex"),
    projectId: input.projectId,
    walletAddress: input.walletAddress,
    method: input.method,
    target: normalizeTarget(input.method, input.target),
    token: randomBytes(24).toString("base64url"),
    status: "pending",
    createdAt,
    expiresAt: new Date(now.getTime() + OWNERSHIP_VERIFICATION_TTL_SECONDS * 1000).toISOString(),
  };
  await saveRecord(record);
  return record;
}

function isTokenPresent(text: string, token: string): boolean {
  return text.trim().split(/\r?\n/).some((line) => line.trim() === token || line.trim() === `dongle-verify=${token}`);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "text/plain, application/toml, application/vnd.github+json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Proof endpoint returned HTTP ${response.status}.`);
  return response.text();
}

async function checkDns(record: OwnershipVerification): Promise<boolean> {
  const records = await resolveTxt(record.target);
  return records.some((chunks) => chunks.join("").trim() === `dongle-verify=${record.token}`);
}

async function checkGitHub(record: OwnershipVerification): Promise<boolean> {
  const { owner, repo } = normalizeGitHubRepository(record.target);
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Dongle-Ownership-Verification" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub repository lookup returned HTTP ${response.status}.`);
  const metadata = await response.json() as { default_branch?: string };
  if (!metadata.default_branch) throw new Error("GitHub did not report a default branch.");
  const encodedBranch = metadata.default_branch.split("/").map(encodeURIComponent).join("/");
  const path = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodedBranch}/dongle-verify.txt`;
  return isTokenPresent(await fetchText(path), record.token);
}

async function checkStellarToml(record: OwnershipVerification): Promise<boolean> {
  await assertPublicDomain(record.target);
  const toml = await fetchText(`https://${record.target}/.well-known/stellar.toml`);
  const accounts = toml.match(/^ACCOUNTS\s*=\s*\[([^\]]*)\]/im)?.[1] ?? "";
  const homeDomain = toml.match(/^HOME_DOMAIN\s*=\s*["']([^"']+)["']/im)?.[1]?.toLowerCase();
  const dongleToken = toml.match(/^DONGLE_VERIFY\s*=\s*["']([^"']+)["']/im)?.[1];
  const hasWallet = accounts.split(/["',\s]+/).includes(record.walletAddress);
  return homeDomain === record.target && hasWallet && dongleToken === record.token;
}

export async function checkOwnershipVerification(
  id: string,
  projectId: string,
  walletAddress: string,
  now = new Date(),
): Promise<{ verification: PublicOwnershipVerification; message: string }> {
  const record = await loadRecord(id);
  if (!record || record.projectId !== projectId || record.walletAddress !== walletAddress) {
    throw new Error("Verification request not found.");
  }
  if (new Date(record.expiresAt).getTime() <= now.getTime()) {
    record.status = "expired";
    record.lastCheckedAt = now.toISOString();
    record.lastCheckMessage = "Verification expired. Generate a new token to re-verify.";
    await saveRecord(record);
  } else if (record.status !== "verified") {
    try {
      const verified = record.method === "dns_txt"
        ? await checkDns(record)
        : record.method === "github_file"
          ? await checkGitHub(record)
          : await checkStellarToml(record);
      record.status = verified ? "verified" : "pending";
      record.verifiedAt = verified ? now.toISOString() : undefined;
      record.lastCheckMessage = verified ? "Ownership verified." : "Token not found yet. Check the published proof and try again.";
    } catch (error) {
      record.status = "pending";
      record.lastCheckMessage = error instanceof Error ? error.message : "Proof check failed. Try again.";
    }
    record.lastCheckedAt = now.toISOString();
    await saveRecord(record);
  }

  const { token: _token, ...verification } = record;
  return { verification, message: record.lastCheckMessage ?? "Verification status updated." };
}

export function resetOwnershipVerificationsForTests(): void {
  memoryRecords.clear();
  memoryIndexes.clear();
}