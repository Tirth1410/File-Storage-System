"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/app/lib/auth-client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
}

interface UploadProgress {
  filename: string;
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Abort controller / variables for cancellation
  const uploadControllerRef = useRef<{
    active: boolean;
    uploadId?: string;
    objectKey?: string;
  }>({ active: false });

  // Preview state
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchProfileData = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error("Error loading profile stats:", err);
    }
  };

  const fetchFiles = async () => {
    await Promise.resolve();
    setFilesLoading(true);
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
      await fetchProfileData();
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    } else if (session?.user) {
      let active = true;
      const load = async () => {
        try {
          const res = await fetch("/api/files");
          if (res.ok && active) {
            const data = await res.json();
            setFiles(data);
          }
          const profRes = await fetch("/api/profile");
          if (profRes.ok && active) {
            const profData = await profRes.json();
            setProfileData(profData);
          }
        } catch (err) {
          console.error("Error loading files/profile:", err);
        } finally {
          if (active) {
            setFilesLoading(false);
          }
        }
      };
      load();
      return () => {
        active = false;
      };
    }
  }, [isPending, session, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const formatBytes = (bytes: number | string, decimals = 2) => {
    const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
    if (b === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    uploadControllerRef.current = { active: true };

    const startTime = Date.now();
    let uploadId = "";
    let objectKey = "";

    try {
      // 1. Initiate upload
      const initRes = await fetch("/api/files/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.type || "application/octet-stream",
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        if (errData.error === "QuotaExceeded") {
          setError(
            errData.message ||
              "Quota exceeded: Not enough storage space available.",
          );
          setUploading(false);
          uploadControllerRef.current = { active: false };
          return;
        }
        throw new Error(errData.error || "Failed to initiate upload");
      }

      const initData = await initRes.json();
      uploadId = initData.uploadId;
      objectKey = initData.objectKey;
      const partSizeBytes = initData.partSizeBytes;

      uploadControllerRef.current.uploadId = uploadId;
      uploadControllerRef.current.objectKey = objectKey;

      const totalParts = Math.ceil(selectedFile.size / partSizeBytes);
      const parts: { partNumber: number; etag: string }[] = [];

      // Concurrency management
      const queue = Array.from({ length: totalParts }, (_, i) => i + 1);
      const activeUploads: Promise<void>[] = [];
      const CONCURRENCY_LIMIT = 3;
      let uploadedBytes = 0;

      const uploadPart = async (partNumber: number) => {
        if (!uploadControllerRef.current.active) return;

        const start = (partNumber - 1) * partSizeBytes;
        const end = Math.min(start + partSizeBytes, selectedFile.size);
        const chunk = selectedFile.slice(start, end);
        const chunkSize = chunk.size;

        // Get presigned URL
        const signRes = await fetch("/api/files/sign-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, objectKey, partNumber }),
        });

        if (!signRes.ok) throw new Error(`Failed to sign part ${partNumber}`);
        const { url } = await signRes.json();

        // Upload chunk directly to R2
        let attempts = 0;
        const maxAttempts = 3;
        let etag = "";

        while (attempts < maxAttempts) {
          if (!uploadControllerRef.current.active) return;
          try {
            const uploadRes = await fetch(url, {
              method: "PUT",
              body: chunk,
              headers: {
                "Content-Type": selectedFile.type || "application/octet-stream",
              },
            });

            if (!uploadRes.ok)
              throw new Error(`Part ${partNumber} upload failed`);

            const rawEtag = uploadRes.headers.get("ETag");
            if (!rawEtag) throw new Error("ETag header missing from response");
            etag = rawEtag.replace(/"/g, "");
            break;
          } catch (err) {
            attempts++;
            if (attempts >= maxAttempts) throw err;
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * attempts),
            );
          }
        }

        if (!uploadControllerRef.current.active) return;

        parts.push({ partNumber, etag });
        uploadedBytes += chunkSize;

        // Update progress
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0; // Bytes per second
        const remainingBytes = selectedFile.size - uploadedBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        setProgress({
          filename: selectedFile.name,
          percentage: Math.round((uploadedBytes / selectedFile.size) * 100),
          uploadedBytes,
          totalBytes: selectedFile.size,
          speedMBs: speed / (1024 * 1024),
          etaSeconds: Math.round(eta),
        });
      };

      for (const partNumber of queue) {
        if (!uploadControllerRef.current.active) break;
        if (activeUploads.length >= CONCURRENCY_LIMIT) {
          await Promise.race(activeUploads);
        }
        const p = uploadPart(partNumber).then(() => {
          activeUploads.splice(activeUploads.indexOf(p), 1);
        });
        activeUploads.push(p);
      }

      await Promise.all(activeUploads);

      if (!uploadControllerRef.current.active) {
        throw new Error("Upload cancelled by user");
      }

      // 3. Complete upload
      const completeRes = await fetch("/api/files/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, objectKey, parts }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to complete upload orchestration");
      }

      setSuccessMessage("File uploaded successfully!");
      setSelectedFile(null);
      setProgress(null);
      fetchFiles();
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during upload.";
      setError(errorMessage);

      // If we got an upload ID, abort upload on backend to clean up R2 resources
      if (uploadId && objectKey && uploadControllerRef.current.active) {
        try {
          await fetch("/api/files/abort-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, objectKey }),
          });
        } catch (abortErr) {
          console.error("Failed to abort upload:", abortErr);
        }
      }
    } finally {
      setUploading(false);
      uploadControllerRef.current = { active: false };
    }
  };

  const cancelUpload = async () => {
    uploadControllerRef.current.active = false;
    const { uploadId, objectKey } = uploadControllerRef.current;
    if (uploadId && objectKey) {
      try {
        await fetch("/api/files/abort-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, objectKey }),
        });
      } catch (err) {
        console.error("Error cancelling upload:", err);
      }
    }
    setError("Upload cancelled.");
    setUploading(false);
    setProgress(null);
  };

  const handleDelete = async (fileId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this file? This will release its quota usage.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMessage("File deleted successfully!");
        fetchFiles();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("An error occurred while deleting file");
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const res = await fetch(
        `/api/files/${file.id}/download-url?download=true`,
      );
      if (res.ok) {
        const { url } = await res.json();
        const a = document.createElement("a");
        a.href = url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Failed to get download URL");
      }
    } catch (err) {
      console.error("Error downloading file:", err);
    }
  };

  const handlePreview = async (file: UploadedFile) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/files/${file.id}/download-url?download=false`,
      );
      if (res.ok) {
        const { url } = await res.json();
        setPreviewUrl(url);
      } else {
        setError("Failed to fetch preview URL");
      }
    } catch (err) {
      console.error("Error previewing file:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white font-sans">
        <p className="text-neutral-400 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  const { user } = session;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CloudStorage
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Securely upload large files directly to Cloudflare R2
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-sm">{user.name || "User"}</p>
              <p className="text-neutral-555 text-xs">{user.email}</p>
            </div>
            <button
              onClick={() => router.push("/profile")}
              className="bg-indigo-600 hover:bg-indigo-755 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-indigo-500 shadow-md shadow-indigo-900/10"
            >
              My Profile
            </button>
            <button
              onClick={() => signOut()}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-neutral-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile, Quota, & Upload */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Account Details
              </h2>
              <div className="space-y-2 text-sm text-neutral-450">
                <div className="flex justify-between">
                  <span className="text-neutral-550">Role:</span>
                  <span className="capitalize font-medium text-neutral-300">
                    {user.role || "user"}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Storage Usage:</span>
                    <span className="font-medium text-neutral-300 font-mono text-xs">
                      {profileData
                        ? `${formatBytes(profileData.storage.usedBytes)} / ${formatBytes(profileData.storage.quotaBytes)}`
                        : "Loading..."}
                    </span>
                  </div>

                  {profileData && (
                    <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850 mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${profileData.storage.utilization}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-555">User ID:</span>
                  <span className="font-mono text-xs select-all text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">
                    {user.id}
                  </span>
                </div>
              </div>
              {user.role === "admin" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="w-full bg-indigo-650/20 hover:bg-indigo-650/30 text-indigo-400 border border-indigo-500/30 font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  Admin Portal
                </button>
              )}
            </div>

            {/* File Upload Section */}
            <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Direct File Upload
              </h2>

              {/* Upload Drop Zone / Input */}
              {!uploading && (
                <div className="space-y-4">
                  <label className="group block border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-indigo-950/5">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-950 rounded-xl flex items-center justify-center border border-neutral-800 group-hover:border-indigo-500/30 transition-all">
                        <svg
                          className="w-6 h-6 text-neutral-400 group-hover:text-indigo-400 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-neutral-300">
                        {selectedFile ? "Change File" : "Select a File"}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Supports large files up to 1 GB. Chunks are uploaded
                        directly.
                      </span>
                    </div>
                  </label>

                  {/* File Metadata & CTA */}
                  {selectedFile && (
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="overflow-hidden">
                          <p
                            className="text-sm font-semibold text-neutral-200 truncate"
                            title={selectedFile.name}
                          >
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatBytes(selectedFile.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-neutral-500 hover:text-neutral-300 text-xs"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        onClick={triggerUpload}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-650 hover:to-purple-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/20"
                      >
                        Start Upload
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Progress UI */}
              {uploading && progress && (
                <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-neutral-300 truncate max-w-[150px]">
                      {progress.filename}
                    </span>
                    <span className="text-indigo-400 font-bold">
                      {progress.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-450 font-mono">
                    <div>
                      <p className="text-neutral-500 text-[10px]">UPLOADED</p>
                      <p>{formatBytes(progress.uploadedBytes)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500 text-[10px]">TOTAL SIZE</p>
                      <p>{formatBytes(progress.totalBytes)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[10px]">SPEED</p>
                      <p className="text-neutral-300">
                        {progress.speedMBs.toFixed(2)} MB/s
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500 text-[10px]">ETA</p>
                      <p className="text-neutral-300">
                        {progress.etaSeconds > 0
                          ? `${progress.etaSeconds}s`
                          : "finishing..."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={cancelUpload}
                    className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-550/20 font-semibold py-2 rounded-xl text-xs transition-all"
                  >
                    Cancel Upload
                  </button>
                </div>
              )}

              {/* Status Feedbacks */}
              {error && (
                <div className="bg-red-950/20 text-red-400 border border-red-550/20 p-4 rounded-xl text-xs leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Upload Failed
                  </p>
                  <p>{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-555/20 p-4 rounded-xl text-xs font-medium">
                  <p className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {successMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Files List & Preview Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 shadow-xl min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 mb-4 border-b border-neutral-800">
                  <h2 className="text-xl font-bold text-neutral-200">
                    My Files
                  </h2>
                  <button
                    onClick={fetchFiles}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>

                {/* Loading State */}
                {filesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-neutral-550 text-sm">
                      Fetching files...
                    </span>
                  </div>
                ) : files.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-neutral-950 rounded-2xl flex items-center justify-center border border-neutral-800 text-neutral-500 mb-4">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-neutral-300 font-bold mb-1">
                      No Files Uploaded
                    </h3>
                    <p className="text-neutral-550 text-xs max-w-sm">
                      Select a large file on the left panel to upload it
                      directly to R2 multipart storage.
                    </p>
                  </div>
                ) : (
                  /* File List */
                  <div className="divide-y divide-neutral-850">
                    {files.map((file) => {
                      const isImage = file.mimeType.startsWith("image/");
                      const isVideo = file.mimeType.startsWith("video/");
                      const isPdf = file.mimeType === "application/pdf";

                      let fileIcon = (
                        <svg
                          className="w-5 h-5 text-neutral-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      );
                      if (isImage) {
                        fileIcon = (
                          <svg
                            className="w-5 h-5 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        );
                      } else if (isVideo) {
                        fileIcon = (
                          <svg
                            className="w-5 h-5 text-purple-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        );
                      } else if (isPdf) {
                        fileIcon = (
                          <svg
                            className="w-5 h-5 text-rose-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        );
                      }

                      return (
                        <div
                          key={file.id}
                          className="flex justify-between items-center py-4 gap-4 hover:bg-neutral-900/50 px-2 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-neutral-950 border border-neutral-850 rounded-xl flex items-center justify-center shrink-0">
                              {fileIcon}
                            </div>
                            <div className="overflow-hidden">
                              <p
                                className="text-sm font-semibold text-neutral-200 truncate"
                                title={file.originalName}
                              >
                                {file.originalName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                                <span>{formatBytes(file.sizeBytes)}</span>
                                <span>•</span>
                                <span>
                                  {new Date(
                                    file.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* File Actions */}
                          <div className="flex gap-2">
                            {(isImage || isVideo || isPdf) && (
                              <button
                                onClick={() => handlePreview(file)}
                                className="bg-neutral-800 hover:bg-neutral-700 hover:text-indigo-400 text-neutral-300 p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-neutral-750"
                                title="Preview File"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                <span className="hidden md:inline">
                                  Preview
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(file)}
                              className="bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-400 border border-indigo-500/20 p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                              title="Download File"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              <span className="hidden md:inline">Download</span>
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-500/20 p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                              title="Delete File"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              <span className="hidden md:inline">Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer details */}
              <div className="pt-4 border-t border-neutral-800 text-xs text-neutral-500 flex justify-between">
                <span>Total files: {files.length}</span>
                <span>Storage Provider: Cloudflare R2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-neutral-800">
              <div className="overflow-hidden">
                <h3 className="text-sm font-semibold text-neutral-200 truncate">
                  {previewFile.originalName}
                </h3>
                <p className="text-xs text-neutral-500">
                  {formatBytes(previewFile.sizeBytes)}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="text-neutral-400 hover:text-neutral-100 transition-colors bg-neutral-950 border border-neutral-800 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-neutral-950 flex items-center justify-center overflow-auto min-h-[300px] max-h-[60vh] relative p-6">
              {previewLoading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-neutral-550 text-xs">
                    Signing view URL...
                  </span>
                </div>
              )}

              {!previewLoading && previewUrl && (
                <>
                  {previewFile.mimeType.startsWith("image/") && (
                    <Image
                      src={previewUrl}
                      alt={previewFile.originalName}
                      width={800}
                      height={600}
                      unoptimized
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  )}

                  {previewFile.mimeType.startsWith("video/") && (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  )}

                  {previewFile.mimeType === "application/pdf" && (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[60vh] border-0 rounded"
                      title="PDF Preview"
                    />
                  )}
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
              <button
                onClick={() => handleDownload(previewFile)}
                className="bg-indigo-655 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
