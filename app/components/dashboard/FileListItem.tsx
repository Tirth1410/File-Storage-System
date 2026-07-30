"use client";

import { memo, useState, useRef, useEffect } from "react";
import { formatBytes, formatDate } from "@/app/lib/utils";
import { FileIcon } from "./FileIcon";
import {
  Eye,
  Download,
  Share2,
  ArrowRightToLine,
  Trash2,
  MoreVertical,
} from "lucide-react";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
}

interface FileListItemProps {
  file: UploadedFile;
  currentUserId?: string;
  isSelected?: boolean;
  onToggleSelect?: (fileId: string) => void;
  onPreview: (file: UploadedFile) => void;
  onDownload: (file: UploadedFile) => void;
  onShare: (file: UploadedFile) => void;
  onDelete: (fileId: string) => void;
  onMove?: (file: UploadedFile) => void;
  showDeleteAction?: boolean;
  deleteTitle?: string;
}

export const FileListItem = memo(function FileListItem({
  file,
  currentUserId,
  isSelected = false,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onMove,
  showDeleteAction = false,
  deleteTitle = "Delete",
}: FileListItemProps) {
  const isOwner = currentUserId === file.ownerUserId;
  const canShowDeleteAction = isOwner || showDeleteAction;
  const canPreview =
    file.mimeType.startsWith("image/") ||
    file.mimeType.startsWith("video/") ||
    file.mimeType === "application/pdf";

  return (
    <div
      className={`flex flex-col items-stretch justify-between py-3.5 px-3 rounded-xl transition-all border gap-3 sm:flex-row sm:items-center sm:px-4 sm:gap-4 ${
        isSelected
          ? "bg-[rgba(0,47,167,0.04)] border-[rgba(0,47,167,0.2)] shadow-sm"
          : "hover:bg-[#F5F5F5] border-transparent hover:border-[#E5E7EB]"
      }`}
    >
      {/* Selection Checkbox & File Info */}
      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(file.id)}
            className="w-4 h-4 rounded text-[#002FA7] border-[#D1D5DB] focus:ring-[#002FA7] cursor-pointer shrink-0 accent-[#002FA7]"
          />
        )}
        <div className="w-10 h-10 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <FileIcon mimeType={file.mimeType} />
        </div>
        <div className="overflow-hidden min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-[#171717] truncate"
            title={file.originalName}
          >
            {file.originalName}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737373] font-mono mt-0.5">
            <span>{formatBytes(file.sizeBytes)}</span>
            <span>·</span>
            <span>{formatDate(file.createdAt)}</span>
            {!isOwner && (
              <>
                <span>·</span>
                <span className="text-[#002FA7] font-sans font-medium">
                  shared
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-dot Actions Menu */}
      <DropdownMenu>
        {canPreview && (
          <DropdownItem
            icon={<Eye className="w-4 h-4" />}
            label="Preview"
            onClick={() => onPreview(file)}
          />
        )}
        <DropdownItem
          icon={<Download className="w-4 h-4" />}
          label="Download"
          onClick={() => onDownload(file)}
        />
        {isOwner && (
          <DropdownItem
            icon={<Share2 className="w-4 h-4" />}
            label="Share"
            onClick={() => onShare(file)}
          />
        )}
        {isOwner && onMove && (
          <DropdownItem
            icon={<ArrowRightToLine className="w-4 h-4" />}
            label="Move"
            onClick={() => onMove(file)}
          />
        )}
        {canShowDeleteAction && (
          <DropdownItem
            icon={<Trash2 className="w-4 h-4" />}
            label={deleteTitle}
            onClick={() => onDelete(file.id)}
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
