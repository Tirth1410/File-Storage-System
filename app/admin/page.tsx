"use client";

import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/app/lib/auth-client";
import { useEffect, useState, startTransition } from "react";
import { toast } from "sonner";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { ErrorBanner } from "@/app/components/shared/ErrorBanner";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { AdminStatsGrid } from "@/app/components/admin/AdminStatsGrid";
import { UsersTable } from "@/app/components/admin/UsersTable";
import { UserDetailModal } from "@/app/components/admin/UserDetailModal";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";

import type {
  User,
  DashboardStats,
  UserDetailStats,
} from "@/app/components/admin/types";

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] =
    useState<UserDetailStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newQuotaGB, setNewQuotaGB] = useState<number>(0);
  const [newQuotaMB, setNewQuotaMB] = useState<number>(200);
  const [savingQuota, setSavingQuota] = useState(false);

  /* ─── fetching ─── */
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users as User[]);
      } else {
        setErrorMessage("Failed to load users");
      }
    } catch (err) {
      setErrorMessage((err as Error).message || "Unexpected error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
      else setStatsError("Failed to load platform statistics");
    } catch (err) {
      console.error("Stats fetch error:", err);
      setStatsError("Failed to load platform statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isPending && session?.user) {
      if (session.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      startTransition(() => {
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
        await Promise.all([fetchUsers(), fetchStats()]);
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
        const totalMB = Math.round(quotaBytes / (1024 * 1024));
        setNewQuotaGB(Math.floor(totalMB / 1024));
        setNewQuotaMB(totalMB % 1024);
      }
    } catch (err) {
      console.error("User detail error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveQuota = async () => {
    if (!selectedUser || (newQuotaGB <= 0 && newQuotaMB <= 0)) return;
    setSavingQuota(true);
    try {
      const bytes = (newQuotaGB * 1024 + newQuotaMB) * 1024 * 1024;
      const res = await fetch(`/api/admin/users/${selectedUser.id}/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotaBytes: bytes }),
      });
      if (res.ok) {
        const [detailsRes] = await Promise.all([
          fetch(`/api/admin/users/${selectedUser.id}`),
          fetchStats(),
          fetchUsers(),
        ]);
        if (detailsRes.ok) setSelectedUserDetails(await detailsRes.json());
        toast.success("Storage quota updated successfully!");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to update quota");
      }
    } catch {
      toast.error("Error saving quota");
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
      <AppShell userName={session.user.name || undefined} isAdmin />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:px-10 md:py-8 md:space-y-8">
          <PageHeader
            title="Admin Portal"
            subtitle="Monitor platform metrics and manage user accounts"
          />

          {errorMessage && (
            <ErrorBanner message={errorMessage} variant="banner" />
          )}

          {statsError && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[rgba(220,38,38,0.07)] text-[#DC2626] border border-[rgba(220,38,38,0.2)] px-4 py-3 rounded-xl text-sm">
              <span>{statsError}</span>
              <button
                onClick={() => fetchStats()}
                className="shrink-0 self-start text-xs font-semibold bg-white border border-[rgba(220,38,38,0.3)] rounded-lg px-3 py-1.5 text-[#DC2626] hover:bg-[rgba(220,38,38,0.05)] transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <AdminStatsGrid loading={loadingStats} stats={stats} />

          <UsersTable
            users={users}
            loading={loadingUsers}
            actionLoading={actionLoading}
            currentAdminId={session.user.id}
            onUserClick={handleUserClick}
            onRoleToggle={handleRoleToggle}
            onBanToggle={handleBanToggle}
          />
        </div>
      </main>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          details={selectedUserDetails}
          loadingDetails={loadingDetails}
          newQuotaGB={newQuotaGB}
          newQuotaMB={newQuotaMB}
          savingQuota={savingQuota}
          onQuotaGbChange={setNewQuotaGB}
          onQuotaMbChange={setNewQuotaMB}
          onSaveQuota={handleSaveQuota}
          onClose={() => {
            setSelectedUser(null);
            setSelectedUserDetails(null);
          }}
        />
      )}
    </>
  );
}
