import { RateLimiterService, RateLimitResult } from "./rate-limiter";
import { Logger } from "./logger";

const logger = Logger.withContext("AuthRateLimiter");
const authRateLimiterService = new RateLimiterService("auth_ratelimit");

export interface AuthRateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

export function getAuthRateLimitConfig(): AuthRateLimitConfig {
  const maxAttempts = parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || "5",
    10,
  );
  const windowSeconds = parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS || "900",
    10,
  );

  return {
    maxAttempts: isNaN(maxAttempts) ? 5 : maxAttempts,
    windowSeconds: isNaN(windowSeconds) ? 900 : windowSeconds,
  };
}

/**
 * Constructs identity key using IP Address + Email Address.
 * Gracefully falls back to IP address if email is unavailable or malformed.
 */
export function getAuthIdentityKey(ip: string, email?: string | null): string {
  const normalizedIp = ip.trim();
  const normalizedEmail =
    email && typeof email === "string" && email.trim() !== ""
      ? email.trim().toLowerCase()
      : "ip_only";

  return `${normalizedIp}:${normalizedEmail}`;
}

/**
 * Extracts client IP address from request headers.
 */
export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Checks if the identity is currently allowed to make authentication attempts.
 */
export async function checkAuthRateLimit(
  ip: string,
  email?: string | null,
): Promise<RateLimitResult> {
  const config = getAuthRateLimitConfig();
  const key = getAuthIdentityKey(ip, email);
  const result = await authRateLimiterService.checkLimit(
    key,
    config.maxAttempts,
    config.windowSeconds,
  );

  if (!result.allowed) {
    logger.warn(
      `BLOCKED_ATTEMPT: Authentication blocked for identity [${key}]. Current count: ${result.currentCount}/${config.maxAttempts}. Retry after: ${result.resetInSeconds}s`,
    );
  }

  return result;
}

/**
 * Records a failed authentication attempt by incrementing the failure counter.
 */
export async function recordAuthFailure(
  ip: string,
  email?: string | null,
): Promise<number> {
  const config = getAuthRateLimitConfig();
  const key = getAuthIdentityKey(ip, email);
  const newCount = await authRateLimiterService.increment(
    key,
    config.windowSeconds,
  );

  if (newCount >= config.maxAttempts) {
    logger.error(
      `EXCESSIVE_FAILURES: Identity [${key}] reached threshold of ${newCount}/${config.maxAttempts} failed authentication attempts within ${config.windowSeconds}s window.`,
    );
  } else {
    logger.info(
      `AUTH_FAILURE: Incremented failure count for identity [${key}]. Current count: ${newCount}/${config.maxAttempts}`,
    );
  }

  return newCount;
}

/**
 * Resets the failure counter upon successful authentication.
 */
export async function recordAuthSuccess(
  ip: string,
  email?: string | null,
): Promise<void> {
  const key = getAuthIdentityKey(ip, email);
  await authRateLimiterService.reset(key);
  logger.info(
    `AUTH_SUCCESS: Reset authentication failure counter for identity [${key}]`,
  );
}
