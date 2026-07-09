"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/app/lib/auth-client";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending)
    return <p className="text-center mt-8 text-white">Loading...</p>;
  if (!session?.user)
    return <p className="text-center mt-8 text-white">Redirecting...</p>;

  const { user } = session;

  return (
    <main className="max-w-md h-screen flex items-center justify-center flex-col mx-auto p-6 space-y-4 text-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {user.name || "User"}!</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role || "user"}</p>
      <p
        className="text-sm text-neutral-400 font-mono select-all"
        title="Click or double-click to select all"
      >
        {user.id}
      </p>
      {user.role === "admin" && (
        <button
          onClick={() => router.push("/admin")}
          className="w-full bg-indigo-600 text-white font-medium rounded-md px-4 py-2 hover:bg-indigo-500 transition-colors"
        >
          Go to Admin Portal
        </button>
      )}
      <button
        onClick={() => signOut()}
        className="w-full bg-white text-black font-medium rounded-md px-4 py-2 hover:bg-gray-200"
      >
        Sign Out
      </button>
    </main>
  );
}
