/**
 * Redis key namespaces for admin 2FA (Issue #728).
 */

export function adminTwoFAConfigKey(publicKey: string): string {
  return `admin2fa:config:${publicKey}`;
}

export function adminWebAuthnChallengeKey(publicKey: string): string {
  return `admin2fa:webauthn:challenge:${publicKey}`;
}
