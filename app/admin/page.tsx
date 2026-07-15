"use client";

import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/app/lib/auth-client";
import { useEffect, useState } from "react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { StatCard } from "@/app/components/shared/StatCard";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { StorageBar } from "@/app/components/shared/StorageBar";
import { formatBytes, formatDateTime } from "@/app/lib/utils";

/* ─── Types ─── */

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: Date | string;
}

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

/* ─── Icon helpers ─── */
const StorageIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
    />
  </svg>
);
const FileIcon = () => (
  <svg
    className="w-5 h-5"
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
);
const TransferIcon = () => (
  <svg
    className="w-5 h-5"
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
);
const UsersIcon = () => (
  <svg
    className="w-5 h-5"
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
);

/* ─── Component ─── */

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] =
    useState<UserDetailStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newQuotaGB, setNewQuotaGB] = useState<number>(2);
  const [savingQuota, setSavingQuota] = useState(false);

  /* ─── fetching ─── */
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (res.error) {
        setErrorMessage(res.error.message || "Failed to load users");
      } else if (res.data) {
        setUsers(res.data.users as User[]);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || "Unexpected error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) return void router.push("/sign-in");
      if (session.user.role !== "admin") return void router.push("/dashboard");
      Promise.resolve().then(() => {
        fetchUsers();
        fetchStats();
      });
    }
  }, [isPending, session, router]);

  /* ─── actions ─── */
  const handleBanToggle = async (user: User) => {
    setActionLoading(user.id);
    setErrorMessage(null);
    try {
      const res = user.banned
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({
            userId: user.id,
            banReason: "Administrator Action",
          });
      if (res.error) {
        setErrorMessage(res.error.message || "Action failed");
      } else {
        await fetchUsers();
        await fetchStats();
      }
    } catch (err) {
      setErrorMessage((err as Error).message || "Action failed");
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
      setErrorMessage((err as Error).message || "Action failed");
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
      }
    } catch (err) {
      console.error("User detail error:", err);
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
        const detailsRes = await fetch(`/api/admin/users/${selectedUser.id}`);
        if (detailsRes.ok) setSelectedUserDetails(await detailsRes.json());
        await fetchStats();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update quota");
      }
    } catch {
      alert("Error saving quota");
    } finally {
      setSavingQuota(false);
    }
  };

  /* ─── guards ─── */
  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user || session.user.role !== "admin")
    return <LoadingScreen message="Redirecting..." />;

  return (
    <>
      <AppShell
        userName={session.user.name || undefined}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              Admin Portal
            </h1>
            <p className="text-sm text-[#737373] mt-0.5">
              Monitor platform metrics and manage user accounts
            </p>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="bg-[rgba(220,38,38,0.07)] text-[#DC2626] border border-[rgba(220,38,38,0.2)] px-4 py-3 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          {/* Stats grid */}
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-white border border-[#E5E7EB] rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  label="Storage"
                  value={formatBytes(stats.storage.totalUsed)}
                  sub={`of ${formatBytes(stats.storage.totalAllocated)} (${stats.storage.overallUtilization}%)`}
                  icon={<StorageIcon />}
                >
                  <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
                      style={{ width: `${stats.storage.overallUtilization}%` }}
                    />
                  </div>
                </StatCard>

                <StatCard
                  label="File Statistics"
                  value={stats.files.totalActiveFiles}
                  sub={`Deleted: ${stats.files.totalDeletedFiles} · Avg: ${formatBytes(stats.files.averageFileSize)}`}
                  icon={<FileIcon />}
                />

                <StatCard
                  label="API Operations"
                  value={`${stats.transfers.successfulUploads}/${stats.transfers.totalUploadRequests}`}
                  sub={`Downloads: ${stats.transfers.successfulDownloads} successful`}
                  icon={<TransferIcon />}
                />

                <StatCard
                  label="Platform Users"
                  value={stats.users.totalRegistered}
                  sub={`Active (30d): ${stats.users.activeUsers} · Full: ${stats.users.exhaustedQuota}`}
                  icon={<UsersIcon />}
                />
              </div>
            )
          )}

          {/* User table */}
          <SectionCard
            title="Platform Users"
            noPadding
            titleRight={
              <span className="text-xs bg-[rgba(0,47,167,0.08)] text-[#002FA7] border border-[rgba(0,47,167,0.2)] font-semibold px-2.5 py-1 rounded-full">
                {users.length} registered
              </span>
            }
          >
            {loadingUsers ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[#737373] mt-3">Fetching users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-[#737373]">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-xs font-bold uppercase tracking-wide text-[#737373]">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                        onClick={() => handleUserClick(user)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-[#171717] group-hover:text-[#002FA7] transition-colors">
                            {user.name || "N/A"}
                          </div>
                          <div className="text-[10px] text-[#A3A3A3] font-mono mt-0.5 truncate max-w-[160px]">
                            {user.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#525252]">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            variant={user.role === "admin" ? "admin" : "user"}
                            label={user.role || "user"}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            variant={user.banned ? "banned" : "active"}
                            label={user.banned ? "Banned" : "Active"}
                          />
                        </td>
                        <td
                          className="px-6 py-4 text-right space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={
                              actionLoading !== null ||
                              user.id === session.user.id
                            }
                            className="text-xs font-semibold border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#525252] hover:bg-[#F5F5F5] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Toggle Role
                          </button>
                          <button
                            onClick={() => handleBanToggle(user)}
                            disabled={
                              actionLoading !== null ||
                              user.id === session.user.id
                            }
                            className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                              user.banned
                                ? "border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.08)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.15)]"
                                : "border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.08)] text-[#DC2626] hover:bg-[rgba(220,38,38,0.15)]"
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
          </SectionCard>
        </div>
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  {selectedUser.name || "User"} Account
                </h3>
                <p className="text-xs text-[#737373] font-mono mt-0.5">
                  {selectedUser.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserDetails(null);
                }}
                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#737373]">Loading analytics...</p>
                </div>
              ) : selectedUserDetails ? (
                <div className="space-y-6">
                  {/* Profile Info */}
                  <SectionCard title="Profile Info">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {[
                        {
                          label: "Name",
                          value: selectedUserDetails.user.name || "N/A",
                        },
                        {
                          label: "Email",
                          value: selectedUserDetails.user.email,
                        },
                        {
                          label: "Joined",
                          value: formatDateTime(
                            selectedUserDetails.user.createdAt,
                          ),
                        },
                        {
                          label: "Last Active",
                          value: formatDateTime(
                            selectedUserDetails.user.lastActivity,
                          ),
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-[#737373] font-medium">
                            {label}
                          </p>
                          <p className="font-semibold text-[#171717] mt-0.5 truncate">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Storage & Quota */}
                  <SectionCard title="Storage & Quota">
                    <div className="space-y-4">
                      <StorageBar
                        usedBytes={selectedUserDetails.storage.usedBytes}
                        quotaBytes={selectedUserDetails.storage.quotaBytes}
                        utilization={selectedUserDetails.storage.utilization}
                        variant="full"
                      />
                      <div className="border-t border-[#E5E7EB] pt-4">
                        <p className="text-xs font-bold text-[#171717] uppercase tracking-wide mb-3">
                          Adjust Quota
                        </p>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-[#737373] mb-1.5 font-medium">
                              New Quota (GB)
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={newQuotaGB}
                              onChange={(e) =>
                                setNewQuotaGB(parseFloat(e.target.value))
                              }
                              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7] font-mono text-[#171717]"
                            />
                          </div>
                          <button
                            onClick={handleSaveQuota}
                            disabled={savingQuota || newQuotaGB <= 0}
                            className="bg-[#002FA7] hover:bg-[#002482] text-white font-bold text-sm py-2 px-4 rounded-lg transition-all disabled:opacity-50 shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                          >
                            {savingQuota ? "Saving..." : "Apply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* File Stats */}
                  <SectionCard title="File Statistics">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        {
                          label: "Total",
                          value: selectedUserDetails.files.totalUploadedFiles,
                          color: "text-[#171717]",
                        },
                        {
                          label: "Active",
                          value: selectedUserDetails.files.totalActiveFiles,
                          color: "text-[#16A34A]",
                        },
                        {
                          label: "Deleted",
                          value: selectedUserDetails.files.totalDeletedFiles,
                          color: "text-[#A3A3A3]",
                        },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-xs text-[#737373]">{label}</p>
                          <p className={`text-2xl font-bold mt-1 ${color}`}>
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Activity */}
                  <SectionCard title="Activity Summary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          label: "Upload Activity",
                          rows: [
                            {
                              name: "Initiated",
                              val: selectedUserDetails.activity.uploadRequests,
                              color: "text-[#171717]",
                            },
                            {
                              name: "Successful",
                              val: selectedUserDetails.activity
                                .successfulUploads,
                              color: "text-[#16A34A]",
                            },
                            {
                              name: "Failed",
                              val: selectedUserDetails.activity.failedUploads,
                              color: "text-[#DC2626]",
                            },
                          ],
                        },
                        {
                          label: "Download Activity",
                          rows: [
                            {
                              name: "Total",
                              val: selectedUserDetails.activity
                                .downloadRequests,
                              color: "text-[#171717]",
                            },
                            {
                              name: "Successful",
                              val: selectedUserDetails.activity
                                .successfulDownloads,
                              color: "text-[#16A34A]",
                            },
                            {
                              name: "Failed",
                              val: selectedUserDetails.activity.failedDownloads,
                              color: "text-[#DC2626]",
                            },
                          ],
                        },
                      ].map(({ label, rows }) => (
                        <div
                          key={label}
                          className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E7EB] space-y-2"
                        >
                          <p className="text-xs font-bold text-[#171717] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
                            {label}
                          </p>
                          {rows.map(({ name, val, color }) => (
                            <div
                              key={name}
                              className="flex justify-between text-xs font-mono"
                            >
                              <span className="text-[#737373]">{name}</span>
                              <span className={`font-semibold ${color}`}>
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserDetails(null);
                }}
                className="text-sm font-semibold border border-[#E5E7EB] rounded-xl px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
