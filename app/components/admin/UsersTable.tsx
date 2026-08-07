"use client";

import { SectionCard } from "@/app/components/shared/SectionCard";
import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { UsersTableSkeleton } from "./UsersTableSkeleton";
import { formatBytes } from "@/app/lib/utils";
import { UserActionButtons } from "./UserActionButtons";
import { Users } from "lucide-react";
import type { User } from "./types";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  actionLoading: string | null;
  currentAdminId: string;
  onUserClick: (user: User) => void;
  onRoleToggle: (user: User) => void;
  onBanToggle: (user: User) => void;
}

export function UsersTable({
  users,
  loading,
  actionLoading,
  currentAdminId,
  onUserClick,
  onRoleToggle,
  onBanToggle,
}: UsersTableProps) {
  return (
    <SectionCard
      title="Platform Users"
      noPadding
      titleRight={
        <span className="text-xs bg-[rgba(0,47,167,0.08)] text-[#002FA7] border border-[rgba(0,47,167,0.2)] font-semibold px-2.5 py-1 rounded-full">
          {users.length} registered
        </span>
      }
    >
      {loading ? (
        <UsersTableSkeleton />
      ) : users.length === 0 ? (
        <EmptyState
          className="py-12"
          icon={<Users className="w-7 h-7 text-[#A3A3A3]" />}
          title="No users found"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-xs font-bold uppercase tracking-wide text-[#737373]">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Quota</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {users.map((user) => {
                const pct = Math.min(
                  100,
                  Math.max(0, user.storage?.utilization ?? 0),
                );
                const barColor =
                  pct >= 90
                    ? "bg-red-500"
                    : pct >= 70
                      ? "bg-amber-500"
                      : "bg-[#002FA7]";

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                    onClick={() => onUserClick(user)}
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
                    <td className="px-6 py-4">
                      <div className="flex items-baseline gap-1 text-sm">
                        <span className="font-semibold text-[#171717]">
                          {formatBytes(user.storage?.usedBytes ?? 0)}
                        </span>
                        <span className="text-[#A3A3A3]">
                          / {formatBytes(user.storage?.quotaBytes ?? 0)}
                        </span>
                      </div>
                      <div className="w-28 h-1.5 bg-[#E5E7EB] rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserActionButtons
                        user={user}
                        actionLoading={actionLoading}
                        currentAdminId={currentAdminId}
                        onRoleToggle={onRoleToggle}
                        onBanToggle={onBanToggle}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
