"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/app/lib/auth-client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const PDFCanvasViewer = dynamic(
  () => import("@/app/components/shared/PDFCanvasViewer"),
  { ssr: false },
);

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { StorageBar } from "@/app/components/shared/StorageBar";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { ShareModal } from "@/app/components/shared/ShareModal";
import { FileListItem } from "@/app/components/dashboard/FileListItem";
import { UploadPanel } from "@/app/components/dashboard/UploadPanel";
import { ConfirmationDialog } from "@/app/components/shared/ConfirmationDialog";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
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
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<"own" | "shared">("own");

  // Selection state
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // Preview state
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Share state
  const [shareFile, setShareFile] = useState<UploadedFile | null>(null);

  // Custom Alert / Confirm Dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: "alert" | "confirm";
    variant?: "danger" | "info" | "success";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showCustomAlert = (
    title: string,
    message: string,
    variant: "danger" | "info" | "success" = "info",
  ) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmLabel: "OK",
      type: "alert",
      variant,
      onConfirm: () => {},
    });
  };

  /* ─── data fetching ─── */
  const fetchFiles = useCallback(
    async (tab: "own" | "shared" = activeTab) => {
      setFilesLoading(true);
      try {
        const res = await fetch(`/api/files?type=${tab}`);
        if (res.ok) {
          const fetchedFiles: UploadedFile[] = await res.json();
          setFiles(fetchedFiles);
          // Keep only selected file IDs that still exist
          setSelectedFileIds((prev) =>
            prev.filter((id) => fetchedFiles.some((f) => f.id === id))
          );
        }
        // Re-fetch profile data after file list updates
        const profRes = await fetch("/api/profile");
        if (profRes.ok) setProfileData(await profRes.json());
      } catch (err) {
        console.error("Error loading files:", err);
      } finally {
        setFilesLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    if (!session?.user) return;

    let active = true;
    const load = async () => {
      setFilesLoading(true);
      try {
        const [filesRes, profRes] = await Promise.all([
          fetch(`/api/files?type=${activeTab}`),
          fetch("/api/profile"),
        ]);
        if (active && filesRes.ok) {
          const loadedFiles: UploadedFile[] = await filesRes.json();
          setFiles(loadedFiles);
          setSelectedFileIds([]);
        }
        if (active && profRes.ok) setProfileData(await profRes.json());
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (active) setFilesLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [session, activeTab]);

  /* ─── selection handlers ─── */
  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const isAllSelected =
    files.length > 0 && files.every((f) => selectedFileIds.includes(f.id));

  const isSomeSelected =
    selectedFileIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map((f) => f.id));
    }
  };

  const handleBatchDelete = () => {
    const count = selectedFileIds.length;
    if (count === 0) return;

    setDialogState({
      isOpen: true,
      title: `Delete ${count} File${count > 1 ? "s" : ""}`,
      message: `Are you sure you want to delete ${count} selected file${
        count > 1 ? "s" : ""
      }? Storage quota will be released.`,
      confirmLabel: `Delete ${count} File${count > 1 ? "s" : ""}`,
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const deletePromises = selectedFileIds.map((id) =>
            fetch(`/api/files/${id}`, { method: "DELETE" })
          );
          const responses = await Promise.all(deletePromises);
          const successCount = responses.filter((res) => res.ok).length;

          if (successCount > 0) {
            toast.success(
              `${successCount} file${
                successCount > 1 ? "s" : ""
              } deleted successfully!`
            );
            setSelectedFileIds([]);
            fetchFiles();
          } else {
            showCustomAlert("Error", "Failed to delete selected files", "danger");
          }
        } catch {
          showCustomAlert(
            "Error",
            "An error occurred while deleting files",
            "danger"
          );
        }
      },
    });
  };

  /* ─── single file actions ─── */
  const handleDelete = async (fileId: string) => {
    setDialogState({
      isOpen: true,
      title: "Delete File",
      message:
        "Are you sure you want to delete this file? Its storage quota will be released.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("File deleted successfully!");
            setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
            fetchFiles();
          } else {
            const d = await res.json();
            showCustomAlert("Error", d.error || "Delete failed", "danger");
          }
        } catch {
          showCustomAlert(
            "Error",
            "An error occurred while deleting",
            "danger",
          );
        }
      },
    });
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
        showCustomAlert("Error", "Failed to get download URL", "danger");
      }
    } catch {
      showCustomAlert("Error", "Error downloading file", "danger");
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
      }
    } catch {
      console.error("Preview error");
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ─── guards ─── */
  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user) return <LoadingScreen message="Redirecting..." />;

  const { user } = session;

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        actions={
          user.role === "admin"
            ? [
                {
                  label: "Admin Portal",
                  onClick: () => router.push("/admin"),
                  variant: "primary",
                },
              ]
            : [
                {
                  label: "My Profile",
                  onClick: () => router.push("/profile"),
                  variant: "ghost",
                },
              ]
        }
      />

      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        type={dialogState.type}
        variant={dialogState.variant}
        onConfirm={() => {
          dialogState.onConfirm();
          setDialogState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
      />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-6">
          {/* Page title row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
                My Storage
              </h1>
              <p className="text-sm text-[#737373] mt-0.5">
                Upload, manage and share your files
              </p>
            </div>
          </div>

          {/* Quota strip */}
          {profileData && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[rgba(0,47,167,0.08)] border border-[rgba(0,47,167,0.2)] rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#002FA7]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#737373] font-medium">
                      Storage
                    </p>
                    <p className="text-sm font-bold text-[#171717]">
                      {profileData.files.totalUploadedFiles} file
                      {profileData.files.totalUploadedFiles !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="sm:w-72">
                  <StorageBar
                    usedBytes={profileData.storage.usedBytes}
                    quotaBytes={profileData.storage.quotaBytes}
                    utilization={profileData.storage.utilization}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar: Upload */}
            <div className="lg:col-span-1">
              <SectionCard title="Upload File">
                <UploadPanel
                  onSuccess={() => {
                    setActiveTab("own");
                    fetchFiles("own");
                  }}
                />
              </SectionCard>
            </div>

            {/* Main: File List */}
            <div className="lg:col-span-2">
              <SectionCard
                title={activeTab === "own" ? "My Files" : "Shared with Me"}
                noPadding
                titleRight={
                  <div className="flex items-center gap-2">
                    {/* Tab Toggle */}
                    <div className="flex bg-[#F5F5F5] border border-[#E5E7EB] rounded-lg p-0.5">
                      {(["own", "shared"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                            activeTab === tab
                              ? "bg-white text-[#002FA7] shadow-sm border border-[#E5E7EB]"
                              : "text-[#737373] hover:text-[#171717]"
                          } cursor-pointer`}
                        >
                          {tab === "own" ? "My Files" : "Shared"}
                        </button>
                      ))}
                    </div>
                    {/* Refresh */}
                    <button
                      onClick={() => fetchFiles(activeTab)}
                      className="p-1.5 rounded-lg text-[#737373] hover:text-[#002FA7] hover:bg-[rgba(0,47,167,0.06)] transition-all cursor-pointer"
                      title="Refresh"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"
                        />
                      </svg>
                    </button>
                  </div>
                }
              >
                <div className="min-h-[420px] flex flex-col">
                  {/* Selection Toolbar Header */}
                  {!filesLoading && files.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs">
                      <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-[#525252] hover:text-[#171717]">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-[#002FA7] border-[#D1D5DB] focus:ring-[#002FA7] cursor-pointer accent-[#002FA7]"
                        />
                        <span>
                          Select All ({files.length})
                        </span>
                      </label>

                      {selectedFileIds.length > 0 && (
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-[#002FA7] bg-[rgba(0,47,167,0.08)] px-2.5 py-0.5 rounded-full border border-[rgba(0,47,167,0.2)]">
                            {selectedFileIds.length} selected
                          </span>
                          <button
                            onClick={handleBatchDelete}
                            className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#DC2626]/20 cursor-pointer"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete Selected ({selectedFileIds.length})
                          </button>
                          <button
                            onClick={() => setSelectedFileIds([])}
                            className="text-[#737373] hover:text-[#171717] font-medium underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {filesLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[#737373]">Loading files...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
                      <div className="w-14 h-14 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center justify-center mb-4">
                        <svg
                          className="w-7 h-7 text-[#A3A3A3]"
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
                      <h3 className="text-sm font-bold text-[#171717] mb-1">
                        {activeTab === "own"
                          ? "No files yet"
                          : "No shared files"}
                      </h3>
                      <p className="text-xs text-[#737373] max-w-xs">
                        {activeTab === "own"
                          ? "Upload a file from the panel on the left to get started."
                          : "Files shared with you by other users will appear here."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F5F5F5] px-2 py-2">
                      {files.map((file) => (
                        <FileListItem
                          key={file.id}
                          file={file}
                          currentUserId={user.id}
                          isSelected={selectedFileIds.includes(file.id)}
                          onToggleSelect={handleToggleSelect}
                          onPreview={handlePreview}
                          onDownload={handleDownload}
                          onShare={setShareFile}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  {!filesLoading && files.length > 0 && (
                    <div className="px-6 py-3 border-t border-[#F5F5F5] flex justify-between items-center">
                      <span className="text-xs text-[#737373]">
                        {files.length} file{files.length !== 1 ? "s" : ""}
                        {selectedFileIds.length > 0 &&
                          ` (${selectedFileIds.length} selected)`}
                      </span>
                      <span className="text-xs text-[#A3A3A3] font-mono">
                        Cloudflare R2
                      </span>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-[#171717] truncate">
                  {previewFile.originalName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="bg-[#002FA7] hover:bg-[#002482] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => {
                    setPreviewFile(null);
                    setPreviewUrl(null);
                  }}
                  className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Body */}
            <div
              className={`flex-1 bg-[#FAFAFA] flex items-center justify-center min-h-[300px] max-h-[65vh] ${
                previewFile?.mimeType === "application/pdf"
                  ? "overflow-hidden p-0"
                  : "overflow-auto p-6"
              }`}
            >
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#737373]">
                    Loading preview...
                  </span>
                </div>
              ) : previewUrl ? (
                <>
                  {previewFile.mimeType.startsWith("image/") && (
                    <Image
                      src={previewUrl}
                      alt={previewFile.originalName}
                      width={800}
                      height={600}
                      unoptimized
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  )}
                  {previewFile.mimeType.startsWith("video/") && (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  )}
                  {previewFile.mimeType === "application/pdf" && (
                    <PDFCanvasViewer
                      key={previewUrl}
                      url={previewUrl}
                      heightClass="h-[65vh] max-h-[65vh]"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-[#737373]">Preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareFile && (
        <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
      )}
    </>
  );
}
