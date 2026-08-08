"use client";

import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { Spinner } from "@/app/components/shared/Spinner";
import { useAsyncAction } from "@/app/components/shared/use-async-action";
import { roleToBadgeVariant } from "./types";
import type { Group } from "./types";

interface GroupDetailHeaderProps {
  group: Group;
  currentUserId: string;
  onSettings: () => void;
  onLeave: () => void;
}

export function GroupDetailHeader({
  group,
  currentUserId,
  onSettings,
  onLeave,
}: GroupDetailHeaderProps) {
  const { pending, execute } = useAsyncAction();
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] break-words">
            {group.name}
          </h1>
          <StatusBadge
            variant={roleToBadgeVariant(group.currentUserRole)}
            label={group.currentUserRole}
          />
        </div>
        <p className="text-sm text-[#737373] mt-1">
          {group.description || "No description provided."}
        </p>
        <p className="text-xs text-[#A3A3A3] mt-2">
          Owned by {group.ownerName || group.ownerEmail}{" "}
          {group.ownerUserId === currentUserId && "(You)"} · Created{" "}
          {new Date(group.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.currentUserRole === "OWNER" && (
          <button
            onClick={onSettings}
            className="bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer"
          >
            Group Settings
          </button>
        )}
        {group.currentUserRole !== "OWNER" && (
          <button
            onClick={() => execute(async () => onLeave())}
            disabled={pending}
            className="bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Leaving...
              </span>
            ) : (
              "Leave Group"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
