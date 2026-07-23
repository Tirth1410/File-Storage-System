import { auth } from "@/app/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
// import {
//   checkAuthRateLimit,
//   getClientIp,
//   getAuthRateLimitConfig,
//   recordAuthFailure,
//   recordAuthSuccess,
// } from "@/app/lib/auth-rate-limiter";

const { GET, POST: defaultPostHandler } = toNextJsHandler(auth);

export { GET };

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rate limiting ONLY applies to authentication endpoints (Sign In & Sign Up)
  const isAuthEndpoint =
    pathname.endsWith("/sign-in/email") ||
    pathname.endsWith("/sign-up/email") ||
    pathname === "/api/auth/sign-in/email" ||
    pathname === "/api/auth/sign-up/email";

  if (!isAuthEndpoint) {
    return defaultPostHandler(request);
  }

  /* Temporarily commented out rate limiting checks
  const ip = getClientIp(request.headers);
  let email: string | null = null;

  try {
    const body = await request.clone().json();
    if (body && typeof body.email === "string") {
      email = body.email;
    }
  } catch {
    // If request body is malformed or unparseable, email stays null and rate limiter falls back to IP
  }

  // 1. Check Rate Limit before password verification occurs
  const limitCheck = await checkAuthRateLimit(ip, email);

  if (!limitCheck.allowed) {
    const config = getAuthRateLimitConfig();
    return NextResponse.json(
      {
        error: `Too many failed authentication attempts. Please try again in ${limitCheck.resetInSeconds} seconds.`,
        retryAfterSeconds: limitCheck.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": limitCheck.resetInSeconds.toString(),
          "X-RateLimit-Limit": config.maxAttempts.toString(),
          "X-RateLimit-Remaining": limitCheck.remainingAttempts.toString(),
          "X-RateLimit-Reset": limitCheck.resetInSeconds.toString(),
        },
      },
    );
  }
  */

  // 2. Execute Authentication Handler
  const response = await defaultPostHandler(request);

  // 3. Update counter based on authentication outcome
  // if (response.ok || response.status === 200) {
  //   await recordAuthSuccess(ip, email);
  // } else if (response.status >= 400) {
  //   await recordAuthFailure(ip, email);
  // }

  return response;
}
