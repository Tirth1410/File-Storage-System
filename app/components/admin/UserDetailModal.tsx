"use client";

import { ModalShell } from "@/app/components/shared/ModalShell";
import { LoadingState } from "@/app/components/shared/LoadingState";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { StorageBar } from "@/app/components/shared/StorageBar";
import { formatDateTime } from "@/app/lib/utils";
import { QuotaEditor } from "./QuotaEditor";
import type { User, UserDetailStats } from "./types";

interface UserDetailModalProps {
  user: User;
  details: UserDetailStats | null;
  loadingDetails: boolean;
  newQuotaGB: number;
  newQuotaMB: number;
  savingQuota: boolean;
  onQuotaGbChange: (value: number) => void;
  onQuotaMbChange: (value: number) => void;
  onSaveQuota: () => void;
  onClose: () => void;
}

export function UserDetailModal({
  user,
  details,
  loadingDetails,
  newQuotaGB,
  newQuotaMB,
  savingQuota,
  onQuotaGbChange,
  onQuotaMbChange,
  onSaveQuota,
  onClose,
}: UserDetailModalProps) {
  return (
    <ModalShell
      title={`${user.name || "User"} Account`}
      subtitle={user.id}
      maxWidth="2xl"
      className="max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col"
      containerClassName="p-3 sm:p-4"
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAFA] sm:p-6">
        {loadingDetails ? (
          <LoadingState label="Loading analytics..." />
        ) : details ? (
          <div className="space-y-6">
            {/* Profile Info */}
            <SectionCard title="Profile Info">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Name", value: details.user.name || "N/A" },
                  { label: "Email", value: details.user.email },
                  {
                    label: "Joined",
                    value: formatDateTime(details.user.createdAt),
                  },
                  {
                    label: "Last Active",
                    value: formatDateTime(details.user.lastActivity),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[#737373] font-medium">
                      {label}
                    </p>
                    <p className="font-semibold text-[#171717] mt-0.5 truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Storage & Quota */}
            <SectionCard title="Storage & Quota">
              <div className="space-y-4">
                <StorageBar
                  usedBytes={details.storage.usedBytes}
                  quotaBytes={details.storage.quotaBytes}
                  utilization={details.storage.utilization}
                  variant="full"
                />
                <QuotaEditor
                  gb={newQuotaGB}
                  mb={newQuotaMB}
                  saving={savingQuota}
                  onGbChange={onQuotaGbChange}
                  onMbChange={onQuotaMbChange}
                  onApply={onSaveQuota}
                />
              </div>
            </SectionCard>

            {/* File Stats */}
            <SectionCard title="File Statistics">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  {
                    label: "Total",
                    value: details.files.totalUploadedFiles,
                    color: "text-[#171717]",
                  },
                  {
                    label: "Active",
                    value: details.files.totalActiveFiles,
                    color: "text-[#16A34A]",
                  },
                  {
                    label: "Deleted",
                    value: details.files.totalDeletedFiles,
                    color: "text-[#A3A3A3]",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-[#737373]">{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${color}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Activity */}
            <SectionCard title="Activity Summary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: "Upload Activity",
                    rows: [
                      {
                        name: "Initiated",
                        val: details.activity.uploadRequests,
                        color: "text-[#171717]",
                      },
                      {
                        name: "Successful",
                        val: details.activity.successfulUploads,
                        color: "text-[#16A34A]",
                      },
                      {
                        name: "Failed",
                        val: details.activity.failedUploads,
                        color: "text-[#DC2626]",
                      },
                    ],
                  },
                  {
                    label: "Download Activity",
                    rows: [
                      {
                        name: "Total",
                        val: details.activity.downloadRequests,
                        color: "text-[#171717]",
                      },
                      {
                        name: "Successful",
                        val: details.activity.successfulDownloads,
                        color: "text-[#16A34A]",
                      },
                      {
                        name: "Failed",
                        val: details.activity.failedDownloads,
                        color: "text-[#DC2626]",
                      },
                    ],
                  },
                ].map(({ label, rows }) => (
                  <div
                    key={label}
                    className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E7EB] space-y-2"
                  >
                    <p className="text-xs font-bold text-[#171717] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
                      {label}
                    </p>
                    {rows.map(({ name, val, color }) => (
                      <div
                        key={name}
                        className="flex justify-between text-xs font-mono"
                      >
                        <span className="text-[#737373]">{name}</span>
                        <span className={`font-semibold ${color}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>

      <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end">
        <button
          onClick={onClose}
          className="text-sm font-semibold border border-[#E5E7EB] rounded-xl px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] transition-all cursor-pointer"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}
