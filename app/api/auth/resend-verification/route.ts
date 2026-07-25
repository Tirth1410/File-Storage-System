import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { RateLimiterService } from "@/app/lib/rate-limiter";
import { getClientIp } from "@/app/lib/auth-rate-limiter";
import { Logger } from "@/app/lib/logger";

const logger = Logger.withContext("ResendVerificationAPI");
const resendRateLimiter = new RateLimiterService("resend_verification");

const MAX_RESEND_ATTEMPTS = 3;
const RESEND_WINDOW_SECONDS = 900; // 15 minutes

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  let email: string | null = null;

  try {
    const body = await request.json();
    if (body && typeof body.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  // 1. Rate limiting check per IP + Email
  const identityKey = `${ip}:${email}`;
  const rateLimit = await resendRateLimiter.checkLimit(
    identityKey,
    MAX_RESEND_ATTEMPTS,
    RESEND_WINDOW_SECONDS,
  );

  if (!rateLimit.allowed) {
    logger.warn(
      `RESEND_RATE_LIMITED: Resend verification blocked for [${identityKey}]. Retry in ${rateLimit.resetInSeconds}s`,
    );
    return NextResponse.json(
      {
        error: `Too many resend verification requests. Please wait ${Math.ceil(
          rateLimit.resetInSeconds / 60,
        )} minute(s) before trying again.`,
        retryAfterSeconds: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.resetInSeconds.toString(),
        },
      },
    );
  }

  // Record attempt in rate limiter
  await resendRateLimiter.increment(identityKey, RESEND_WINDOW_SECONDS);

  try {
    // 2. Check if user exists and is unverified
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && !user.emailVerified) {
      logger.info(
        `Triggering resend verification email for user [${user.id} - ${email}]`,
      );

      // Trigger Better Auth's verification email generator
      await auth.api.sendVerificationEmail({
        body: {
          email,
          callbackURL: "/dashboard?verified=true",
        },
      });
    } else {
      logger.info(
        `Resend verification requested for [${email}], but user does not exist or is already verified. Standard success response returned to prevent enumeration.`,
      );
    }

    // Always return generic success to protect user privacy (enumeration protection)
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists and requires verification, a verification email has been sent.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      `Failed to resend verification email for [${email}]: ${errorMsg}`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to resend verification email. Please try again later." },
      { status: 500 },
    );
  }
}
