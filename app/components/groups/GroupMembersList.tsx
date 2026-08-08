"use client";

import { SectionCard } from "@/app/components/shared/SectionCard";
import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { Users } from "lucide-react";
import { roleToBadgeVariant } from "./types";
import type { GroupMember, GroupRole, PendingInvite } from "./types";

interface GroupMembersListProps {
  members: GroupMember[];
  currentUserId: string;
  currentUserRole: GroupRole;
  pendingInvites: PendingInvite[];
  onChangeRole: (memberUserId: string, role: "ADMIN" | "MEMBER") => void;
  onRemove: (memberUserId: string) => void;
  onResendInvite: (inviteId: string) => void;
  onCancelInvite: (inviteId: string) => void;
}

export function GroupMembersList({
  members,
  currentUserId,
  currentUserRole,
  pendingInvites,
  onChangeRole,
  onRemove,
  onResendInvite,
  onCancelInvite,
}: GroupMembersListProps) {
  return (
    <SectionCard noPadding title="Group Members">
      {!members || members.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={<Users className="w-7 h-7 text-[#A3A3A3]" />}
          title="No members yet"
          description="Invite collaborators to start sharing files with this group."
        />
      ) : (
        members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isOwner = m.role === "OWNER";
          const canManage =
            (currentUserRole === "OWNER" || currentUserRole === "ADMIN") &&
            !isOwner &&
            !isSelf;

          return (
            <div
              key={m.id}
              className="px-4 py-4 flex flex-col items-stretch justify-between gap-3 hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:px-6 sm:gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-[rgba(0,47,167,0.1)] text-[#002FA7] rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {m.user.name?.[0] || m.user.email[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#171717]">
                    {m.user.name || "Unknown"} {isSelf && "(You)"}
                  </p>
                  <p className="text-xs text-[#737373] mt-0.5 truncate">
                    {m.user.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <StatusBadge
                  variant={roleToBadgeVariant(m.role)}
                  label={m.role}
                />
                {canManage && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {currentUserRole === "OWNER" && (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          onChangeRole(
                            m.userId,
                            e.target.value as "ADMIN" | "MEMBER",
                          )
                        }
                        className="bg-white border border-[#E5E7EB] rounded-lg p-1 text-xs text-[#171717] focus:outline-none"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    )}
                    <button
                      onClick={() => onRemove(m.userId)}
                      className="bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {pendingInvites.length > 0 && (
        <div className="border-t border-[#E5E7EB]">
          <div className="px-4 py-3 sm:px-6">
            <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
              Pending Invites ({pendingInvites.length})
            </h4>
          </div>
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="px-4 py-3 flex flex-col items-stretch justify-between gap-3 border-t border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:px-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#171717] truncate">
                  {inv.email}
                </p>
                <p className="text-xs text-[#737373] mt-0.5">
                  Pending
                  {inv.expiresAt &&
                    ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onResendInvite(inv.id)}
                  className="text-xs font-semibold text-[#002FA7] border border-[rgba(0,47,167,0.15)] bg-[rgba(0,47,167,0.03)] px-2.5 py-1.5 rounded-lg hover:bg-[rgba(0,47,167,0.08)] transition-all cursor-pointer"
                >
                  Resend
                </button>
                <button
                  onClick={() => onCancelInvite(inv.id)}
                  className="text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
