"use client";

import { memo } from "react";
import { Folder, Pencil, Trash2, ArrowRightToLine } from "lucide-react";
import { formatDate } from "@/app/lib/utils";
import {
  DropdownMenu,
  DropdownItem,
} from "@/app/components/shared/DropdownMenu";
import type { FolderData } from "./types";

interface FolderListItemProps {
  folder: FolderData;
  isSelected?: boolean;
  onToggleSelect?: (folderId: string) => void;
  onNavigate: (folderId: string) => void;
  onRename?: (folder: FolderData) => void;
  onDelete?: (folderId: string) => void;
  onMove?: (folder: FolderData) => void;
}

export const FolderListItem = memo(function FolderListItem({
  folder,
  isSelected = false,
  onToggleSelect,
  onNavigate,
  onRename,
  onDelete,
  onMove,
}: FolderListItemProps) {
  return (
    <div
      className={`flex flex-col items-stretch justify-between py-3.5 px-3 rounded-xl transition-all border gap-3 sm:flex-row sm:items-center sm:px-4 sm:gap-4 ${
        isSelected
          ? "bg-[rgba(0,47,167,0.04)] border-[rgba(0,47,167,0.2)] shadow-sm"
          : "hover:bg-[#F5F5F5] border-transparent hover:border-[#E5E7EB]"
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(folder.id)}
            className="w-4 h-4 rounded text-[#002FA7] border-[#D1D5DB] focus:ring-[#002FA7] cursor-pointer shrink-0 accent-[#002FA7]"
          />
        )}
        <button
          onClick={() => onNavigate(folder.id)}
          className="w-10 h-10 bg-[rgba(0,47,167,0.08)] border border-[rgba(0,47,167,0.2)] rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-[rgba(0,47,167,0.12)] transition-all"
        >
          <Folder className="w-5 h-5 text-[#002FA7]" />
        </button>
        <button
          onClick={() => onNavigate(folder.id)}
          className="overflow-hidden min-w-0 flex-1 text-left cursor-pointer"
        >
          <p
            className="text-sm font-semibold text-[#171717] truncate"
            title={folder.name}
          >
            {folder.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737373] font-mono mt-0.5">
            <span>Folder</span>
            <span>·</span>
            <span>{formatDate(folder.updatedAt)}</span>
          </div>
        </button>
      </div>

      {/* 3-dot Actions Menu */}
      <DropdownMenu>
        {onMove && (
          <DropdownItem
            icon={<ArrowRightToLine className="w-4 h-4" />}
            label="Move"
            onClick={() => onMove(folder)}
          />
        )}
        {onRename && (
          <DropdownItem
            icon={<Pencil className="w-4 h-4" />}
            label="Rename"
            onClick={() => onRename(folder)}
          />
        )}
        {onDelete && (
          <DropdownItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={() => onDelete(folder.id)}
            danger
          />
        )}
      </DropdownMenu>
    </div>
  );
});
