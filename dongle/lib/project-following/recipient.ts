import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";

export async function resolveProjectFollowingRecipient(): Promise<string | null> {
  const session = await getSession();
  if (session?.sub) return session.sub;
  const jar = await cookies();
  return jar.get(RECIPIENT_COOKIE)?.value ?? null;
}