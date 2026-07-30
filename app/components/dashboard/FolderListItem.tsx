"use client";

import { memo, useState, useRef, useEffect } from "react";
import {
  Folder,
  Pencil,
  Trash2,
  ArrowRightToLine,
  MoreVertical,
} from "lucide-react";
import { formatDate } from "@/app/lib/utils";

interface FolderData {
  id: string;
  name: string;
  ownerUserId: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

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

/* ─── Dropdown Menu Components ─── */

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 rounded-lg transition-all cursor-pointer bg-white border border-[#E5E7EB] text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F5]"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
        danger
          ? "text-[#DC2626] hover:bg-[rgba(220,38,38,0.07)]"
          : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
