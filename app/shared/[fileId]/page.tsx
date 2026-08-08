"use client";

import { useSession } from "@/app/lib/auth-client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, FolderX } from "lucide-react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { FileIcon } from "@/app/components/dashboard/FileIcon";
import { FileAccessManager } from "@/app/components/shared/FileAccessManager";
import { formatBytes, formatDate } from "@/app/lib/utils";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";

interface FileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
}

function FileAccessContent() {
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);
  const params = useParams<{ fileId: string }>();
  const fileId = params.fileId;

  const [file, setFile] = useState<FileMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fileId) return;
    (async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`);
        if (!res.ok) {
          setError(
            res.status === 404
              ? "File not found"
              : res.status === 403
                ? "You don't have access to this file"
                : "Failed to load file",
          );
          return;
        }
        const data = await res.json();
        setFile(data.file);
      } catch {
        setError("Failed to load file");
      }
    })();
  }, [fileId]);

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
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:py-8">
          <Link
            href="/shared"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002FA7] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Shared Files
          </Link>

          {error ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl">
              <EmptyState
                icon={<FolderX className="w-7 h-7 text-[#A3A3A3]" />}
                title={error}
                action={
                  <Link
                    href="/shared"
                    className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Back to Shared Files
                  </Link>
                }
              />
            </div>
          ) : !file ? (
            <LoadingScreen message="Loading file..." />
          ) : (
            <>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <FileIcon mimeType={file.mimeType} className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-[#171717] truncate">
                    {file.originalName}
                  </h1>
                  <p className="text-xs text-[#737373] font-mono mt-0.5">
                    {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col">
                <FileAccessManager
                  file={{ id: file.id, originalName: file.originalName }}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function FileAccessPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading access page..." />}>
      <FileAccessContent />
    </Suspense>
  );
}
