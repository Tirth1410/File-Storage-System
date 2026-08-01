"use client";

import { useSession } from "@/app/lib/auth-client";
import { useEffect, useState } from "react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { StatCard } from "@/app/components/shared/StatCard";
import { StorageBar } from "@/app/components/shared/StorageBar";
import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { formatBytes } from "@/app/lib/utils";
import { Download, FileText } from "lucide-react";

interface ProfileData {
  storage: {
    quotaBytes: string;
    usedBytes: string;
    remainingBytes: string;
    utilization: number;
  };
  files: {
    totalUploadedFiles: number;
    totalDownloads: number;
    recentUploads: {
      id: string;
      originalName: string;
      sizeBytes: string;
      createdAt: string;
    }[];
    recentDownloads: {
      id: string;
      fileId: string;
      originalName: string;
      downloadedAt: string;
    }[];
  };
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) setProfileData(await res.json());
    } catch (err) {
      console.error("Error fetching profile details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      Promise.resolve().then(() => fetchProfileData());
    }
  }, [session]);

  if (isPending) return <LoadingScreen message="Loading auth session..." />;
  if (!session?.user) return <LoadingScreen message="Loading profile..." />;

  const { user } = session;
  const initials = user.name
    ? user.name.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        isAdmin={user.role === "admin"}
      />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              My Profile
            </h1>
            <p className="text-sm text-[#737373] mt-0.5">
              Usage stats, storage quota, and recent activity
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#737373]">Loading profile data...</p>
            </div>
          ) : profileData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="space-y-5">
                {/* Identity Card */}
                <SectionCard title="Account">
                  <div className="flex flex-col items-center text-center gap-3 pb-5 border-b border-[#E5E7EB]">
                    <div className="w-16 h-16 bg-[rgba(0,47,167,0.1)] border border-[rgba(0,47,167,0.2)] rounded-full flex items-center justify-center font-bold text-xl text-[#002FA7]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#171717]">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs text-[#737373] mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <StatusBadge
                      variant={user.role === "admin" ? "admin" : "user"}
                      label={user.role || "user"}
                    />
                  </div>
                  <div className="space-y-3 pt-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[#737373]">Member Since</span>
                      <span className="font-semibold text-[#171717]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#737373]">Files</span>
                      <span className="font-semibold text-[#171717]">
                        {profileData.files.totalUploadedFiles}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#737373]">Downloads</span>
                      <span className="font-semibold text-[#171717]">
                        {profileData.files.totalDownloads}
                      </span>
                    </div>
                  </div>
                </SectionCard>

                {/* Quota Card */}
                <SectionCard title="Storage Quota">
                  <StorageBar
                    usedBytes={profileData.storage.usedBytes}
                    quotaBytes={profileData.storage.quotaBytes}
                    utilization={profileData.storage.utilization}
                    variant="full"
                  />
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Available</span>
                      <span className="font-semibold text-[#16A34A] font-mono">
                        {formatBytes(profileData.storage.remainingBytes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Total Quota</span>
                      <span className="font-semibold text-[#171717] font-mono">
                        {formatBytes(profileData.storage.quotaBytes)}
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Right column */}
              <div className="md:col-span-2 space-y-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-5">
                  <StatCard
                    label="Total Files"
                    value={profileData.files.totalUploadedFiles}
                    icon={<FileText className="w-5 h-5" />}
                  />
                  <StatCard
                    label="Total Downloads"
                    value={profileData.files.totalDownloads}
                    icon={<Download className="w-5 h-5" />}
                  />
                </div>

                {/* Recent Uploads */}
                <SectionCard title="Recent Uploads" noPadding>
                  {profileData.files.recentUploads.length === 0 ? (
                    <div className="px-6 py-12 text-center text-xs text-[#A3A3A3]">
                      No recent uploads.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F5F5F5]">
                      {profileData.files.recentUploads.map((file) => (
                        <div
                          key={file.id}
                          className="flex justify-between items-center px-6 py-3.5 hover:bg-[#FAFAFA] transition-colors"
                        >
                          <span className="text-sm font-medium text-[#171717] truncate max-w-[55%]">
                            {file.originalName}
                          </span>
                          <div className="flex items-center gap-4 text-xs text-[#737373] font-mono shrink-0">
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span>
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Recent Downloads */}
                <SectionCard title="Recent Downloads" noPadding>
                  {profileData.files.recentDownloads.length === 0 ? (
                    <div className="px-6 py-12 text-center text-xs text-[#A3A3A3]">
                      No downloads logged recently.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F5F5F5]">
                      {profileData.files.recentDownloads.map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between items-center px-6 py-3.5 hover:bg-[#FAFAFA] transition-colors"
                        >
                          <span className="text-sm font-medium text-[#171717] truncate max-w-[55%]">
                            {log.originalName}
                          </span>
                          <span className="text-xs text-[#737373] font-mono shrink-0">
                            {new Date(log.downloadedAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
