import { redis } from "@/lib/redis";
import { verifySignature } from "@/lib/verify-signature";

interface SignedListRequest {
  payload: string;
  signature: string;
  publicKey: string;
  timestamp: string;
  nonce: string;
}

export async function verifyCuratedListRequest(
  signed: unknown,
  action: string,
  data: Record<string, unknown>,
  actorAddress: string,
): Promise<boolean> {
  if (!signed || typeof signed !== "object") return false;
  const auth = signed as Partial<SignedListRequest>;
  if (
    typeof auth.payload !== "string" ||
    typeof auth.signature !== "string" ||
    typeof auth.publicKey !== "string" ||
    typeof auth.timestamp !== "string" ||
    typeof auth.nonce !== "string" ||
    auth.publicKey !== actorAddress ||
    !redis
  ) return false;

  const timestamp = Date.parse(auth.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;
  if (!verifySignature(auth.payload, auth.signature, auth.publicKey)) return false;

  let signedData: { action?: string; data?: Record<string, unknown> };
  try {
    signedData = JSON.parse(auth.payload) as typeof signedData;
  } catch {
    return false;
  }
  if (signedData.action !== action || JSON.stringify(signedData.data) !== JSON.stringify(data)) return false;

  const result = await redis.set(`curated-lists:nonce:${auth.nonce}`, "used", { nx: true, ex: 300 });
  return result === "OK";
}