"use client";

import { useEffect, useRef, useState } from "react";
import { formatBytes } from "@/app/lib/utils";
import { useUploadManager } from "@/app/hooks/useUploadManager";
import { UploadJob, UploadStatus } from "@/app/lib/upload-manager";

interface UploadPanelProps {
  onSuccess?: () => void;
}

export function UploadPanel({ onSuccess }: UploadPanelProps) {
  const {
    jobs,
    stats,
    addFiles,
    retryJob,
    cancelJob,
    cancelAll,
    clearCompleted,
    removeJob,
    setOnJobComplete,
  } = useUploadManager();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    setOnJobComplete(() => {
      onSuccessRef.current?.();
    });
  }, [setOnJobComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
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
      addFiles(droppedFiles);
    }
  };

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case "waiting":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
            Waiting
          </span>
        );
      case "preparing":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md animate-pulse">
            Preparing...
          </span>
        );
      case "uploading":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-[#002FA7] border border-[#002FA7]/20 rounded-md">
            Uploading
          </span>
        );
      case "completing":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md animate-pulse">
            Finalizing...
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md">
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded-md">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* File Dropzone */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
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
          <div className="space-y-1">
            <span className="text-sm font-semibold text-[#171717] block">
              Click to select or drag & drop files
            </span>
            <span className="text-xs text-[#737373] block">
              Supports multiple files with concurrent bounded queue (3 active worker uploads)
            </span>
          </div>
        </div>
      </label>

      {/* Batch Overview Header */}
      {stats.total > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Upload Queue
              </h3>
              <span className="text-xs font-medium text-[#737373] bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                {stats.total} file{stats.total !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(stats.active > 0 || stats.waiting > 0) && (
                <button
                  onClick={cancelAll}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel All
                </button>
              )}
              {stats.completed > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs font-semibold text-[#737373] hover:text-[#171717] bg-[#F5F5F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>

          {/* Batch Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-[#737373]">
              <span>
                Progress: <strong className="text-[#171717]">{stats.overallProgress}%</strong>
              </span>
              <span>
                {stats.completed} Done • {stats.active} Active • {stats.waiting} Waiting
                {stats.failed > 0 && ` • ${stats.failed} Failed`}
              </span>
            </div>
            <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#002FA7] transition-all duration-300 rounded-full"
                style={{ width: `${stats.overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Per-File Job List */}
      {jobs.length > 0 && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {jobs.map((job: UploadJob) => (
            <div
              key={job.id}
              className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] space-y-2.5 hover:border-[#D1D5DB] transition-all"
            >
              {/* Header row: name, size, badge, actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold text-[#171717] truncate"
                    title={job.file.name}
                  >
                    {job.file.name}
                  </p>
                  <p className="text-xs text-[#737373] font-mono">
                    {formatBytes(job.file.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(job.status)}

                  {/* Actions */}
                  {job.status === "waiting" && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Cancel waiting job"
                    >
                      Remove
                    </button>
                  )}

                  {(job.status === "preparing" ||
                    job.status === "uploading" ||
                    job.status === "completing") && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Cancel active upload"
                    >
                      Cancel
                    </button>
                  )}

                  {(job.status === "failed" || job.status === "cancelled") && (
                    <button
                      onClick={() => retryJob(job.id)}
                      className="text-xs text-[#002FA7] hover:text-[#002482] font-bold px-2 py-0.5 rounded hover:bg-[rgba(0,47,167,0.06)] border border-[#002FA7]/30 transition-colors"
                      title="Retry upload"
                    >
                      Retry
                    </button>
                  )}

                  {(job.status === "completed" ||
                    job.status === "failed" ||
                    job.status === "cancelled") && (
                    <button
                      onClick={() => removeJob(job.id)}
                      className="text-xs text-[#737373] hover:text-[#171717] p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar for active / completed */}
              {(job.status === "preparing" ||
                job.status === "uploading" ||
                job.status === "completing" ||
                job.status === "completed") && (
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        job.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-[#002FA7]"
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  {/* Active Stats: speed & ETA */}
                  {job.status === "uploading" && (
                    <div className="flex justify-between items-center text-[10px] text-[#737373] font-mono">
                      <span>
                        {formatBytes(job.uploadedBytes)} / {formatBytes(job.totalBytes)} ({job.progress}%)
                      </span>
                      <span>
                        {job.speedMBs.toFixed(2)} MB/s • ETA:{" "}
                        {job.etaSeconds > 0 ? `${job.etaSeconds}s` : "finishing..."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {job.status === "failed" && job.error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-0.5">
                  <p className="font-semibold">Error:</p>
                  <p className="font-mono text-[11px] break-all">{job.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
