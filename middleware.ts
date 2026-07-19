import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie (both HTTP and Secure HTTPS variants)
  const hasSession =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  // Define paths to protect
  const protectedUiPaths = ["/dashboard", "/groups", "/profile", "/admin"];
  const protectedApiPaths = [
    "/api/files",
    "/api/groups",
    "/api/profile",
    "/api/admin",
  ];

  // 1. Check Protected UI Routes
  const isUiProtected = protectedUiPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isUiProtected && !hasSession) {
    const loginUrl = new URL("/sign-in", request.url);
    // Preserving the original request path for redirect after sign-in
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Check Protected API Routes
  const isApiProtected = protectedApiPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isApiProtected && !hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

// Scoped matcher configuration to avoid running on public pages or static assets
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/files/:path*",
    "/api/groups/:path*",
    "/api/profile/:path*",
    "/api/admin/:path*",
  ],
};
