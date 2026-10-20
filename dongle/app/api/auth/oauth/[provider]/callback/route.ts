import { NextResponse } from "next/server";
import { exchangeGitHubCode, exchangeGoogleCode, mapOAuthCallbackError } from "@/lib/auth/oauth";
import {
  consumeOAuthStateCookie,
  createSessionToken,
  setSessionCookie,
  setRefreshTokenCookie,
  type OAuthProvider,
} from "@/lib/auth/session";
import { upsertOAuthUser } from "@/lib/auth/users";
import { createDeviceSession } from "@/lib/auth/device-sessions";
import { extractClientIP } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

function isProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const origin = url.origin;

  if (!isProvider(provider)) {
    return NextResponse.redirect(new URL("/?oauth_error=unknown_provider", origin));
  }

  const denied = mapOAuthCallbackError(url.searchParams.get("error"));
  if (denied) {
    return NextResponse.redirect(new URL(`/?oauth_error=${denied}`, origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?oauth_error=missing_params", origin));
  }

  const parsedState = await consumeOAuthStateCookie(state);
  if (!parsedState || parsedState.provider !== provider) {
    return NextResponse.redirect(new URL("/?oauth_error=invalid_state", origin));
  }

  try {
    const profile =
      provider === "google" ? await exchangeGoogleCode(code) : await exchangeGitHubCode(code);

    if (!profile.providerId) {
      return NextResponse.redirect(new URL("/?oauth_error=missing_profile", origin));
    }

    const user = upsertOAuthUser(profile);

    const ip = extractClientIP(request as Parameters<typeof extractClientIP>[0]);
    const ua = request.headers.get("user-agent") ?? "";
    const acceptLang = request.headers.get("accept-language") ?? "";

    const { sessionId, refreshToken } = await createDeviceSession({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      ua,
      acceptLang,
      ipAddress: ip,
    });

    const token = await createSessionToken(user, sessionId);
    await setSessionCookie(token);
    await setRefreshTokenCookie(refreshToken);

    const dest = parsedState.returnTo.startsWith("/") ? parsedState.returnTo : "/";
    const redirect = new URL(dest, origin);
    redirect.searchParams.set("oauth", "connected");
    return NextResponse.redirect(redirect);
  } catch (error) {
    console.error("[oauth] callback failed", error);
    return NextResponse.redirect(new URL("/?oauth_error=provider", origin));
  }
}
