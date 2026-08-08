"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/app/lib/auth-client";
import { Logo } from "@/app/components/shared/Logo";
import { Spinner } from "@/app/components/shared/Spinner";
import { TriangleAlert } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Unverified email state handling
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Derive invalid/expired token error message directly from search params
  const errorParam = searchParams.get("error");
  const isTokenError =
    errorParam === "invalid_token" ||
    errorParam === "INVALID_TOKEN" ||
    errorParam === "expired_token";

  const displayError =
    formError ||
    (isTokenError
      ? "Your email verification link is invalid or has expired. Please sign in to resend a new verification email."
      : null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setUnverifiedEmail(null);
    setResendSuccess(null);
    setResendError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (res.error) {
      const isUnverified =
        res.error.status === 403 ||
        res.error.code === "EMAIL_NOT_VERIFIED" ||
        res.error.message?.toLowerCase().includes("verify") ||
        res.error.message?.toLowerCase().includes("verified");

      if (isUnverified) {
        setUnverifiedEmail(email);
        setFormError("Email verification is required before signing in.");
      } else {
        setFormError(res.error.message || "Invalid email or password.");
      }
    } else {
      router.push("/dashboard");
    }
  }

  const handleResendEmail = async () => {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendError(data.error || "Failed to resend verification email.");
      } else {
        setResendSuccess(
          data.message ||
            "Verification email has been sent. Please check your inbox.",
        );
      }
    } catch {
      setResendError(
        "An error occurred while attempting to resend the verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-3" />
          <p className="text-sm text-[#737373]">
            Sign in to your secure file storage
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-bold text-[#171717] mb-6">
            Welcome back
          </h1>

          {/* Standard Error Notice */}
          {displayError && !unverifiedEmail && (
            <div className="mb-5 bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-sm rounded-xl px-4 py-3">
              {displayError}
            </div>
          )}

          {/* Unverified Email Warning Box */}
          {unverifiedEmail && (
            <div className="mb-5 bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.3)] text-[#854D0E] text-xs rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="w-5 h-5 text-[#CA8A04] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#713F12]">
                    Email Verification Required
                  </h4>
                  <p className="mt-1 text-[#854D0E] leading-relaxed">
                    Please verify your email address (
                    <strong>{unverifiedEmail}</strong>) before logging in. Check
                    your inbox for the link.
                  </p>
                </div>
              </div>

              {resendSuccess && (
                <div className="bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[#15803D] text-xs rounded-lg px-3 py-2 font-medium">
                  {resendSuccess}
                </div>
              )}

              {resendError && (
                <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.25)] text-[#DC2626] text-xs rounded-lg px-3 py-2">
                  {resendError}
                </div>
              )}

              <button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="w-full bg-[#854D0E] hover:bg-[#713F12] text-white font-semibold rounded-lg px-3 py-2 text-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Spinner size="sm" />
                    Sending email...
                  </span>
                ) : (
                  "Resend Verification Email"
                )}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="sign-in-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="sign-in-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7] focus:bg-white transition-all"
              />
            </div>
            <button
              id="sign-in-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#002FA7] hover:bg-[#002482] text-[#FFFFFF] font-bold rounded-xl px-4 py-2.5 text-sm transition-all active:scale-[0.98] shadow-sm shadow-[#002FA7]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-[#E5E7EB]" />
            <span className="flex-shrink mx-4 text-xs text-[#A3A3A3] uppercase tracking-wider font-medium">
              or
            </span>
            <div className="flex-grow border-t border-[#E5E7EB]" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#171717] font-semibold rounded-xl px-4 py-2.5 text-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Signing in...
              </span>
            ) : (
              <>
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-[#737373] mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-[#002FA7] hover:underline font-semibold"
            >
              Sign Up
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-[#A3A3A3] mt-6">
          Secured with Cloudflare R2 · End-to-end authenticated
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-[#002FA7] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
