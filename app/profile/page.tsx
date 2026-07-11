"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/app/lib/auth-client";
import { useEffect, useState } from "react";

const formatBytes = (bytes: number | string, decimals = 2) => {
  const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(b) || b === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

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
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        router.push("/sign-in");
      } else {
        Promise.resolve().then(() => {
          fetchProfileData();
        });
      }
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <p className="text-xl font-medium animate-pulse">
          Loading auth session...
        </p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <p className="text-xl font-medium animate-pulse">Redirecting...</p>
      </div>
    );
  }

  const { user } = session;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              My Profile Dashboard
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Monitor your storage allocation, usage patterns, and recent file
              activity.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-neutral-900 border border-neutral-800 text-white font-medium rounded-md px-4 py-2 hover:bg-neutral-800 transition-colors shrink-0"
          >
            ← Back to Dashboard
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-neutral-450 text-sm">
              Loading your profile data...
            </span>
          </div>
        ) : (
          profileData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Side: Account Info & Quota Info */}
              <div className="md:col-span-1 space-y-6">
                {/* Profile Card */}
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col items-center text-center space-y-2 border-b border-neutral-850 pb-4">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                    </div>
                    <h2 className="text-lg font-bold text-neutral-250 mt-2">
                      {user.name || "User"}
                    </h2>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <div className="space-y-2 text-sm text-neutral-400">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Role:</span>
                      <span className="capitalize font-medium text-neutral-200">
                        {user.role || "user"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Member Since:</span>
                      <span className="font-medium text-neutral-200">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quota Progress Card */}
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                    Storage Quota
                  </h3>
                  <div className="space-y-3">
                    <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${profileData.storage.utilization}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-neutral-400">
                      <span>{profileData.storage.utilization}% Used</span>
                      <span>
                        {formatBytes(profileData.storage.quotaBytes)} Total
                      </span>
                    </div>
                    <div className="border-t border-neutral-850 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Used Storage:</span>
                        <span className="font-mono text-neutral-300">
                          {formatBytes(profileData.storage.usedBytes)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-550">Available:</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {formatBytes(profileData.storage.remainingBytes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: File stats & lists */}
              <div className="md:col-span-2 space-y-6">
                {/* Basic Stats Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
                      Uploaded Files
                    </p>
                    <h3 className="text-2xl font-bold text-white">
                      {profileData.files.totalUploadedFiles}
                    </h3>
                  </div>
                  <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 backdrop-blur-sm">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
                      Total Downloads
                    </p>
                    <h3 className="text-2xl font-bold text-indigo-400">
                      {profileData.files.totalDownloads}
                    </h3>
                  </div>
                </div>

                {/* Recent Uploads */}
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                    Recent Uploads
                  </h3>
                  {profileData.files.recentUploads.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4">
                      No files uploaded recently.
                    </p>
                  ) : (
                    <div className="divide-y divide-neutral-800/50">
                      {profileData.files.recentUploads.map((file) => (
                        <div
                          key={file.id}
                          className="flex justify-between items-center py-2.5 text-sm"
                        >
                          <div className="truncate max-w-[250px] font-medium text-neutral-300">
                            {file.originalName}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span>
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Downloads */}
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                    Recent Downloads
                  </h3>
                  {profileData.files.recentDownloads.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4">
                      No downloads logged recently.
                    </p>
                  ) : (
                    <div className="divide-y divide-neutral-800/50">
                      {profileData.files.recentDownloads.map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between items-center py-2.5 text-sm"
                        >
                          <div className="truncate max-w-[250px] font-medium text-neutral-300">
                            {log.originalName}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono">
                            {new Date(log.downloadedAt).toLocaleDateString()}{" "}
                            {new Date(log.downloadedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
}
