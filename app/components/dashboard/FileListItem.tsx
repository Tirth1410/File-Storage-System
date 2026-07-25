"use client";

/**
 * FileListItem — renders a single row in the file list.
 */

import { formatBytes, formatDate } from "@/app/lib/utils";
import { FileIcon } from "./FileIcon";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
}

interface FileListItemProps {
  file: UploadedFile;
  currentUserId?: string;
  isSelected?: boolean;
  onToggleSelect?: (fileId: string) => void;
  onPreview: (file: UploadedFile) => void;
  onDownload: (file: UploadedFile) => void;
  onShare: (file: UploadedFile) => void;
  onDelete: (fileId: string) => void;
  showDeleteAction?: boolean;
  deleteTitle?: string;
}

export function FileListItem({
  file,
  currentUserId,
  isSelected = false,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  showDeleteAction = false,
  deleteTitle = "Delete",
}: FileListItemProps) {
  const isOwner = currentUserId === file.ownerUserId;
  const canShowDeleteAction = isOwner || showDeleteAction;
  const canPreview =
    file.mimeType.startsWith("image/") ||
    file.mimeType.startsWith("video/") ||
    file.mimeType === "application/pdf";

  return (
    <div
      className={`flex items-center justify-between py-3.5 px-4 rounded-xl transition-all border gap-4 ${
        isSelected
          ? "bg-[rgba(0,47,167,0.04)] border-[rgba(0,47,167,0.2)] shadow-sm"
          : "hover:bg-[#F5F5F5] border-transparent hover:border-[#E5E7EB]"
      }`}
    >
      {/* Selection Checkbox & File Info */}
      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(file.id)}
            className="w-4 h-4 rounded text-[#002FA7] border-[#D1D5DB] focus:ring-[#002FA7] cursor-pointer shrink-0 accent-[#002FA7]"
          />
        )}
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
          <div className="flex items-center gap-2 text-xs text-[#737373] font-mono mt-0.5">
            <span>{formatBytes(file.sizeBytes)}</span>
            <span>·</span>
            <span>{formatDate(file.createdAt)}</span>
            {!isOwner && (
              <>
                <span>·</span>
                <span className="text-[#002FA7] font-sans font-medium">
                  shared
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0" data-tour="file-actions">
        {canPreview && (
          <ActionButton
            onClick={() => onPreview(file)}
            title="Preview"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            }
          />
        )}
        <ActionButton
          onClick={() => onDownload(file)}
          title="Download"
          variant="primary"
          icon={
            <svg
              className="w-4 h-4"
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
          }
        />
        {isOwner && (
          <ActionButton
            onClick={() => onShare(file)}
            title="Share"
            variant="primary"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            }
          />
        )}
        {canShowDeleteAction && (
          <ActionButton
            onClick={() => onDelete(file.id)}
            title={deleteTitle}
            variant="danger"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}

/* ─── internal micro-component ─── */

interface ActionButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  variant?: "ghost" | "primary" | "danger";
}

function ActionButton({
  onClick,
  title,
  icon,
  variant = "ghost",
}: ActionButtonProps) {
  const cls = {
    ghost:
      "bg-white border border-[#E5E7EB] text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F5]",
    primary:
      "bg-[rgba(0,47,167,0.07)] border border-[rgba(0,47,167,0.15)] text-[#002FA7] hover:bg-[rgba(0,47,167,0.12)]",
    danger:
      "bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.15)] text-[#DC2626] hover:bg-[rgba(220,38,38,0.12)]",
  }[variant];

  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all cursor-pointer ${cls}`}
    >
      {icon}
    </button>
  );
}
