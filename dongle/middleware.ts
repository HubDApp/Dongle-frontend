import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a cryptographically random nonce for CSP.
 * Uses the Web Crypto API available in the Edge runtime.
 * `Buffer` is not available in the Edge runtime, so we use btoa + String.fromCharCode.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Builds the Content-Security-Policy header value.
 * A fresh nonce is generated per request so inline scripts are
 * allowed only when they carry the matching nonce attribute.
 */
function buildCsp(nonce: string): string {
  const directives: Record<string, string> = {
    "default-src": "'self'",
    // Scripts: only same-origin files and nonce-tagged inline scripts
    "script-src": `'self' 'nonce-${nonce}'`,
    // Styles: Tailwind requires unsafe-inline for utility classes injected at runtime
    "style-src": "'self' 'unsafe-inline'",
    // Fonts: Next.js serves fonts from /_next/static, covered by 'self'
    "font-src": "'self'",
    // Images: local assets + data URIs + IPFS gateways
    "img-src": "'self' data: https://ipfs.io https://gateway.pinata.cloud https://*.ipfs.io https://*.ipfs.dweb.link https://cloudflare-ipfs.com https://arweave.net https://*.arweave.net https://raw.githubusercontent.com https://avatars.githubusercontent.com https://res.cloudinary.com https://*.amazonaws.com https://images.unsplash.com https://pbs.twimg.com https://i.imgur.com",
    // Connections: self, WebSocket (wallet relay), Stellar Horizon & Soroban RPCs
    "connect-src": "'self' wss: https://*.stellar.org https://horizon*.stellar.org https://soroban*.stellar.org",
    // Prevent clickjacking via frames
    "frame-src": "'none'",
    "frame-ancestors": "'none'",
    // Block object/embed exploits
    "object-src": "'none'",
    // Restrict base tag hijacking
    "base-uri": "'self'",
    // Restrict form submissions to same-origin
    "form-action": "'self'",
    // Report violations to our endpoint
    "report-uri": "/api/csp-report",
  };

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value}`)
    .join("; ");
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        // Pass nonce to server components via request header
        "x-nonce": nonce,
      }),
    },
  });

  // Apply CSP and static security headers on every response
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files — no dynamic headers needed)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public assets (png, jpg, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
