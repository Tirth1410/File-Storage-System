/**
 * Application Configuration Service
 * Resolves configuration values dynamically based on active ENVIRONMENT.
 */

const isProd = process.env.ENVIRONMENT === "prod";

export const DEV_URL = process.env.DEV_URL || "http://localhost:3000";
export const PROD_URL =
  process.env.PROD_URL || "https://your-production-url.vercel.app";

// Dynamic resolved APP_URL based on active environment flag
export const APP_URL = isProd ? PROD_URL : DEV_URL;

// Side effect: Programmatically override/ensure BETTER_AUTH_URL is populated for Better Auth
if (typeof window === "undefined") {
  process.env.BETTER_AUTH_URL = APP_URL;
}
