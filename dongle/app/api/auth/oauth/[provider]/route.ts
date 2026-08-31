import { NextResponse } from "next/server";
import { githubAuthUrl, googleAuthUrl } from "@/lib/auth/oauth";
import { setOAuthStateCookie, type OAuthProvider } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function isProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/";
  const nonce = crypto.randomUUID();
  const state = await setOAuthStateCookie({
    provider,
    nonce,
    returnTo: safeReturn,
  });

  try {
    const target = provider === "google" ? googleAuthUrl(state) : githubAuthUrl(state);
    return NextResponse.redirect(target);
  } catch (error) {
    console.error("[oauth] start failed", error);
    return NextResponse.redirect(
      new URL(`/?oauth_error=${provider}_unconfigured`, url.origin),
    );
  }
}
