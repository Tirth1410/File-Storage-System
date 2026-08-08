"use client";

import { useState } from "react";
import { Spinner } from "@/app/components/shared/Spinner";
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
  const [pendingId, setPendingId] = useState<string | null>(null);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setPendingId(key);
    try {
      await fn();
    } finally {
      setPendingId((cur) => (cur === key ? null : cur));
    }
  };

  const disabled =
    pendingId !== null || actionLoading !== null || user.id === currentAdminId;

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() =>
          runAction("role-" + user.id, async () => onRoleToggle(user))
        }
        disabled={disabled}
        className="text-xs font-semibold border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#525252] hover:bg-[#F5F5F5] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pendingId === "role-" + user.id ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" /> Updating...
          </span>
        ) : (
          "Toggle Role"
        )}
      </button>
      <button
        onClick={() =>
          runAction("ban-" + user.id, async () => onBanToggle(user))
        }
        disabled={disabled}
        className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          user.banned
            ? "border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.08)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.15)]"
            : "border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.08)] text-[#DC2626] hover:bg-[rgba(220,38,38,0.15)]"
        }`}
      >
        {pendingId === "ban-" + user.id ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" />
            {user.banned ? "Unblocking..." : "Blocking..."}
          </span>
        ) : user.banned ? (
          "Unban"
        ) : (
          "Ban"
        )}
      </button>
    </div>
  );
}
