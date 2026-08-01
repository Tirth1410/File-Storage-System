"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatBytes } from "@/app/lib/utils";
import { useUploadManager } from "@/app/hooks/useUploadManager";
import { UploadJob, UploadStatus } from "@/app/lib/upload-manager";
import { FileIcon } from "@/app/components/dashboard/FileIcon";
import { CloudUpload, X, RotateCcw, AlertCircle } from "lucide-react";

interface UploadPanelProps {
  onSuccess?: () => void;
  folderId?: string | null;
}

const ACTIVE_STATUSES: UploadStatus[] = [
  "preparing",
  "uploading",
  "completing",
];

const TERMINAL_STATUSES: UploadStatus[] = ["completed", "failed", "cancelled"];

export const UploadPanel = memo(function UploadPanel({
  onSuccess,
  folderId,
}: UploadPanelProps) {
  const {
    jobs,
    stats,
    addFiles,
    retryJob,
    cancelJob,
    cancelAll,
    removeJob,
    setOnBatchComplete,
  } = useUploadManager();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    setOnBatchComplete(() => {
      onSuccessRef.current?.();
    });
  }, [setOnBatchComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles, folderId);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles, folderId);
    }
  };

  const hasQueuedWork = stats.active > 0 || stats.waiting > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Dropzone — fixed */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-tour="upload-zone"
        className={`group block shrink-0 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all sm:p-6 ${
          isDragging
            ? "border-[#002FA7] bg-[rgba(0,47,167,0.06)] scale-[1.01]"
            : "border-[#E5E7EB] hover:border-[#002FA7]/40 hover:bg-[rgba(0,47,167,0.02)]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl flex items-center justify-center group-hover:border-[#002FA7]/30 group-hover:bg-[rgba(0,47,167,0.05)] transition-all">
            <CloudUpload className="w-6 h-6 text-[#737373] group-hover:text-[#002FA7] transition-colors" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-[#171717] block">
              Click to select or drag & drop files
            </span>
            <span className="text-xs text-[#737373] block text-balance">
              Multiple files, up to 3 uploads at once
            </span>
          </div>
        </div>
      </label>

      {/* Summary + Queue — only shown once there are uploads */}
      {jobs.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Summary header — fixed */}
          <div className="shrink-0 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Upload Queue
              </h3>
              <span className="text-xs font-medium text-[#737373] bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                {stats.total} file{stats.total !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasQueuedWork && (
                <button
                  onClick={cancelAll}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel All
                </button>
              )}
            </div>
          </div>

          {/* Overall progress — fixed */}
          <div className="shrink-0 space-y-1.5">
            <div className="flex flex-col gap-1 text-[11px] font-mono text-[#737373] sm:flex-row sm:justify-between">
              <span>
                Progress:{" "}
                <strong className="text-[#171717]">
                  {stats.overallProgress}%
                </strong>
              </span>
              <span>
                {stats.completed} Done • {stats.active} Active • {stats.waiting}{" "}
                Waiting
                {stats.failed > 0 && ` • ${stats.failed} Failed`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
                style={{ width: `${stats.overallProgress}%` }}
              />
            </div>
          </div>

          {/* Queue — the only scrollable region */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-2">
            {jobs.map((job) => (
              <UploadQueueRow
                key={job.id}
                job={job}
                onRetry={retryJob}
                onCancel={cancelJob}
                onRemove={removeJob}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function UploadQueueRow({
  job,
  onRetry,
  onCancel,
  onRemove,
}: {
  job: UploadJob;
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}) {
  const isActive = ACTIVE_STATUSES.includes(job.status);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D1D5DB] p-3 transition-colors">
      <div className="flex items-center gap-2.5">
        {/* File icon */}
        <div className="w-8 h-8 bg-[#F5F5F5] border border-[#E5E7EB] rounded-lg flex items-center justify-center shrink-0">
          <FileIcon mimeType={job.file.type} className="w-4 h-4" />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold text-[#171717] truncate"
            title={job.file.name}
          >
            {job.file.name}
          </p>
          <p className="text-[11px] text-[#737373] font-mono truncate">
            {formatBytes(job.file.size)}
            {(job.status === "preparing" || job.status === "completing") && (
              <>
                {" • "}
                {formatBytes(job.uploadedBytes)} / {formatBytes(job.totalBytes)}
              </>
            )}
            {job.status === "uploading" && (
              <>
                {" • "}
                {formatBytes(job.uploadedBytes)} / {formatBytes(job.totalBytes)}
                {" • "}
                {job.speedMBs.toFixed(2)} MB/s
                {" • ETA: "}
                {job.etaSeconds > 0 ? `${job.etaSeconds}s` : "finishing..."}
              </>
            )}
          </p>
        </div>

        {/* Status pill */}
        <StatusPill status={job.status} />

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {job.status === "waiting" && (
            <RowAction
              onClick={() => onCancel(job.id)}
              title="Remove from queue"
            >
              <X className="w-3.5 h-3.5" />
            </RowAction>
          )}
          {isActive && (
            <RowAction onClick={() => onCancel(job.id)} title="Cancel upload">
              <X className="w-3.5 h-3.5" />
            </RowAction>
          )}
          {(job.status === "failed" || job.status === "cancelled") && (
            <RowAction onClick={() => onRetry(job.id)} title="Retry upload">
              <RotateCcw className="w-3.5 h-3.5" />
            </RowAction>
          )}
          {TERMINAL_STATUSES.includes(job.status) && (
            <RowAction
              onClick={() => onRemove(job.id)}
              title="Remove from list"
            >
              <X className="w-3.5 h-3.5" />
            </RowAction>
          )}
        </div>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div className="mt-2 h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {job.status === "failed" && job.error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-px" />
          <p className="text-[11px] text-red-700 leading-snug break-words">
            {job.error}
          </p>
        </div>
      )}
    </div>
  );
}

function RowAction({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#737373] hover:text-[#171717] hover:bg-gray-200 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: UploadStatus }) {
  switch (status) {
    case "waiting":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
          Waiting
        </span>
      );
    case "preparing":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md animate-pulse">
          Preparing...
        </span>
      );
    case "uploading":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-[#002FA7] border border-[#002FA7]/20 rounded-md">
          Uploading
        </span>
      );
    case "completing":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md animate-pulse">
          Finalizing...
        </span>
      );
    case "completed":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md">
          Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded-md">
          Cancelled
        </span>
      );
  }
}
