"use client";

import { Check, Info, TriangleAlert } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "alert" | "confirm";
  variant?: "danger" | "info" | "success";
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  type = "confirm",
  variant = "info",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isConfirm = type === "confirm";

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Dialog Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden animate-fade-in">
        {/* Body content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Variant Icon */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              isDanger
                ? "bg-red-50 text-red-500 border-red-100"
                : variant === "success"
                  ? "bg-green-50 text-green-500 border-green-100"
                  : "bg-blue-50 text-[#002FA7] border-blue-100"
            }`}
          >
            {isDanger ? (
              <TriangleAlert className="w-6 h-6" />
            ) : variant === "success" ? (
              <Check className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1.5 w-full">
            <h3 className="text-base font-bold text-[#171717]">{title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#FAFAFA] border-t border-[#E5E7EB] px-6 py-4 flex justify-end gap-3">
          {isConfirm && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#525252] hover:bg-neutral-50 transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/10"
                : "bg-[#002FA7] hover:bg-[#002482] shadow-[#002FA7]/10"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
