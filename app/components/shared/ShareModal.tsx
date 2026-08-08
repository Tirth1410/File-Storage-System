"use client";

import { FileAccessManager } from "./FileAccessManager";

interface ShareModalProps {
  file: { id: string; originalName: string };
  onClose: () => void;
}

export function ShareModal({ file, onClose }: ShareModalProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-2xl max-h-[calc(100vh-24px)] sm:max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#171717]">Share File</h3>
            <p className="text-sm text-[#737373] truncate max-w-[220px] sm:max-w-[300px]">
              {file.originalName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <FileAccessManager file={file} />
      </div>
    </div>
  );
}
