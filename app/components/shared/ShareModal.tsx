"use client";

import { FileAccessManager } from "./FileAccessManager";

interface ShareModalProps {
  file?: { id: string; originalName: string };
  fileIds?: string[];
  selectAll?: boolean;
  sourceFolderId?: string | null;
  excludeIds?: string[];
  onClose: () => void;
}

export function ShareModal({
  file,
  fileIds,
  selectAll = false,
  sourceFolderId = null,
  excludeIds = [],
  onClose,
}: ShareModalProps) {
  const isBulk = !!fileIds && (fileIds.length > 0 || selectAll);
  const title = isBulk
    ? `Share ${selectAll ? "Selected" : fileIds!.length} File${
        selectAll || fileIds!.length > 1 ? "s" : ""
      }`
    : "Share File";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-2xl max-h-[calc(100vh-24px)] sm:max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#171717]">{title}</h3>
            <p className="text-sm text-[#737373] truncate max-w-[220px] sm:max-w-[300px]">
              {isBulk
                ? "Selected files will be shared with the same recipient"
                : file?.originalName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {isBulk ? (
          <FileAccessManager
            fileIds={fileIds!}
            selectAll={selectAll}
            sourceFolderId={sourceFolderId}
            excludeIds={excludeIds}
          />
        ) : (
          <FileAccessManager file={file!} />
        )}
      </div>
    </div>
  );
}
