"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";

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

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // We just want to see if the link is valid first, maybe get basic info.
    // The endpoint returns URL right away, but let's just fetch preview url by default.
    const fetchFileData = async () => {
      try {
        const res = await fetch(`/api/s/${token}?download=false`);
        if (res.ok) {
          const data = await res.json();
          setFile(data.file);
          // If it's an image/video/pdf, the URL is ready for preview
          if (
            data.file.mimeType.startsWith("image/") ||
            data.file.mimeType.startsWith("video/") ||
            data.file.mimeType === "application/pdf"
          ) {
            setPreviewUrl(data.url);
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

  const handleDownload = async () => {
    if (!file) return;
    try {
      const res = await fetch(`/api/s/${token}?download=true`);
      if (res.ok) {
        const data = await res.json();
        const a = document.createElement("a");
        a.href = data.url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(data.error || "Download not allowed");
      }
    } catch {
      alert("Error downloading file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-400 font-medium">
            Loading file details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white font-sans p-6">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-900/50">
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
          <h1 className="text-xl font-bold text-neutral-200">Access Denied</h1>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  function formatBytes(bytes: number | string) {
    const b = Number(bytes);
    if (b === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6 md:p-12 flex flex-col items-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10 flex flex-col items-center">
        <div className="text-center space-y-2 mb-8 mt-12">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Shared with You
          </h1>
          <p className="text-neutral-500 text-sm">
            Secure File Transfer via CloudStorage
          </p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-850 rounded-2xl w-full shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-neutral-800 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center shrink-0">
              <svg
                className="w-8 h-8 text-indigo-400"
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
                className="text-xl font-bold text-neutral-200 truncate"
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
            <button
              onClick={handleDownload}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 shrink-0 w-full md:w-auto flex items-center justify-center gap-2"
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
          </div>

          {previewUrl ? (
            <div className="bg-neutral-950 min-h-[400px] flex items-center justify-center p-6 relative">
              {isImage && (
                <Image
                  src={previewUrl}
                  alt={file.originalName}
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md border border-neutral-800"
                />
              )}
              {isVideo && (
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md border border-neutral-800"
                />
              )}
              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0 rounded-lg shadow-md"
                  title="PDF Preview"
                />
              )}
            </div>
          ) : (
            <div className="bg-neutral-950/50 py-16 flex flex-col items-center justify-center text-neutral-500 gap-3">
              <svg
                className="w-12 h-12 text-neutral-700"
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
              <p className="text-sm">
                Preview not available for this file type.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
