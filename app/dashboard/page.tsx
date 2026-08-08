"use client";

import { useSession } from "@/app/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Spinner } from "@/app/components/shared/Spinner";
import { useAsyncAction } from "@/app/components/shared/use-async-action";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { FileListSkeleton } from "@/app/components/dashboard/FileListSkeleton";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { ShareModal } from "@/app/components/shared/ShareModal";
import { ConfirmationDialog } from "@/app/components/shared/ConfirmationDialog";
import { TourKickoffModal } from "@/app/components/shared/TourKickoffModal";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { FilePreviewModal } from "@/app/components/shared/FilePreviewModal";
import { FileListItem } from "@/app/components/dashboard/FileListItem";
import { FolderListItem } from "@/app/components/dashboard/FolderListItem";
import { UploadPanel } from "@/app/components/dashboard/UploadPanel";
import { BreadcrumbNav } from "@/app/components/dashboard/BreadcrumbNav";
import { NewFolderInput } from "@/app/components/dashboard/NewFolderInput";
import { MoveToDialog } from "@/app/components/dashboard/MoveToDialog";
import { QuotaStrip } from "@/app/components/dashboard/QuotaStrip";
import { SelectionToolbar } from "@/app/components/dashboard/SelectionToolbar";
import { FileTabToggle } from "@/app/components/dashboard/FileTabToggle";
import { RenameFolderDialog } from "@/app/components/dashboard/RenameFolderDialog";
import { ListFooter } from "@/app/components/dashboard/ListFooter";
import type {
  UploadedFile,
  FolderData,
  BreadcrumbItem,
  ProfileData,
} from "@/app/components/dashboard/types";
import { toast } from "sonner";
import { useProductTour } from "@/app/hooks/useProductTour";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";
import { useConfirmDialog } from "@/app/hooks/useConfirmDialog";
import { useFilePreview, useFileDownload } from "@/app/hooks/useFilePreview";

type BulkDeleteResponse =
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
    };

