"use client";

import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { ArrowRight, Users } from "lucide-react";
import { roleToBadgeVariant } from "./types";
import type { Group } from "./types";

interface GroupCardProps {
  group: Group;
  onOpen: () => void;
}

export function GroupCard({ group, onOpen }: GroupCardProps) {
  const initials = group.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <button
      onClick={onOpen}
      className="text-left bg-white border border-[#E5E7EB] hover:border-[#002FA7]/40 hover:shadow-md rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between min-h-[190px] cursor-pointer group"
    >
      <div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[rgba(0,47,167,0.1)] text-[#002FA7] rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
              {initials}
            </div>
            <h3 className="text-base font-bold text-[#171717] truncate min-w-0">
              {group.name}
            </h3>
          </div>
          <StatusBadge
            variant={roleToBadgeVariant(group.currentUserRole)}
            label={group.currentUserRole}
          />
        </div>
        <p className="text-xs text-[#737373] mt-3 line-clamp-2">
          {group.description || "No description provided."}
        </p>
      </div>
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#F5F5F5]">
        <div className="flex items-center gap-3 text-xs text-[#A3A3A3]">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>Owned by {group.ownerName || group.ownerEmail}</span>
        </div>
        <span className="text-xs font-bold text-[#002FA7] inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
          Open
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}
