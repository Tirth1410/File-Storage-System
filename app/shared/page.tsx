"use client";

import { useSession } from "@/app/lib/auth-client";
import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
} from "react";
import Link from "next/link";
import { Share2, ChevronRight } from "lucide-react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { FileIcon } from "@/app/components/dashboard/FileIcon";
import { FileListSkeleton } from "@/app/components/dashboard/FileListSkeleton";
import { ListFooter } from "@/app/components/dashboard/ListFooter";
import { formatBytes, formatDate } from "@/app/lib/utils";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";

interface SharedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
  linkCount: number;
  userCount: number;
  groupCount: number;
  inviteCount: number;
}

const PAGE_SIZE = 50;

function SharedFilesContent() {
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState("");

  const fetchFiles = useCallback(async (append = false) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      if (append) {
        const cursor = nextCursorRef.current;
        if (cursor) params.set("cursor", cursor);
      }
      const res = await fetch(`/api/shared?${params.toString()}`);
      if (!res.ok) {
        setError("Failed to load shared files");
        return;
      }
      const data = await res.json();
      setFiles((prev) => (append ? [...prev, ...data.files] : data.files));
      nextCursorRef.current = data.nextCursor;
      setNextCursor(data.nextCursor);
      setTotalItems(data.totalItems);
    } catch {
      setError("Failed to load shared files");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => fetchFiles());
  }, [fetchFiles]);

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

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:px-10 md:py-8">
          <PageHeader
            title="Shared Files"
            subtitle={
              loading
                ? "Loading..."
                : `${totalItems} file${totalItems !== 1 ? "s" : ""} you've shared`
            }
          />

          {loading ? (
            <FileListSkeleton />
          ) : error ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-sm text-[#DC2626]">
              {error}
            </div>
          ) : totalItems === 0 ? (
            <EmptyState
              className="bg-white border border-[#E5E7EB] rounded-2xl py-24"
              icon={<Share2 className="w-7 h-7 text-[#A3A3A3]" />}
              title="You haven't shared any files yet"
              description="Share a file from the dashboard — links, users, and group shares will be listed here so you can manage access."
            />
          ) : (
            <>
              <div className="divide-y divide-[#F5F5F5] bg-white border border-[#E5E7EB] rounded-2xl">
                {files.map((file) => {
                  const chips = [
                    { n: file.linkCount, label: "link" },
                    { n: file.userCount, label: "user" },
                    { n: file.groupCount, label: "group" },
                    { n: file.inviteCount, label: "pending" },
                  ].filter((c) => c.n > 0);
                  return (
                    <div
                      key={file.id}
                      className="flex flex-col items-stretch justify-between py-3.5 px-3 rounded-xl gap-3 sm:flex-row sm:items-center sm:px-4 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                        <div className="w-10 h-10 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <FileIcon mimeType={file.mimeType} />
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <p
                            className="text-sm font-semibold text-[#171717] truncate"
                            title={file.originalName}
                          >
                            {file.originalName}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737373] font-mono mt-0.5">
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span>·</span>
                            <span>{formatDate(file.createdAt)}</span>
                            {chips.length > 0 && (
                              <span className="text-[#002FA7] font-sans font-medium">
                                {chips
                                  .map(
                                    (c) =>
                                      `${c.n} ${c.label}${
                                        c.n !== 1 ? "s" : ""
                                      }`,
                                  )
                                  .join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/shared/${file.id}`}
                        className="self-end shrink-0 flex items-center gap-1 text-xs font-semibold text-[#002FA7] border border-[rgba(0,47,167,0.15)] bg-[rgba(0,47,167,0.03)] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,47,167,0.08)] transition-all cursor-pointer sm:self-auto"
                      >
                        Manage Access <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
              <ListFooter
                totalItems={totalItems}
                loadedItems={files.length}
                selectedCount={0}
                hasMore={!!nextCursor}
                isLoadingMore={loadingMore}
                onLoadMore={() => {
                  setLoadingMore(true);
                  fetchFiles(true);
                }}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function SharedFilesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading shared files..." />}>
      <SharedFilesContent />
    </Suspense>
  );
}
