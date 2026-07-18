"use client";

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
              <svg
                className="w-6 h-6"
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
            ) : variant === "success" ? (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
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
