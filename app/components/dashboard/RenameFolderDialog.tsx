"use client";

import { ModalShell } from "@/app/components/shared/ModalShell";
import type { FolderData } from "./types";

interface RenameFolderDialogProps {
  folder: FolderData;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function RenameFolderDialog({
  folder,
  value,
  onChange,
  onSubmit,
  onClose,
}: RenameFolderDialogProps) {
  return (
    <ModalShell headerless maxWidth="sm" onClose={onClose} className="p-6">
      <h3 className="text-sm font-bold text-[#171717] mb-4">
        Rename {folder.name ? `"${folder.name}"` : "Folder"}
      </h3>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onClose();
        }}
        className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002FA7] focus:border-transparent mb-4"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-[#525252] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F5F5F5] transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#002FA7] rounded-lg hover:bg-[#002482] transition-all cursor-pointer disabled:opacity-50"
        >
          Rename
        </button>
      </div>
    </ModalShell>
  );
}
