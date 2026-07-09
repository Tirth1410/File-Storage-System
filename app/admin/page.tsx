"use client";

import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/app/lib/auth-client";
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 100,
        },
      });
      if (res.error) {
        setErrorMessage(res.error.message || "Failed to load users");
      } else if (res.data) {
        setUsers(res.data.users as User[]);
      }
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || "An unexpected error occurred");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        router.push("/sign-in");
      } else if (session.user.role !== "admin") {
        router.push("/dashboard");
      } else {
        Promise.resolve().then(() => {
          fetchUsers();
        });
      }
    }
  }, [isPending, session, router]);

  const handleBanToggle = async (user: User) => {
    setActionLoading(user.id);
    setErrorMessage(null);
    try {
      if (user.banned) {
        const res = await authClient.admin.unbanUser({
          userId: user.id,
        });
        if (res.error) {
          setErrorMessage(res.error.message || "Failed to unban user");
        } else {
          await fetchUsers();
        }
      } else {
        const res = await authClient.admin.banUser({
          userId: user.id,
          banReason: "Administrator Action",
        });
        if (res.error) {
          setErrorMessage(res.error.message || "Failed to ban user");
        } else {
          await fetchUsers();
        }
      }
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleToggle = async (user: User) => {
    setActionLoading(user.id);
    setErrorMessage(null);
    const nextRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await authClient.admin.setRole({
        userId: user.id,
        role: nextRole,
      });
      if (res.error) {
        setErrorMessage(res.error.message || "Failed to update role");
      } else {
        await fetchUsers();
      }
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <p className="text-xl font-medium animate-pulse">
          Loading auth session...
        </p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <p className="text-xl font-medium animate-pulse">Redirecting...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              Admin Control Panel
            </h1>
            <p className="text-neutral-400 mt-1">
              Manage user profiles, accounts, and application roles.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-neutral-900 border border-neutral-800 text-white font-medium rounded-md px-4 py-2 hover:bg-neutral-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* User List Panel */}
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">All Users</h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold px-2.5 py-1 rounded-full">
              {users.length} registered
            </span>
          </div>

          {loadingUsers ? (
            <div className="p-12 text-center text-neutral-400">
              <p className="animate-pulse">Fetching users from directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <p>No users found in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-sm font-semibold">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-900/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {user.name || "N/A"}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono mt-0.5">
                          {user.id}
                        </div>
                      </td>
                      <td className="p-4 text-neutral-300">{user.email}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            user.role === "admin"
                              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                              : "bg-neutral-500/10 text-neutral-400 border border-neutral-800"
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.banned ? (
                          <span
                            className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                            title={user.banReason || undefined}
                          >
                            Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleRoleToggle(user)}
                          disabled={
                            actionLoading !== null ||
                            user.id === session.user.id
                          }
                          className="text-xs font-semibold border border-neutral-700 rounded-md px-3 py-1.5 hover:bg-neutral-800 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Toggle Role
                        </button>
                        <button
                          onClick={() => handleBanToggle(user)}
                          disabled={
                            actionLoading !== null ||
                            user.id === session.user.id
                          }
                          className={`text-xs font-semibold border rounded-md px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.banned
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {user.banned ? "Unban" : "Ban"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
