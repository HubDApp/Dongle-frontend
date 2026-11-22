import { NextResponse } from "next/server";
import { createSessionToken, getSession, setSessionCookie } from "@/lib/auth/session";
import { fetchProviderProfile } from "@/lib/auth/oauth";
import { getProviderToken, getUser, recordAuthAudit, upsertOAuthUser } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

/** POST /api/auth/refresh-profile — re-fetches avatar, name and email from the OAuth provider. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUser(session.sub);
  if (!user || (user.provider !== "google" && user.provider !== "github")) {
    return NextResponse.json({ error: "No OAuth account to sync" }, { status: 400 });
  }

  const accessToken = getProviderToken(user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Provider authorization expired. Please sign in again." },
      { status: 409 },
    );
  }

  try {
    const profile = await fetchProviderProfile(user.provider, accessToken);
    const updated = upsertOAuthUser({
      provider: user.provider,
      providerId: user.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });
    recordAuthAudit({ userId: updated.id, action: "profile_sync" });
    await setSessionCookie(await createSessionToken(updated, session.sessionId));
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[oauth] profile refresh failed", error);
    return NextResponse.json(
      { error: `${user.provider === "google" ? "Google" : "GitHub"} is unavailable. Try again later.` },
      { status: 502 },
    );
  }
}
