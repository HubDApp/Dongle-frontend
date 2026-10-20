import { NextRequest, NextResponse } from "next/server";
import { classifyRequest } from "@/services/rate-limit/config";
import { apiRateLimiter, rateLimitResponse } from "@/services/rate-limit";
import { applyRateLimitHeaders } from "@/services/rate-limit/headers";

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

/** Build the passthrough response, forwarding the CSP nonce to server code. */
function buildNextResponse(request: NextRequest, nonce: string): NextResponse {
  return NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        // Pass nonce to server components via request header
        "x-nonce": nonce,
      }),
    },
  });
}

/** Apply CSP + static security headers to a response in-place. */
function applySecurityHeaders(response: NextResponse, csp: string): void {
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
}

/**
 * Deterministic, non-reversible hash of an IP (FNV-style). Pure JS so it works
 * in the Edge runtime without Node crypto.
 */
function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16).slice(0, 8)}`;
}

/** Resolve the client IP from proxy headers (first entry of x-forwarded-for). */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Authenticated admin sessions are identified by the admin cookie. */
function isAuthenticatedAdmin(request: NextRequest): boolean {
  return Boolean(request.cookies.get("dongle_admin_token")?.value);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const { pathname } = request.nextUrl;

  // Enforce rate limits on API routes (Issue #729).
  if (pathname.startsWith("/api/")) {
    const category = classifyRequest(pathname, request.method);
    const result = await apiRateLimiter.check(
      {
        ip: hashIp(clientIp(request)),
        subject: isAuthenticatedAdmin(request) ? "admin" : null,
      },
      category,
    );

    if (!result.allowed) {
      const blocked = NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded for ${result.category} requests.`,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        { status: 429 },
      );
      applyRateLimitHeaders(blocked, result);
      applySecurityHeaders(blocked, csp);
      return blocked;
    }

    const response = buildNextResponse(request, nonce);
    applySecurityHeaders(response, csp);
    return applyRateLimitHeaders(response, result);
  }

  const response = buildNextResponse(request, nonce);
  applySecurityHeaders(response, csp);
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
