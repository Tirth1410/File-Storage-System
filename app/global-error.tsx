"use client";

import { TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAFA]">
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[rgba(220,38,38,0.08)] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <TriangleAlert className="w-8 h-8 text-[#DC2626]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#737373] mt-2">
              A critical error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="mt-3 text-xs font-mono text-[#A3A3A3]">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={reset}
                className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
