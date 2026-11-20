import type { OAuthProvider } from "./session";

export interface OAuthScopeInfo {
  scope: string;
  label: string;
  description: string;
}

/** Scopes requested in `googleAuthUrl` / `githubAuthUrl` (keep in sync with lib/auth/oauth.ts). */
export const OAUTH_SCOPES: Record<OAuthProvider, OAuthScopeInfo[]> = {
  google: [
    { scope: "openid", label: "Sign in", description: "Confirms your Google identity so we can sign you in." },
    { scope: "email", label: "Email address", description: "Reads your primary email to identify your account and send notices." },
    { scope: "profile", label: "Basic profile", description: "Reads your name and profile picture to display on Dongle." },
  ],
  github: [
    { scope: "read:user", label: "Profile (read-only)", description: "Reads your public GitHub profile: username, name and avatar." },
    { scope: "user:email", label: "Email addresses", description: "Reads your verified email addresses to identify your account." },
  ],
};

export const PROVIDER_PERMISSIONS_URL: Record<OAuthProvider, string> = {
  google: "https://myaccount.google.com/permissions",
  github: "https://github.com/settings/applications",
};

export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};
