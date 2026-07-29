"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/app/lib/auth-client";
import { useEffect, useState, useCallback, startTransition } from "react";
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
import { FolderListItem } from "@/app/components/dashboard/FolderListItem";
import { UploadPanel } from "@/app/components/dashboard/UploadPanel";
import { BreadcrumbNav } from "@/app/components/dashboard/BreadcrumbNav";
import { NewFolderInput } from "@/app/components/dashboard/NewFolderInput";
import { MoveToDialog } from "@/app/components/dashboard/MoveToDialog";
import { ConfirmationDialog } from "@/app/components/shared/ConfirmationDialog";
import { toast } from "sonner";
import { useProductTour } from "@/app/hooks/useProductTour";
import { TourKickoffModal } from "@/app/components/shared/TourKickoffModal";
import { RefreshCw } from "lucide-react";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
}

interface FolderData {
  id: string;
  name: string;
  ownerUserId: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
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
  const { showModal, startTour, dismissTour } = useProductTour("dashboard");

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<"own" | "shared">("own");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState<BreadcrumbItem[]>(
    [],
  );

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [shareFile, setShareFile] = useState<UploadedFile | null>(null);

  const [renameTarget, setRenameTarget] = useState<FolderData | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [moveTarget, setMoveTarget] = useState<{
    type: "folder" | "file";
    id: string;
  } | null>(null);

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

