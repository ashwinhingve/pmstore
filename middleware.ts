import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // List of protected routes that require authentication
  const protectedRoutes = [
    "/account",
    "/orders",
    "/profile",
    "/wishlist",
    "/wholesale/dashboard",
  ];

  // List of admin routes that require admin role
  const adminRoutes = ["/admin"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Check for NextAuth session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Admin route protection: require authentication AND admin role
  if (isAdminRoute) {
    if (!token) {
      // Not authenticated - redirect to login
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    if (token.role !== "admin") {
      // Authenticated but not admin - redirect to home with error
      const url = new URL("/", request.url);
      url.searchParams.set("error", "admin_access_required");
      return NextResponse.redirect(url);
    }
  }

  // If route is protected and no token exists, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If token exists, forward user info as request headers so API routes can read them
  if (token) {
    const requestHeaders = new Headers(request.headers);
    // Only set headers when values are genuinely present to avoid "undefined" strings
    if (token.id) requestHeaders.set("x-user-id", token.id as string);
    if (token.role) requestHeaders.set("x-user-role", token.role as string);
    if (token.email) requestHeaders.set("x-user-email", token.email as string);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
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
