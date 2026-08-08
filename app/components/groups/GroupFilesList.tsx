"use client";

import { useState } from "react";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { Spinner } from "@/app/components/shared/Spinner";
import { formatBytes } from "@/app/lib/utils";
import { Eye, Download, Trash2, FileText } from "lucide-react";
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
  const [pendingId, setPendingId] = useState<string | null>(null);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setPendingId(key);
    try {
      await fn();
    } finally {
      setPendingId((cur) => (cur === key ? null : cur));
    }
  };

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
                      className="p-2 rounded-lg transition-all cursor-pointer bg-[rgba(0,47,167,0.06)] hover:bg-[rgba(0,47,167,0.12)] text-[#002FA7]"
                      title="Preview"
                      aria-label="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {gf.allowDownload && (
                    <button
                      onClick={() =>
                        runAction(`download-${gf.file.id}`, async () =>
                          onDownload(gf.file),
                        )
                      }
                      disabled={pendingId === `download-${gf.file.id}`}
                      className="p-2 rounded-lg transition-all cursor-pointer bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] disabled:opacity-60"
                      title="Download"
                      aria-label="Download"
                    >
                      {pendingId === `download-${gf.file.id}` ? (
                        <Spinner size="sm" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {canUnshare && (
                    <button
                      onClick={() =>
                        runAction(`unshare-${gf.file.id}`, async () =>
                          onUnshare(gf.file.id),
                        )
                      }
                      disabled={pendingId === `unshare-${gf.file.id}`}
                      className="p-2 rounded-lg transition-all cursor-pointer bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] disabled:opacity-60"
                      title="Remove"
                      aria-label="Remove"
                    >
                      {pendingId === `unshare-${gf.file.id}` ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
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
