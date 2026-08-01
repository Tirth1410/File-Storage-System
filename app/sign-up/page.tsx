"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp, signIn } from "@/app/lib/auth-client";
import { Logo } from "@/app/components/shared/Logo";
import { Mail } from "lucide-react";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification sent state
  const [verificationSent, setVerificationSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  // Resend verification state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    const res = await signUp.email({
      name,
      email,
      password,
      callbackURL: "/dashboard?verified=true",
    });

    setLoading(false);

    if (res.error) {
      setError(res.error.message || "Something went wrong.");
    } else {
      setSubmittedEmail(email);
      setVerificationSent(true);
    }
  }

  const handleResendEmail = async () => {
    if (!submittedEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendError(data.error || "Failed to resend verification email.");
      } else {
        setResendMessage(
          data.message || "Verification email has been resent to your address.",
        );
      }
    } catch {
      setResendError("An unexpected error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-3" />
          <p className="text-sm text-[#737373]">
            Create your secure file storage account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
          {verificationSent ? (
            /* Verification Sent View */
            <div className="text-center space-y-5">
              <div className="w-14 h-14 bg-[rgba(0,47,167,0.08)] border border-[rgba(0,47,167,0.2)] rounded-2xl flex items-center justify-center mx-auto text-[#002FA7]">
                <Mail className="w-7 h-7" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-[#171717]">
                  Check your email
                </h1>
                <p className="text-xs text-[#737373] mt-2 leading-relaxed">
                  We&apos;ve sent a secure verification link to:
                  <br />
                  <span className="font-semibold text-[#171717] break-all">
                    {submittedEmail}
                  </span>
                </p>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-xs text-[#525252] text-left leading-relaxed space-y-1">
                <p className="font-semibold text-[#171717]">What to do next:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[#737373]">
                  <li>Open your email inbox.</li>
                  <li>Click the verification link in the email.</li>
                  <li>
                    You will be logged in and redirected to your dashboard
                    automatically.
                  </li>
                </ol>
              </div>

              {resendMessage && (
                <div className="bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] text-[#15803D] text-xs rounded-xl px-4 py-2.5">
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div className="bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-xs rounded-xl px-4 py-2.5">
                  {resendError}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full bg-white hover:bg-[#F5F5F5] border border-[#E5E7EB] text-[#171717] font-semibold rounded-xl px-4 py-2.5 text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {resendLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#002FA7]/40 border-t-[#002FA7] rounded-full animate-spin" />
                      Sending resend request...
                    </span>
                  ) : (
                    "Resend Verification Email"
                  )}
                </button>

                <Link
                  href="/sign-in"
                  className="block w-full text-center bg-[#002FA7] hover:bg-[#002482] text-white font-bold rounded-xl px-4 py-2.5 text-xs transition-all cursor-pointer shadow-sm shadow-[#002FA7]/20 no-underline"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Sign Up Form View */
            <>
              <h1 className="text-xl font-bold text-[#171717] mb-6">
                Get started
              </h1>

              {error && (
                <div className="mb-5 bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="sign-up-name"
                    name="name"
                    placeholder="Jane Doe"
                    required
                    className="w-full rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="sign-up-email"
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
                    id="sign-up-password"
                    name="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="sign-up-confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7] focus:bg-white transition-all"
                  />
                </div>
                <button
                  id="sign-up-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-bold rounded-xl px-4 py-2.5 text-sm transition-all active:scale-[0.98] shadow-sm shadow-[#002FA7]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
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
                className="w-full flex items-center justify-center gap-2.5 border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#171717] font-semibold rounded-xl px-4 py-2.5 text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
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
              </button>

              {/* Footer */}
              <p className="text-center text-xs text-[#737373] mt-6">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-[#002FA7] hover:underline font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-[#A3A3A3] mt-6">
          Secured with Cloudflare R2 · End-to-end authenticated
        </p>
      </div>
    </main>
  );
}
