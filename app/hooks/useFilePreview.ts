"use client";

import { useCallback, useState } from "react";

/**
 * Manages which file is open in the FilePreviewModal. The modal itself
 * fetches the preview URL, so pages only need to track the target file.
 */
export function useFilePreview<T extends { id: string }>() {
  const [file, setFile] = useState<T | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);

  const open = useCallback((next: T, allow = true) => {
    setAllowDownload(allow);
    setFile(next);
  }, []);

  const close = useCallback(() => setFile(null), []);

  return {
    previewFile: file,
    previewAllowDownload: allowDownload,
    open,
    close,
  };
}

/**
 * Shared download handler: fetches a presigned download URL and triggers
 * a browser download. Uses the provided alert callback for error reporting.
 */
export function useFileDownload(
  alert: (
    title: string,
    message: string,
    variant?: "danger" | "info" | "success",
  ) => void,
) {
  return useCallback(
    async (file: { id: string; originalName: string }) => {
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
          alert("Error", "Failed to get download URL", "danger");
        }
      } catch {
        alert("Error", "Error downloading file", "danger");
      }
    },
    [alert],
  );
}
