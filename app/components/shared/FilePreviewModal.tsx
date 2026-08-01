"use client";

import { useEffect, useState, startTransition } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const PDFCanvasViewer = dynamic(
  () => import("@/app/components/shared/PDFCanvasViewer"),
  { ssr: false },
);

import { ModalShell } from "@/app/components/shared/ModalShell";
import { LoadingState } from "@/app/components/shared/LoadingState";
import { Download } from "lucide-react";

interface FilePreviewModalProps {
  file: { id: string; originalName: string; mimeType: string };
  /** Hide the Download action (e.g. group files without download permission) */
  allowDownload?: boolean;
  onDownload?: (file: { id: string; originalName: string }) => void;
  onClose: () => void;
}

export function FilePreviewModal({
  file,
  allowDownload = true,
  onDownload,
  onClose,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setPreviewUrl(null);
      setPreviewLoading(true);
    });
    fetch(`/api/files/${file.id}/download-url?download=false`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) setPreviewUrl(data.url);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  return (
    <ModalShell
      title={file.originalName}
      onClose={onClose}
      maxWidth="4xl"
      className="max-h-[calc(100vh-24px)] sm:max-h-[85vh] flex flex-col"
      containerClassName="z-[70] p-3 sm:p-4"
      headerActions={
        onDownload && allowDownload ? (
          <button
            onClick={() => onDownload(file)}
            className="bg-[#002FA7] hover:bg-[#002482] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        ) : null
      }
    >
      <div
        className={`flex-1 bg-[#FAFAFA] flex items-center justify-center min-h-[300px] max-h-[65vh] ${
          file.mimeType === "application/pdf"
            ? "overflow-hidden p-0"
            : "overflow-auto p-6"
        }`}
      >
        {previewLoading ? (
          <LoadingState label="Loading preview..." labelClassName="text-xs" />
        ) : previewUrl ? (
          <>
            {file.mimeType.startsWith("image/") && (
              <div
                className="flex items-center justify-center w-full h-full"
                style={{ aspectRatio: "800/600" }}
              >
                <Image
                  src={previewUrl}
                  alt={file.originalName}
                  width={800}
                  height={600}
                  unoptimized
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              </div>
            )}
            {file.mimeType.startsWith("video/") && (
              <div
                className="flex items-center justify-center w-full h-full"
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  width={800}
                  height={450}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              </div>
            )}
            {file.mimeType === "application/pdf" && (
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
    </ModalShell>
  );
}
