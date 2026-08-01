import { StorageBar } from "@/app/components/shared/StorageBar";
import { Database } from "lucide-react";
import type { ProfileData } from "./types";

interface QuotaStripProps {
  profileData: ProfileData;
}

export function QuotaStrip({ profileData }: QuotaStripProps) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[rgba(0,47,167,0.08)] border border-[rgba(0,47,167,0.2)] rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-[#002FA7]" />
          </div>
          <div>
            <p className="text-xs text-[#737373] font-medium">Storage</p>
            <p className="text-sm font-bold text-[#171717]">
              {profileData.files.totalUploadedFiles} file
              {profileData.files.totalUploadedFiles !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-72" data-tour="storage-bar">
          <StorageBar
            usedBytes={profileData.storage.usedBytes}
            quotaBytes={profileData.storage.quotaBytes}
            utilization={profileData.storage.utilization}
          />
        </div>
      </div>
    </div>
  );
}
