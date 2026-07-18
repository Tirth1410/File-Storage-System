"use client";

/**
 * UploadPanel — file picker + upload progress UI.
 * Self-contained: manages its own upload state internally but exposes
 * onSuccess so the parent can refresh the file list.
 */

import { useState, useRef } from "react";
import { formatBytes } from "@/app/lib/utils";
import { toast } from "sonner";

interface UploadProgress {
  filename: string;
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
}

interface UploadPanelProps {
  onSuccess: () => void;
}

export function UploadPanel({ onSuccess }: UploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadControllerRef = useRef<{
    active: boolean;
    uploadId?: string;
    objectKey?: string;
  }>({ active: false });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    uploadControllerRef.current = { active: true };

    const startTime = Date.now();
    let uploadId = "";
    let objectKey = "";

    try {
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
        const msg =
          errData.message || errData.error || "Failed to initiate upload";
        toast.error(msg);
        return;
      }

      const initData = await initRes.json();
      uploadId = initData.uploadId;
      objectKey = initData.objectKey;
      const partSizeBytes = initData.partSizeBytes;

      uploadControllerRef.current.uploadId = uploadId;
      uploadControllerRef.current.objectKey = objectKey;

      const totalParts = Math.ceil(selectedFile.size / partSizeBytes);
      const parts: { partNumber: number; etag: string }[] = [];
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

        const signRes = await fetch("/api/files/sign-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, objectKey, partNumber }),
        });
        if (!signRes.ok) throw new Error(`Failed to sign part ${partNumber}`);
        const { url } = await signRes.json();

        let attempts = 0;
        let etag = "";
        while (attempts < 3) {
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
            if (!rawEtag) throw new Error("ETag header missing");
            etag = rawEtag.replace(/"/g, "");
            break;
          } catch (err) {
            attempts++;
            if (attempts >= 3) throw err;
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          }
        }

        if (!uploadControllerRef.current.active) return;
        parts.push({ partNumber, etag });
        uploadedBytes += chunkSize;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
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
        if (activeUploads.length >= CONCURRENCY_LIMIT)
          await Promise.race(activeUploads);
        const p = uploadPart(partNumber).then(() => {
          activeUploads.splice(activeUploads.indexOf(p), 1);
        });
        activeUploads.push(p);
      }
      await Promise.all(activeUploads);

      if (!uploadControllerRef.current.active) return;

      const completeRes = await fetch("/api/files/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, objectKey, parts }),
      });
      if (!completeRes.ok) throw new Error("Failed to complete upload");

      toast.success("File uploaded successfully!");
      setSelectedFile(null);
      setProgress(null);
      onSuccess();
    } catch (err) {
      if (!uploadControllerRef.current.active) return;
      console.error("Upload error:", err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
      if (uploadId && objectKey && uploadControllerRef.current.active) {
        try {
          await fetch("/api/files/abort-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, objectKey }),
          });
        } catch {}
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
      } catch {}
    }
    toast.success("Upload cancelled.");
    setUploading(false);
    setProgress(null);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!uploading && (
        <div className="space-y-4">
          <label className="group block border-2 border-dashed border-[#E5E7EB] hover:border-[#002FA7]/40 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-[rgba(0,47,167,0.02)]">
            <input type="file" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl flex items-center justify-center group-hover:border-[#002FA7]/30 group-hover:bg-[rgba(0,47,167,0.05)] transition-all">
                <svg
                  className="w-6 h-6 text-[#737373] group-hover:text-[#002FA7] transition-colors"
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
              <span className="text-sm font-semibold text-[#525252]">
                {selectedFile ? "Change file" : "Select a file"}
              </span>
              <span className="text-xs text-[#737373]">
                Supports large files up to 1 GB via multipart upload
              </span>
            </div>
          </label>

          {/* Selected file preview */}
          {selectedFile && (
            <div className="bg-[#F5F5F5] p-4 rounded-xl border border-[#E5E7EB] space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="overflow-hidden">
                  <p
                    className="text-sm font-semibold text-[#171717] truncate"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[#737373] font-mono">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-[#737373] hover:text-[#171717] text-xs shrink-0"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={triggerUpload}
                className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20"
              >
                Start Upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress UI */}
      {uploading && progress && (
        <div className="bg-[#F5F5F5] p-5 rounded-xl border border-[#E5E7EB] space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[#171717] truncate max-w-[150px]">
              {progress.filename}
            </span>
            <span className="text-[#002FA7] font-bold">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#737373] font-mono">
            <div>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Uploaded
              </p>
              <p className="text-[#171717] font-medium">
                {formatBytes(progress.uploadedBytes)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Total
              </p>
              <p className="text-[#171717] font-medium">
                {formatBytes(progress.totalBytes)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Speed
              </p>
              <p className="text-[#171717] font-medium">
                {progress.speedMBs.toFixed(2)} MB/s
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                ETA
              </p>
              <p className="text-[#171717] font-medium">
                {progress.etaSeconds > 0
                  ? `${progress.etaSeconds}s`
                  : "finishing..."}
              </p>
            </div>
          </div>
          <button
            onClick={cancelUpload}
            className="w-full bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] text-[#DC2626] font-semibold py-2 rounded-xl text-xs transition-all hover:bg-[rgba(220,38,38,0.12)]"
          >
            Cancel Upload
          </button>
        </div>
      )}
    </div>
  );
}
