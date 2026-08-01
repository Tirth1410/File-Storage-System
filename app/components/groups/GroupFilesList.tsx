"use client";

import { SectionCard } from "@/app/components/shared/SectionCard";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { formatBytes } from "@/app/lib/utils";
import { FileText } from "lucide-react";
import type { GroupFile, GroupRole } from "./types";

interface GroupFilesListProps {
  files: GroupFile[];
  currentUserId: string;
  currentUserRole: GroupRole;
  onPreview: (file: GroupFile["file"], allowDownload: boolean) => void;
  onDownload: (file: GroupFile["file"]) => void;
  onUnshare: (fileId: string) => void;
}

export function GroupFilesList({
  files,
  currentUserId,
  currentUserRole,
  onPreview,
  onDownload,
  onUnshare,
}: GroupFilesListProps) {
  return (
    <SectionCard noPadding title="Shared Files">
      {!files || files.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={<FileText className="w-7 h-7 text-[#A3A3A3]" />}
          title="No files shared yet"
          description="Share a file from the Dashboard Share menu."
        />
      ) : (
        <div className="divide-y divide-[#F5F5F5]">
          {files.map((gf) => {
            const canUnshare =
              gf.file.ownerUserId === currentUserId ||
              currentUserRole === "OWNER" ||
              currentUserRole === "ADMIN";

            return (
              <div
                key={gf.id}
                className="px-4 py-4 flex flex-col items-stretch justify-between gap-3 hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:px-6 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#171717] truncate">
                    {gf.file.originalName}
                  </p>
                  <p className="text-xs text-[#737373] mt-0.5">
                    {formatBytes(gf.file.sizeBytes)} · Shared by{" "}
                    {gf.sharedByUser.name || gf.sharedByUser.email}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {gf.allowPreview && (
                    <button
                      onClick={() => onPreview(gf.file, gf.allowDownload)}
                      className="bg-[rgba(0,47,167,0.06)] hover:bg-[rgba(0,47,167,0.12)] text-[#002FA7] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Preview
                    </button>
                  )}
                  {gf.allowDownload && (
                    <button
                      onClick={() => onDownload(gf.file)}
                      className="bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Download
                    </button>
                  )}
                  {canUnshare && (
                    <button
                      onClick={() => onUnshare(gf.file.id)}
                      className="bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                      title="Unshare File"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