const PAGE_SIZE = 50;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);
  const { showModal, startTour, dismissTour } = useProductTour("dashboard");
  const { dialogState, confirm, alert: showAlert, close } = useConfirmDialog();
  const {
    previewFile,
    previewAllowDownload,
    open: openPreview,
    close: closePreview,
  } = useFilePreview<UploadedFile>();
  const handleDownload = useFileDownload(showAlert);
  const { pending: refreshPending, execute: executeRefresh } = useAsyncAction();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<"own" | "shared">("own");

  const currentFolderId = searchParams.get("folderId");
  const [currentFolderPath, setCurrentFolderPath] = useState<BreadcrumbItem[]>(
    [],
  );

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const [shareFile, setShareFile] = useState<UploadedFile | null>(null);

  const [renameTarget, setRenameTarget] = useState<FolderData | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [moveTarget, setMoveTarget] = useState<{
    type: "folder" | "file";
    id: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("verified") === "true") {
        toast.success("Email verified successfully! Welcome to FileStorage.");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/profile");
      if (res.ok) setProfileData(await res.json());
    } catch {
      /* ignore */
    }
  }, [session?.user?.id]);

  const fetchContents = useCallback(
    async (append = false) => {
      if (!session?.user) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const cursor = append ? nextCursorRef.current : null;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setFilesLoading(true);
        nextCursorRef.current = null;
        setNextCursor(null);
        setCurrentFolderPath([]);
      }
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (cursor) {
          params.set("cursor", cursor);
        }

        if (activeTab === "own") {
          if (currentFolderId) {
            params.set("folderId", currentFolderId);
          }
          const [contentsRes, breadcrumbRes] = await Promise.all([
            fetch(`/api/folders/contents?${params.toString()}`, {
              signal: controller.signal,
            }),
            currentFolderId
              ? fetch(`/api/folders/${currentFolderId}/breadcrumb`, {
                  signal: controller.signal,
                })
              : Promise.resolve(null),
          ]);

          if (contentsRes.ok) {
            const data = await contentsRes.json();
            if (append) {
              setFiles((prev) => [...prev, ...data.files]);
            } else {
              setFolders(data.folders);
              setFiles(data.files);
              setSelectedFileIds([]);
            }
            nextCursorRef.current = data.nextCursor;
            setNextCursor(data.nextCursor);
            setTotalItems(data.totalItems);
          } else {
            showAlert("Error", "Failed to load files", "danger");
          }

          if (breadcrumbRes && breadcrumbRes.ok) {
            setCurrentFolderPath(await breadcrumbRes.json());
          } else if (!currentFolderId) {
            setCurrentFolderPath([]);
          }
        } else {
          params.set("type", "shared");
          const filesRes = await fetch(`/api/files?${params.toString()}`, {
            signal: controller.signal,
          });
          if (filesRes.ok) {
            const data = await filesRes.json();
            if (append) {
              setFiles((prev) => [...prev, ...data.files]);
            } else {
              setFiles(data.files);
              setFolders([]);
              setSelectedFileIds([]);
            }
            nextCursorRef.current = data.nextCursor;
            setNextCursor(data.nextCursor);
            setTotalItems(data.totalItems);
          } else {
            showAlert("Error", "Failed to load shared files", "danger");
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error loading contents:", err);
        showAlert("Error", "Failed to load files", "danger");
      } finally {
        if (abortRef.current === controller) {
          setFilesLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [session, activeTab, currentFolderId, showAlert],
  );

  useEffect(() => {
    startTransition(() => {
      fetchContents();
      fetchProfile();
    });
  }, [fetchContents, fetchProfile]);

  const handleUploadSuccess = useCallback(() => {
    setActiveTab("own");
    fetchContents();
    fetchProfile();
  }, [fetchContents, fetchProfile]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) return;
    fetchContents(true);
  }, [fetchContents, nextCursor]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );
  }, []);

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
    const isShared = activeTab === "shared";

    confirm({
      title: isShared
        ? `Remove ${count} File${count > 1 ? "s" : ""}`
        : `Delete ${count} File${count > 1 ? "s" : ""}`,
      message: isShared
        ? `Remove ${count} selected file${count > 1 ? "s" : ""} from your Shared tab?`
        : `Are you sure you want to delete ${count} selected file${
            count > 1 ? "s" : ""
          }? Storage quota will be released.`,
      confirmLabel: isShared
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
            showAlert(
              "Error",
              d.error || "Failed to delete selected files",
              "danger",
            );
            return;
          }

          const result: BulkDeleteResponse = await res.json();

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
                    isShared ? "removed" : "deleted"
                  }, ${skippedCount} skipped`
                : `${successfulIds.length} file${
                    successfulIds.length > 1 ? "s" : ""
                  } ${
                    isShared ? "removed from Shared" : "deleted successfully"
                  }!`,
            );
            setSelectedFileIds((prev) =>
              prev.filter((id) => !successfulIds.includes(id)),
            );
            fetchContents();
            fetchProfile();
          } else {
            showAlert(
              "Error",
              isShared
                ? "No selected files were removed"
                : "No selected files were deleted",
              "danger",
            );
          }
        } catch {
          showAlert(
            "Error",
            "An error occurred while deleting files",
            "danger",
          );
        }
      },
    });
  };

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      const isShared = activeTab === "shared";
      confirm({
        title: isShared ? "Remove File" : "Delete File",
        message: isShared
          ? "Remove this file from your Shared tab?"
          : "Are you sure you want to delete this file? Its storage quota will be released.",
        confirmLabel: isShared ? "Remove" : "Delete",
        cancelLabel: "Cancel",
        type: "confirm",
        variant: "danger",
        onConfirm: async () => {
          try {
            const res = await fetch(
              `/api/files/${fileId}?context=${activeTab}`,
              {
                method: "DELETE",
              },
            );
            if (res.ok) {
              if (isShared) {
                const result: {
                  removed: string[];
                  owned: string[];
                  notFound: string[];
                  failed: { id: string; reason: string }[];
                } = await res.json();

                if (result.removed.length === 0) {
                  showAlert(
                    "Error",
                    result.failed[0]?.reason || "File was not removed",
                    "danger",
                  );
                  return;
                }
              }

              toast.success(
                isShared
                  ? "File removed from Shared"
                  : "File deleted successfully!",
              );
              setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
              fetchContents();
              fetchProfile();
            } else {
              const d = await res.json();
              showAlert("Error", d.error || "Delete failed", "danger");
            }
          } catch {
            showAlert("Error", "An error occurred while deleting", "danger");
          }
        },
      });
    },
    [activeTab, confirm, showAlert, fetchContents, fetchProfile],
  );

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    confirm({
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
            fetchProfile();
          } else {
            const d = await res.json().catch(() => ({}));
            showAlert("Error", d.error || "Delete failed", "danger");
          }
        } catch {
          showAlert("Error", "An error occurred", "danger");
        }
      },
    });
  };

  const handleRenameFolder = useCallback((folder: FolderData) => {
    setRenameTarget(folder);
    setRenameValue(folder.name);
  }, []);

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
        showAlert("Error", d.error || "Rename failed", "danger");
      }
    } catch {
      showAlert("Error", "An error occurred", "danger");
    }
  };

  const handleMoveFolder = useCallback((folder: FolderData) => {
    setMoveTarget({ type: "folder", id: folder.id });
  }, []);

  const handleMoveFile = useCallback((file: UploadedFile) => {
    setMoveTarget({ type: "file", id: file.id });
  }, []);

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
        showAlert("Error", d.error || "Move failed", "danger");
      }
    } catch {
      showAlert("Error", "An error occurred", "danger");
    }
  };

  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user) return <LoadingScreen message="Redirecting..." />;

  const { user } = session;

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        avatarUrl={user.image ?? null}
        isAdmin={user.role === "admin"}
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
          close();
        }}
        onCancel={close}
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
        <RenameFolderDialog
          folder={renameTarget}
          value={renameValue}
          onChange={setRenameValue}
          onSubmit={submitRename}
          onClose={() => setRenameTarget(null)}
        />
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
          excludeFolderIds={
            moveTarget.type === "folder" ? [moveTarget.id] : []
          }
          onSelect={submitMove}
          onClose={() => setMoveTarget(null)}
        />
      )}

      <main className="bg-[#FAFAFA] min-h-[calc(100dvh-80px)] lg:min-h-0 lg:h-[calc(100dvh-84px)] lg:overflow-hidden">
        <div className="mx-auto max-w-7xl h-full px-4 py-4 sm:px-6 md:px-10 md:py-5 flex flex-col gap-4 md:gap-5">
          <PageHeader
            title="My Storage"
            subtitle="Upload, manage and share your files"
          />

          {/* Quota strip */}
          {profileData && <QuotaStrip profileData={profileData} />}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:flex-1 lg:min-h-0">
            {/* Sidebar: Upload */}
            <div className="lg:col-span-1 h-[38vh] min-h-[280px] lg:h-full lg:min-h-0">
              <SectionCard
                title="Upload File"
                noPadding
                className="h-full flex flex-col"
                contentClassName="flex-1 min-h-0 flex flex-col p-4 sm:p-6"
              >
                <UploadPanel
                  onSuccess={handleUploadSuccess}
                  folderId={currentFolderId}
                />
              </SectionCard>
            </div>

            {/* Main: File List */}
            <div className="lg:col-span-2 h-[55vh] min-h-[360px] lg:h-full lg:min-h-0">
              <SectionCard
                title={activeTab === "own" ? "My Files" : "Shared with Me"}
                noPadding
                className="h-full flex flex-col"
                contentClassName="flex-1 min-h-0 flex flex-col"
                titleRight={
                  <div className="flex items-center gap-2">
                    {/* Tab Toggle */}
                    <FileTabToggle
                      activeTab={activeTab}
                      onChange={(tab) => {
                        setActiveTab(tab);
                        nextCursorRef.current = null;
                        setNextCursor(null);
                        if (tab === "shared") router.replace("/dashboard");
                      }}
                    />
                    {/* New Folder (own tab only) */}
                    {activeTab === "own" && (
                      <NewFolderInput
                        parentFolderId={currentFolderId}
                        onCreated={() => fetchContents()}
                      />
                    )}
                    {/* Refresh */}
                    <button
                      onClick={() =>
                        executeRefresh(async () => {
                          await Promise.all([fetchContents(), fetchProfile()]);
                        })
                      }
                      disabled={refreshPending}
                      className="p-1.5 rounded-lg text-[#737373] hover:text-[#002FA7] hover:bg-[rgba(0,47,167,0.06)] transition-all cursor-pointer disabled:opacity-60"
                      title="Refresh"
                    >
                      {refreshPending ? (
                        <Spinner size="sm" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                }
              >
                {/* Breadcrumb — separate row beneath header */}
                {activeTab === "own" && (
                  <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-[#FAFAFA] shrink-0">
                    <BreadcrumbNav items={currentFolderPath} />
                  </div>
                )}

                {/* Selection Toolbar Header */}
                {!filesLoading && totalItems > 0 && (
                  <SelectionToolbar
                    totalItems={files.length}
                    selectedCount={selectedFileIds.length}
                    isAllSelected={isAllSelected}
                    isSomeSelected={isSomeSelected}
                    activeTab={activeTab}
                    onToggleSelectAll={handleToggleSelectAll}
                    onBatchDelete={handleBatchDelete}
                    onClear={() => setSelectedFileIds([])}
                  />
                )}

                {/* Scrollable list area */}
                <div
                  className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain scroll-smooth"
                  data-tour="file-list"
                >
                  {filesLoading ? (
                    <FileListSkeleton />
                  ) : totalItems === 0 ? (
                    <EmptyState
                      icon={<FileText className="w-7 h-7 text-[#A3A3A3]" />}
                      title={
                        activeTab === "own" ? "No files yet" : "No shared files"
                      }
                      description={
                        activeTab === "own"
                          ? "Upload a file from the panel on the left, or create a folder to get started."
                          : "Files shared with you by other users will appear here."
                      }
                    />
                  ) : (
                    <div className="divide-y divide-[#F5F5F5] px-2 py-2">
                      {activeTab === "own" &&
                        folders.map((folder) => (
                          <FolderListItem
                            key={folder.id}
                            folder={folder}
                            isSelected={selectedFileIds.includes(folder.id)}
                            onToggleSelect={handleToggleSelect}
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
                          onPreview={openPreview}
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
                </div>

                {/* Footer */}
                {!filesLoading && totalItems > 0 && (
                  <ListFooter
                    totalItems={totalItems}
                    loadedItems={folders.length + files.length}
                    selectedCount={selectedFileIds.length}
                    hasMore={!!nextCursor}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={handleLoadMore}
                  />
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          allowDownload={previewAllowDownload}
          onDownload={handleDownload}
          onClose={closePreview}
        />
      )}

      {/* Share Modal */}
      {shareFile && (
        <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