  const navigateToFolder = useCallback((folderId: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (folderId) {
      params.set("folderId", folderId);
    } else {
      params.delete("folderId");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
    setCurrentFolderId(folderId);
    setCurrentFolderPath([]);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("verified") === "true") {
        toast.success("Email verified successfully! Welcome to FileStorage.");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
      const folderIdFromUrl = urlParams.get("folderId");
      if (folderIdFromUrl) {
        startTransition(() => {
          setCurrentFolderId(folderIdFromUrl);
        });
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const folderId = params.get("folderId");
      setCurrentFolderId(folderId);
      setCurrentFolderPath([]);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fetchContents = useCallback(async () => {
    if (!session?.user) return;
    setFilesLoading(true);
    try {
      if (activeTab === "own") {
        const params = new URLSearchParams();
        if (currentFolderId) {
          params.set("folderId", currentFolderId);
        }
        const qs = params.toString();
        const [contentsRes, breadcrumbRes, profRes] = await Promise.all([
          fetch(`/api/folders/contents${qs ? "?" + qs : ""}`),
          currentFolderId
            ? fetch(`/api/folders/${currentFolderId}/breadcrumb`)
            : Promise.resolve(null),
          fetch("/api/profile"),
        ]);

        if (contentsRes.ok) {
          const data = await contentsRes.json();
          setFolders(data.folders);
          setFiles(data.files);
          setSelectedFileIds([]);
        }

        if (breadcrumbRes && breadcrumbRes.ok) {
          setCurrentFolderPath(await breadcrumbRes.json());
        } else if (!currentFolderId) {
          setCurrentFolderPath([]);
        }

        if (profRes.ok) setProfileData(await profRes.json());
      } else {
        const [filesRes, profRes] = await Promise.all([
          fetch("/api/files?type=shared"),
          fetch("/api/profile"),
        ]);
        if (filesRes.ok) {
          setFiles(await filesRes.json());
          setFolders([]);
          setSelectedFileIds([]);
        }
        if (profRes.ok) setProfileData(await profRes.json());
      }
    } catch (err) {
      console.error("Error loading contents:", err);
    } finally {
      setFilesLoading(false);
    }
  }, [session, activeTab, currentFolderId]);

  useEffect(() => {
    startTransition(() => {
      fetchContents();
    });
  }, [fetchContents]);

  const handleUploadSuccess = useCallback(() => {
    setActiveTab("own");
    fetchContents();
  }, [fetchContents]);

  const handleToggleSelect = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );
  };

  const isAllSelected =
    files.length > 0 && files.every((f) => selectedFileIds.includes(f.id));

  const isSomeSelected = selectedFileIds.length > 0 && !isAllSelected;

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
      title:
        activeTab === "shared"
          ? `Remove ${count} File${count > 1 ? "s" : ""}`
          : `Delete ${count} File${count > 1 ? "s" : ""}`,
      message:
        activeTab === "shared"
          ? `Remove ${count} selected file${
              count > 1 ? "s" : ""
            } from your Shared tab?`
          : `Are you sure you want to delete ${count} selected file${
              count > 1 ? "s" : ""
            }? Storage quota will be released.`,
      confirmLabel:
        activeTab === "shared"
          ? `Remove ${count} File${count > 1 ? "s" : ""}`
          : `Delete ${count} File${count > 1 ? "s" : ""}`,
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/files/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileIds: selectedFileIds,
              context: activeTab,
            }),
          });

          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            showCustomAlert(
              "Error",
              d.error || "Failed to delete selected files",
              "danger",
            );
            return;
          }

          const result:
            | {
                deleted: string[];
                forbidden: string[];
                notFound: string[];
                failed: { id: string; reason: string }[];
              }
            | {
                removed: string[];
                owned: string[];
                notFound: string[];
                failed: { id: string; reason: string }[];
              } = await res.json();

          const successfulIds =
            "removed" in result ? result.removed : result.deleted;

          if (successfulIds.length > 0) {
            const skippedCount =
              ("forbidden" in result
                ? result.forbidden.length
                : result.owned.length) +
              result.notFound.length +
              result.failed.length;
            toast.success(
              skippedCount > 0
                ? `${successfulIds.length} ${
                    activeTab === "shared" ? "removed" : "deleted"
                  }, ${skippedCount} skipped`
                : `${successfulIds.length} file${
                    successfulIds.length > 1 ? "s" : ""
                  } ${
                    activeTab === "shared"
                      ? "removed from Shared"
                      : "deleted successfully"
                  }!`,
            );
            setSelectedFileIds((prev) =>
              prev.filter((id) => !successfulIds.includes(id)),
            );
            fetchContents();
          } else {
            showCustomAlert(
              "Error",
              activeTab === "shared"
                ? "No selected files were removed"
                : "No selected files were deleted",
              "danger",
            );
          }
        } catch {
          showCustomAlert(
            "Error",
            "An error occurred while deleting files",
            "danger",
          );
        }
      },
    });
  };

  const handleDeleteFile = async (fileId: string) => {
    setDialogState({
      isOpen: true,
      title: activeTab === "shared" ? "Remove File" : "Delete File",
      message:
        activeTab === "shared"
          ? "Remove this file from your Shared tab?"
          : "Are you sure you want to delete this file? Its storage quota will be released.",
      confirmLabel: activeTab === "shared" ? "Remove" : "Delete",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/files/${fileId}?context=${activeTab}`, {
            method: "DELETE",
          });
          if (res.ok) {
            if (activeTab === "shared") {
              const result: {
                removed: string[];
                owned: string[];
                notFound: string[];
                failed: { id: string; reason: string }[];
              } = await res.json();

              if (result.removed.length === 0) {
                showCustomAlert(
                  "Error",
                  result.failed[0]?.reason || "File was not removed",
                  "danger",
                );
                return;
              }
            }

            toast.success(
              activeTab === "shared"
                ? "File removed from Shared"
                : "File deleted successfully!",
            );
            setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
            fetchContents();
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

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    setDialogState({
      isOpen: true,
      title: "Delete Folder",
      message: `Are you sure you want to delete "${folder?.name || "this folder"}" and all its contents? This will permanently delete all files and subfolders inside it, and storage quota will be released.`,
      confirmLabel: "Delete Folder",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/folders/${folderId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            toast.success("Folder deleted successfully!");
            fetchContents();
          } else {
            const d = await res.json().catch(() => ({}));
            showCustomAlert("Error", d.error || "Delete failed", "danger");
          }
        } catch {
          showCustomAlert("Error", "An error occurred", "danger");
        }
      },
    });
  };

  const handleRenameFolder = (folder: FolderData) => {
    setRenameTarget(folder);
    setRenameValue(folder.name);
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const res = await fetch(`/api/folders/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        toast.success("Folder renamed!");
        setRenameTarget(null);
        fetchContents();
      } else {
        const d = await res.json().catch(() => ({}));
        showCustomAlert("Error", d.error || "Rename failed", "danger");
      }
    } catch {
      showCustomAlert("Error", "An error occurred", "danger");
    }
  };

  const handleMoveFolder = (folder: FolderData) => {
    setMoveTarget({ type: "folder", id: folder.id });
  };

  const handleMoveFile = (file: UploadedFile) => {
    setMoveTarget({ type: "file", id: file.id });
  };

  const submitMove = async (targetFolderId: string | null) => {
    if (!moveTarget) return;
    try {
      const url =
        moveTarget.type === "folder"
          ? `/api/folders/${moveTarget.id}/move`
          : `/api/files/${moveTarget.id}/move`;
      const body =
        moveTarget.type === "folder"
          ? { newParentFolderId: targetFolderId }
          : { targetFolderId };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(
          moveTarget.type === "folder"
            ? "Folder moved successfully!"
            : "File moved successfully!",
        );
        setMoveTarget(null);
        fetchContents();
      } else {
        const d = await res.json().catch(() => ({}));
        showCustomAlert("Error", d.error || "Move failed", "danger");
      }
    } catch {
      showCustomAlert("Error", "An error occurred", "danger");
    }
  };

  const allItems = [...folders, ...files];
  const totalItems = allItems.length;

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
                  label: "Admin",
                  onClick: () => router.push("/admin"),
                  variant: "primary",
                },
              ]
            : []
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

      <TourKickoffModal
        isOpen={showModal}
        title="Welcome to Vault!"
        description="Take a quick tour to learn how to upload, manage, and share your files."
        onStart={startTour}
        onSkip={dismissTour}
      />

      {/* Rename Inline Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-[#171717] mb-4">
              Rename Folder
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setRenameTarget(null);
              }}
              className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002FA7] focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-[#525252] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                disabled={!renameValue.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#002FA7] rounded-lg hover:bg-[#002482] transition-all cursor-pointer disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {moveTarget && (
        <MoveToDialog
          title={
            moveTarget.type === "folder"
              ? "Move Folder To..."
              : "Move File To..."
          }
          currentFolderId={currentFolderId}
          excludeFolderId={moveTarget.type === "folder" ? moveTarget.id : null}
          onSelect={submitMove}
          onClose={() => setMoveTarget(null)}
        />
      )}

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:px-10 md:py-8">
          {/* Page title row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <div className="w-full sm:w-72" data-tour="storage-bar">
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
                  onSuccess={handleUploadSuccess}
                  folderId={currentFolderId}
                />
              </SectionCard>
            </div>

            {/* Main: File List */}
            <div className="lg:col-span-2">
              <SectionCard
                title={
                  activeTab === "own"
                    ? currentFolderId
                      ? ""
                      : "My Files"
                    : "Shared with Me"
                }
                noPadding
                titleRight={
                  <div className="flex items-center gap-2">
                    {/* Breadcrumb (shown in own tab) */}
                    {activeTab === "own" && (
                      <BreadcrumbNav
                        items={currentFolderPath}
                        onNavigate={navigateToFolder}
                      />
                    )}
                    {/* Tab Toggle */}
                    <div
                      className="flex bg-[#F5F5F5] border border-[#E5E7EB] rounded-lg p-0.5"
                      data-tour="file-tabs"
                    >
                      {(["own", "shared"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setActiveTab(tab);
                            if (tab === "shared") {
                              navigateToFolder(null);
                            }
                          }}
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
                    {/* New Folder (own tab only) */}
                    {activeTab === "own" && (
                      <NewFolderInput
                        parentFolderId={currentFolderId}
                        onCreated={fetchContents}
                      />
                    )}
                    {/* Refresh */}
                    <button
                      onClick={() => fetchContents()}
                      className="p-1.5 rounded-lg text-[#737373] hover:text-[#002FA7] hover:bg-[rgba(0,47,167,0.06)] transition-all cursor-pointer"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                }
              >
                <div
                  className="min-h-[420px] flex flex-col"
                  data-tour="file-list"
                >
                  {/* Selection Toolbar Header */}
                  {!filesLoading && totalItems > 0 && (
                    <div className="flex flex-col gap-2 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs sm:flex-row sm:items-center sm:justify-between">
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
                        <span>Select All ({totalItems})</span>
                      </label>

                      {selectedFileIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2.5">
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
                            {activeTab === "shared"
                              ? "Remove Selected"
                              : "Delete Selected"}{" "}
                            ({selectedFileIds.length})
                          </button>
                          <button
                            onClick={() => setSelectedFileIds([])}
                            className="text-[#737373] hover:text-[#171717] font-medium underline cursor-pointer"
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
                  ) : totalItems === 0 ? (
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
                          ? "Upload a file from the panel on the left, or create a folder to get started."
                          : "Files shared with you by other users will appear here."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F5F5F5] px-2 py-2">
                      {activeTab === "own" &&
                        folders.map((folder) => (
                          <FolderListItem
                            key={folder.id}
                            folder={folder}
                            isSelected={selectedFileIds.includes(folder.id)}
                            onToggleSelect={handleToggleSelect}
                            onNavigate={(id) => navigateToFolder(id)}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            onMove={handleMoveFolder}
                          />
                        ))}
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
                          onDelete={handleDeleteFile}
                          onMove={
                            activeTab === "own" ? handleMoveFile : undefined
                          }
                          showDeleteAction={activeTab === "shared"}
                          deleteTitle={
                            activeTab === "shared" ? "Remove" : "Delete"
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  {!filesLoading && totalItems > 0 && (
                    <div className="px-4 py-3 border-t border-[#F5F5F5] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <span className="text-xs text-[#737373]">
                        {totalItems} item{totalItems !== 1 ? "s" : ""}
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
