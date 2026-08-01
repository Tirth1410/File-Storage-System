"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionLike {
  user?: unknown;
}

/**
 * Redirects to the sign-in page whenever the session is confirmed absent.
 * Used on protected pages to guarantee navigation after logout, session
 * expiry, or an unauthorized response — even if the sign-out redirect
 * callback is interrupted by a concurrent session-state update.
 */
export function useAuthRedirect(
  session: SessionLike | null,
  isPending: boolean,
) {
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);
}
