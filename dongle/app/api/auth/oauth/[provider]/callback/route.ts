import { NextResponse } from "next/server";
import { exchangeGitHubCode, exchangeGoogleCode, mapOAuthCallbackError } from "@/lib/auth/oauth";
import {
  consumeOAuthStateCookie,
  createSessionToken,
  setSessionCookie,
  type OAuthProvider,
} from "@/lib/auth/session";
import { upsertOAuthUser } from "@/lib/auth/users";

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
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    const dest = parsedState.returnTo.startsWith("/") ? parsedState.returnTo : "/";
    const redirect = new URL(dest, origin);
    redirect.searchParams.set("oauth", "connected");
    return NextResponse.redirect(redirect);
  } catch (error) {
    console.error("[oauth] callback failed", error);
    return NextResponse.redirect(new URL("/?oauth_error=provider", origin));
  }
}
