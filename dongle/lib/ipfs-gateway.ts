const GATEWAY_CACHE_KEY = "dongle:ipfs-gateway";
const GATEWAY_CACHE_TTL = 60 * 60 * 1000;

export const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://gateway.io/ipfs/",
] as const;

interface GatewayCache {
  gateway: string;
  expiresAt: number;
}

function readCachedGateway(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const cached = JSON.parse(window.localStorage.getItem(GATEWAY_CACHE_KEY) || "null") as GatewayCache | null;
    if (cached && cached.expiresAt > Date.now() && IPFS_GATEWAYS.includes(cached.gateway as typeof IPFS_GATEWAYS[number])) {
      return cached.gateway;
    }
  } catch {
    // Ignore unavailable or malformed browser storage.
  }

  return undefined;
}

export function cacheSuccessfulGateway(gateway: string) {
  if (typeof window === "undefined" || !IPFS_GATEWAYS.includes(gateway as typeof IPFS_GATEWAYS[number])) return;

  try {
    window.localStorage.setItem(
      GATEWAY_CACHE_KEY,
      JSON.stringify({ gateway, expiresAt: Date.now() + GATEWAY_CACHE_TTL }),
    );
  } catch {
    // Caching is an optimization and must not prevent image rendering.
  }
}

function getCid(path: string): string | undefined {
  if (path.startsWith("ipfs://")) return path.slice("ipfs://".length).replace(/^ipfs\//, "");

  const ipfsPath = path.match(/(?:^|\/)ipfs\/([^?#]+)/)?.[1];
  return ipfsPath;
}

export function getIpfsGatewayUrls(source: string): string[] {
  const cid = getCid(source);
  if (!cid) return [source];

  const cachedGateway = readCachedGateway();
  const orderedGateways = cachedGateway
    ? [cachedGateway, ...IPFS_GATEWAYS.filter((gateway) => gateway !== cachedGateway)]
    : [...IPFS_GATEWAYS];

  return orderedGateways.map((gateway) => `${gateway}${cid}`);
}

export function getGatewayForUrl(url: string): string | undefined {
  return IPFS_GATEWAYS.find((gateway) => url.startsWith(gateway));
}

export function logGatewayFailure(url: string, error: unknown) {
  console.warn("IPFS gateway failed", {
    gateway: getGatewayForUrl(url) || "unknown",
    url,
    error,
  });
}
