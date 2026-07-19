"use client";

import { useState, useEffect, use } from "react";
import { formatBytes } from "@/app/lib/utils";
import Image from "next/image";
import dynamic from "next/dynamic";

const PDFCanvasViewer = dynamic(
  () => import("@/app/components/shared/PDFCanvasViewer"),
  { ssr: false },
);

interface SharedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
}

export default function SharedFilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const unwrappedParams = use(params);
  const { token } = unwrappedParams;

  const [file, setFile] = useState<SharedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Permissions and URLs
  const [allowDownload, setAllowDownload] = useState(false);
  const [allowPreview, setAllowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const res = await fetch(`/api/s/${token}`);
        if (res.ok) {
          const data = await res.json();
          setFile(data.file);
          setAllowDownload(data.allowDownload);
          setAllowPreview(data.allowPreview);
          setDownloadUrl(data.downloadUrl);

          if (
            data.allowPreview &&
            data.previewUrl &&
            (data.file.mimeType.startsWith("image/") ||
              data.file.mimeType.startsWith("video/") ||
              data.file.mimeType === "application/pdf")
          ) {
            setPreviewUrl(data.previewUrl);
          }
        } else {
          const data = await res.json();
          setError(data.error || "Failed to load shared file");
        }
      } catch {
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchFileData();
  }, [token]);

  const handleDownload = () => {
    if (!file || !downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#171717] font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#3b6fe8] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-medium">
            Loading file details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    const isExpired = error === "Share link expired";
    const isInvalid = error === "Invalid share link";
    const title = isExpired
      ? "Share Link Expired"
      : isInvalid
        ? "Invalid Share Link"
        : "Access Denied";

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA] text-[#171717] font-sans p-6">
        <div className="bg-white border border-neutral-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
            <svg
              className="w-8 h-8"
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
          </div>
          <h1 className="text-xl font-bold text-[#171717]">{title}</h1>
          <p className="text-sm text-neutral-500">
            {isExpired
              ? "This share link has expired and is no longer available."
              : isInvalid
                ? "This link is invalid or has been removed."
                : error}
          </p>
        </div>
      </div>
    );
  }

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans p-6 md:p-12 flex flex-col items-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3b6fe8]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#002FA7]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10 flex flex-col items-center">
        <div className="text-center space-y-2 mb-8 mt-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
            Shared with You
          </h1>
          <p className="text-neutral-500 text-sm font-medium">
            Secure File Transfer via CloudStorage
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-neutral-200 rounded-2xl w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-8 border-b border-neutral-100 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <svg
                className="w-8 h-8 text-[#3b6fe8]"
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
            <div className="flex-1 text-center md:text-left overflow-hidden w-full">
              <h2
                className="text-xl font-bold text-[#171717] truncate"
                title={file.originalName}
              >
                {file.originalName}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2 text-sm font-mono text-neutral-500">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span className="truncate max-w-[150px]">{file.mimeType}</span>
              </div>
            </div>
            {allowDownload && downloadUrl && (
              <button
                onClick={handleDownload}
                className="bg-gradient-to-br from-[#3b6fe8] to-[#002FA7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(59,111,232,0.3)] shrink-0 w-full md:w-auto flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
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
            )}
          </div>

          {allowPreview &&
            (previewUrl ? (
              <div className="bg-neutral-50/50 min-h-[400px] flex items-center justify-center p-6 relative">
                {isImage && (
                  <Image
                    src={previewUrl}
                    alt={file.originalName}
                    width={1200}
                    height={800}
                    unoptimized
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm border border-neutral-200 select-none pointer-events-none"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
                {isVideo && (
                  <video
                    src={previewUrl}
                    controls
                    controlsList="nodownload"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm border border-neutral-200"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
                {isPdf && <PDFCanvasViewer key={previewUrl} url={previewUrl} />}
              </div>
            ) : (
              <div className="bg-neutral-50/50 py-16 flex flex-col items-center justify-center text-neutral-400 gap-3">
                <svg
                  className="w-12 h-12 text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <p className="text-sm font-medium">
                  Preview not available for this file type.
                </p>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
