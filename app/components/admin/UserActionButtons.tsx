"use client";

import type { User } from "./types";

interface UserActionButtonsProps {
  user: User;
  actionLoading: string | null;
  currentAdminId: string;
  onRoleToggle: (user: User) => void;
  onBanToggle: (user: User) => void;
}

export function UserActionButtons({
  user,
  actionLoading,
  currentAdminId,
  onRoleToggle,
  onBanToggle,
}: UserActionButtonsProps) {
  const disabled = actionLoading !== null || user.id === currentAdminId;

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => onRoleToggle(user)}
        disabled={disabled}
        className="text-xs font-semibold border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#525252] hover:bg-[#F5F5F5] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Toggle Role
      </button>
      <button
        onClick={() => onBanToggle(user)}
        disabled={disabled}
        className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          user.banned
            ? "border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.08)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.15)]"
            : "border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.08)] text-[#DC2626] hover:bg-[rgba(220,38,38,0.15)]"
        }`}
      >
        {user.banned ? "Unban" : "Ban"}
      </button>
    </div>
  );
}
