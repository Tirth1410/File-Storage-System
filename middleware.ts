import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Clean incoming headers to prevent header spoofing/injection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");
  requestHeaders.delete("x-user-role");

  // Define paths to protect
  const protectedUiPaths = [
    "/dashboard",
    "/groups",
    "/profile",
    "/admin",
    "/s",
  ];
  const protectedApiPaths = [
    "/api/files",
    "/api/groups",
    "/api/profile",
    "/api/admin",
    "/api/s",
  ];

  const authPaths = ["/sign-in", "/sign-up"];

  const isUiProtected = protectedUiPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isApiProtected = protectedApiPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // Check for session cookie presence
  const hasSessionCookie =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  // If no session cookie, handle redirection/unauthorized immediately
  if (!hasSessionCookie) {
    if (isUiProtected) {
      const loginUrl = new URL("/sign-in", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (isApiProtected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // If session cookie exists, validate it against the DB via internal API fetch
  try {
    const origin = request.nextUrl.origin;
    const cookie = request.headers.get("cookie") || "";

    const sessionRes = await fetch(`${origin}/api/auth/get-session`, {
      headers: {
        cookie,
      },
    });

    if (!sessionRes.ok) {
      throw new Error("Failed to validate session");
    }

    const sessionData = await sessionRes.json();

    if (!sessionData || !sessionData.session || !sessionData.user) {
      // Invalid/Expired session
      if (isUiProtected) {
        const loginUrl = new URL("/sign-in", request.url);
        loginUrl.searchParams.set("callbackUrl", request.url);
        return NextResponse.redirect(loginUrl);
      }
      if (isApiProtected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const user = sessionData.user;

    // Check if user is banned
    if (user.banned) {
      if (isUiProtected) {
        const loginUrl = new URL("/sign-in", request.url);
        loginUrl.searchParams.set("error", "Your account has been banned.");
        return NextResponse.redirect(loginUrl);
      }
      if (isApiProtected) {
        return NextResponse.json({ error: "User is banned" }, { status: 403 });
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Check admin permissions
    const isAdminPath =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/api/admin" ||
      pathname.startsWith("/api/admin/");

    if (isAdminPath && user.role !== "admin") {
      if (isUiProtected) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (isApiProtected) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // If they are logged in and visiting sign-in or sign-up, redirect to dashboard
    if (isAuthPath) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Inject user context headers
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email);
    requestHeaders.set("x-user-role", user.role || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Session validation error in middleware:", error);
    // If validation fails due to network or database error, fallback safely
    if (isUiProtected) {
      const loginUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (isApiProtected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/s/:path*",
    "/api/files/:path*",
    "/api/groups/:path*",
    "/api/profile/:path*",
    "/api/admin/:path*",
    "/api/s/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
  ],
};
