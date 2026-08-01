"use client";

import { StatCard } from "@/app/components/shared/StatCard";
import { formatBytes } from "@/app/lib/utils";
import { ArrowLeftRight, Database, FileText, Users } from "lucide-react";
import type { DashboardStats } from "./types";

interface AdminStatsGridProps {
  loading: boolean;
  stats: DashboardStats | null;
}

export function AdminStatsGrid({ loading, stats }: AdminStatsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white border border-[#E5E7EB] rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard
        label="Storage"
        value={formatBytes(stats.storage.totalUsed)}
        sub={`of ${formatBytes(stats.storage.totalAllocated)} (${stats.storage.overallUtilization}%)`}
        icon={<Database className="w-5 h-5" />}
      >
        <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
            style={{ width: `${stats.storage.overallUtilization}%` }}
          />
        </div>
      </StatCard>

      <StatCard
        label="File Statistics"
        value={stats.files.totalActiveFiles}
        sub={`Deleted: ${stats.files.totalDeletedFiles} · Avg: ${formatBytes(stats.files.averageFileSize)}`}
        icon={<FileText className="w-5 h-5" />}
      />

      <StatCard
        label="API Operations"
        value={`${stats.transfers.successfulUploads}/${stats.transfers.totalUploadRequests}`}
        sub={`Downloads: ${stats.transfers.successfulDownloads} successful`}
        icon={<ArrowLeftRight className="w-5 h-5" />}
      />

      <StatCard
        label="Platform Users"
        value={stats.users.totalRegistered}
        sub={`Active (30d): ${stats.users.activeUsers} · Full: ${stats.users.exhaustedQuota}`}
        icon={<Users className="w-5 h-5" />}
      />
    </div>
  );
}
