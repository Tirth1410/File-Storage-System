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
  createdAt: Date | string;
}

const formatBytes = (bytes: number | string, decimals = 2) => {
  const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(b) || b === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

interface StorageStats {
  totalAllocated: string;
  totalUsed: string;
  totalAvailable: string;
  overallUtilization: number;
}
interface FileStats {
  totalUploadedFiles: number;
  totalActiveFiles: number;
  totalDeletedFiles: number;
  totalStorageConsumed: string;
  averageFileSize: string;
}
interface TransferStats {
  totalUploadRequests: number;
  successfulUploads: number;
  failedUploads: number;
  totalDownloadRequests: number;
  successfulDownloads: number;
  failedDownloads: number;
}
interface UserOverviewStats {
  totalRegistered: number;
  activeUsers: number;
  nearingLimit: number;
  exhaustedQuota: number;
}
interface DashboardStats {
  storage: StorageStats;
  files: FileStats;
  transfers: TransferStats;
  users: UserOverviewStats;
}

interface UserDetailStats {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastActivity: string;
  };
  storage: {
    quotaBytes: string;
    usedBytes: string;
    remainingBytes: string;
    utilization: number;
  };
  files: {
    totalUploadedFiles: number;
    totalActiveFiles: number;
    totalDeletedFiles: number;
  };
  activity: {
    uploadRequests: number;
    successfulUploads: number;
    failedUploads: number;
    downloadRequests: number;
    successfulDownloads: number;
    failedDownloads: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stats states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] =
    useState<UserDetailStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newQuotaGB, setNewQuotaGB] = useState<number>(2);
  const [savingQuota, setSavingQuota] = useState(false);

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

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
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
          fetchStats();
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
          await fetchStats();
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
          await fetchStats();
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

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setSelectedUserDetails(null);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUserDetails(data);
        const quotaBytes = parseFloat(data.storage.quotaBytes);
        setNewQuotaGB(
          parseFloat((quotaBytes / (1024 * 1024 * 1024)).toFixed(2)),
        );
      } else {
        alert("Failed to load user details");
      }
    } catch (err) {
      console.error("Error loading user details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveQuota = async () => {
    if (!selectedUser || newQuotaGB <= 0) return;
    setSavingQuota(true);
    try {
      const bytes = newQuotaGB * 1024 * 1024 * 1024;
      const res = await fetch(`/api/admin/users/${selectedUser.id}/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotaBytes: bytes }),
      });
      if (res.ok) {
        // Refresh details and overall stats
        const detailsRes = await fetch(`/api/admin/users/${selectedUser.id}`);
        if (detailsRes.ok) {
          const data = await detailsRes.json();
          setSelectedUserDetails(data);
        }
        await fetchStats();
        alert("User quota updated successfully!");
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update quota");
      }
    } catch (err) {
      console.error("Error updating quota:", err);
      alert("Error saving quota");
    } finally {
      setSavingQuota(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setSelectedUserDetails(null);
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
              Manage user profiles, accounts, quotas, and monitor platform
              observability metrics.
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

        {/* Observability Stats Grid */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-neutral-900/40 border border-neutral-800/80 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Storage Summary */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm space-y-3">
                <div className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>Storage Metrics</span>
                  <svg
                    className="w-4 h-4 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {formatBytes(stats.storage.totalUsed)}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Used of {formatBytes(stats.storage.totalAllocated)} (
                    {stats.storage.overallUtilization}%)
                  </p>
                </div>
                <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${stats.storage.overallUtilization}%` }}
                  ></div>
                </div>
              </div>

              {/* File Analytics */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm space-y-2">
                <div className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>File Statistics</span>
                  <svg
                    className="w-4 h-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {stats.files.totalActiveFiles}{" "}
                    <span className="text-xs font-normal text-neutral-500">
                      active
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Deleted: {stats.files.totalDeletedFiles} • Avg:{" "}
                    {formatBytes(stats.files.averageFileSize)}
                  </p>
                </div>
              </div>

              {/* Transfers Summary */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm space-y-2">
                <div className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>API Operations</span>
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight flex items-baseline gap-1.5">
                    <span>{stats.transfers.successfulUploads}</span>
                    <span className="text-xs font-normal text-neutral-500">
                      / {stats.transfers.totalUploadRequests} uploads
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Downloads: {stats.transfers.successfulDownloads} successful
                  </p>
                </div>
              </div>

              {/* User overview */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm space-y-2">
                <div className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>Platform Users</span>
                  <svg
                    className="w-4 h-4 text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {stats.users.totalRegistered}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Active (30d): {stats.users.activeUsers} • Full:{" "}
                    {stats.users.exhaustedQuota}
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* User List Panel */}
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Platform Users</h2>
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
                      className="hover:bg-neutral-900/30 transition-colors cursor-pointer group"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
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
                      <td
                        className="p-4 text-right space-x-2"
                        onClick={(e) => e.stopPropagation()} // Stop triggering user details modal
                      >
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Inspect User Account
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ID: {selectedUser.id}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-neutral-400 hover:text-neutral-100 transition-colors bg-neutral-950 border border-neutral-800 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-neutral-450 text-sm">
                    Fetching user analytics...
                  </span>
                </div>
              ) : (
                selectedUserDetails && (
                  <div className="space-y-6">
                    {/* section 1: User Info Grid */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        User Profile Info
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-sm">
                        <div>
                          <p className="text-neutral-500 text-xs">Name</p>
                          <p className="font-semibold text-neutral-250 mt-0.5">
                            {selectedUserDetails.user.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Email</p>
                          <p className="font-semibold text-neutral-250 mt-0.5 truncate">
                            {selectedUserDetails.user.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Joined On</p>
                          <p className="font-semibold text-neutral-250 mt-0.5">
                            {new Date(
                              selectedUserDetails.user.createdAt,
                            ).toLocaleDateString()}{" "}
                            {new Date(
                              selectedUserDetails.user.createdAt,
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">
                            Last Active
                          </p>
                          <p className="font-semibold text-neutral-250 mt-0.5">
                            {new Date(
                              selectedUserDetails.user.lastActivity,
                            ).toLocaleDateString()}{" "}
                            {new Date(
                              selectedUserDetails.user.lastActivity,
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Storage Status & Quota Adjuster */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        Storage & Quota Management
                      </h4>
                      <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-center border-b border-neutral-850 pb-4">
                          <div>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase">
                              Used Space
                            </p>
                            <p className="font-mono text-sm font-semibold text-neutral-200 mt-1">
                              {formatBytes(
                                selectedUserDetails.storage.usedBytes,
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase">
                              Remaining Space
                            </p>
                            <p className="font-mono text-sm font-semibold text-emerald-400 mt-1">
                              {formatBytes(
                                selectedUserDetails.storage.remainingBytes,
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-neutral-500">
                            <span>
                              Utilization:{" "}
                              {selectedUserDetails.storage.utilization}%
                            </span>
                            <span>
                              Quota:{" "}
                              {formatBytes(
                                selectedUserDetails.storage.quotaBytes,
                              )}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                              style={{
                                width: `${selectedUserDetails.storage.utilization}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Adjust Quota Input */}
                        <div className="pt-2 border-t border-neutral-850 flex flex-col sm:flex-row items-end gap-3 justify-between">
                          <div className="space-y-1.5 w-full sm:max-w-[250px]">
                            <label className="text-xs text-neutral-500 font-bold uppercase">
                              Set Custom Storage Quota (GB)
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={newQuotaGB}
                              onChange={(e) =>
                                setNewQuotaGB(parseFloat(e.target.value))
                              }
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 font-mono text-white"
                            />
                          </div>
                          <button
                            onClick={handleSaveQuota}
                            disabled={savingQuota || newQuotaGB <= 0}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all disabled:opacity-50 w-full sm:w-auto"
                          >
                            {savingQuota ? "Saving..." : "Apply New Quota"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: File Statistics */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        File Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-sm">
                        <div>
                          <p className="text-neutral-500 text-xs">
                            Total Files
                          </p>
                          <p className="text-xl font-bold text-white mt-1">
                            {selectedUserDetails.files.totalUploadedFiles}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">
                            Active Files
                          </p>
                          <p className="text-xl font-bold text-emerald-400 mt-1">
                            {selectedUserDetails.files.totalActiveFiles}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">
                            Deleted Files
                          </p>
                          <p className="text-xl font-bold text-neutral-500 mt-1">
                            {selectedUserDetails.files.totalDeletedFiles}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Transfer activity metrics */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        User Activity Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                          <p className="text-xs text-neutral-450 font-bold uppercase border-b border-neutral-850 pb-1.5">
                            Upload Attempts
                          </p>
                          <div className="space-y-1 text-xs font-mono text-neutral-400">
                            <div className="flex justify-between">
                              <span>Total Uploads initiated:</span>
                              <span className="text-white">
                                {selectedUserDetails.activity.uploadRequests}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Successful Uploads:</span>
                              <span className="text-emerald-400">
                                {selectedUserDetails.activity.successfulUploads}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Failed/Aborted Uploads:</span>
                              <span className="text-red-400">
                                {selectedUserDetails.activity.failedUploads}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                          <p className="text-xs text-neutral-450 font-bold uppercase border-b border-neutral-850 pb-1.5">
                            Download Attempts
                          </p>
                          <div className="space-y-1 text-xs font-mono text-neutral-400">
                            <div className="flex justify-between">
                              <span>Total Downloads:</span>
                              <span className="text-white">
                                {selectedUserDetails.activity.downloadRequests}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Successful Downloads:</span>
                              <span className="text-emerald-400">
                                {
                                  selectedUserDetails.activity
                                    .successfulDownloads
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Failed Downloads:</span>
                              <span className="text-red-400">
                                {selectedUserDetails.activity.failedDownloads}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="bg-neutral-900 border border-neutral-800 text-white text-xs font-medium rounded-lg px-4 py-2 hover:bg-neutral-800 transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
