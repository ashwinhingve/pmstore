import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Origins allowed to call the mobile API surface (/api/v1/*) with credentials.
// Native/Expo clients send no Origin header, so they are unaffected by this list.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Routes that require authentication but no particular role.
const PROTECTED_ROUTES = [
  "/account",
  "/orders",
  "/profile",
  "/wishlist",
  "/wholesale/dashboard",
];

// Admin-only surfaces (staff is NOT allowed). Everything else under /admin and
// /api/admin is available to both admin and staff.
const ADMIN_ONLY_PAGES = ["/admin/settings", "/admin/users"];
const ADMIN_ONLY_APIS = [
  "/api/admin/settings",
  "/api/admin/users",
  "/api/admin/bulk-price",
  "/api/admin/bulk-stock",
];

function matchesAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function jsonDenied(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  // --- Admin surfaces: role-gated. Pages redirect, APIs return JSON errors. ---
  // NOTE: middleware trusts the token's role only as a fast first gate. Any
  // destructive admin API handler MUST re-read the role from the database
  // (see verifyAdminAccess) — a stale token must not be able to act.
  if (isAdminPage || isAdminApi) {
    if (!token) {
      if (isAdminApi) {
        return jsonDenied(401, "Unauthorized: Authentication required");
      }
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = token.role as string | undefined;
    const adminOnly =
      matchesAny(pathname, ADMIN_ONLY_PAGES) ||
      matchesAny(pathname, ADMIN_ONLY_APIS);
    const allowed = adminOnly
      ? role === "admin"
      : role === "admin" || role === "staff";

    if (!allowed) {
      if (isAdminApi) {
        return jsonDenied(403, "Forbidden: Insufficient role");
      }
      const url = new URL("/", request.url);
      url.searchParams.set("error", "admin_access_required");
      return NextResponse.redirect(url);
    }
  }

  // --- Auth-only protected routes ---
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // --- Build the onward response, forwarding user info to downstream routes ---
  let response: NextResponse;
  if (token) {
    const requestHeaders = new Headers(request.headers);
    // Only set headers when values are genuinely present to avoid "undefined" strings
    if (token.id) requestHeaders.set("x-user-id", token.id as string);
    if (token.role) requestHeaders.set("x-user-role", token.role as string);
    if (token.email) requestHeaders.set("x-user-email", token.email as string);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }

  // --- CORS: only the mobile API surface, only for allow-listed origins ---
  if (pathname.startsWith("/api/v1")) {
    const origin = request.headers.get("origin");
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Vary", "Origin");
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
