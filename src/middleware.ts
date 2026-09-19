import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/home",
  "/donors",
  "/requests",
  "/notifications",
  "/profile",
  "/emergency",
  "/onboarding",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Edge-level guard: only checks for the presence of a session cookie.
 * Real authorisation is always re-verified server-side (layouts + API routes).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get("mbn_session")?.value);

  if (!hasSessionCookie && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return applyHeaders(NextResponse.redirect(url));
  }

  if (hasSessionCookie && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return applyHeaders(NextResponse.redirect(url));
  }

  return applyHeaders(NextResponse.next());
}

function applyHeaders(response: NextResponse) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];

  if (isDevelopment) {
    // Next.js development tooling uses eval and a websocket for HMR.
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:", "wss:");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSources.join(" ")}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      `connect-src ${connectSources.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon).*)"],
};
