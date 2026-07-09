"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/app/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const res = await signUp.email({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (res.error) {
      setError(res.error.message || "Something went wrong.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="max-w-md h-screen flex items-center justify-center flex-col mx-auto p-6 space-y-6 text-white">
      <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-center mb-2 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Sign Up
        </h1>
        <p className="text-sm text-neutral-400 text-center mb-6">
          Create your secure file storage account
        </p>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg p-3 mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Full Name
            </label>
            <input
              name="name"
              placeholder="John Doe"
              required
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-700 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-700 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-700 transition"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-neutral-200 active:scale-[0.98] transition cursor-pointer"
          >
            Create Account
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-neutral-800"></div>
          <span className="flex-shrink mx-4 text-neutral-500 text-xs uppercase tracking-wider">
            or
          </span>
          <div className="flex-grow border-t border-neutral-800"></div>
        </div>

        <button
          onClick={async () => {
            setError(null);
            await signIn.social({
              provider: "google",
              callbackURL: "/dashboard",
            });
          }}
          className="w-full flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-medium rounded-lg px-4 py-2.5 active:scale-[0.98] transition cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
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

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="text-white hover:underline font-semibold"
          >
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
