"use client";

import { useCallback, useState } from "react";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "alert" | "confirm";
  variant?: "danger" | "info" | "success";
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "alert" | "confirm";
  variant?: "danger" | "info" | "success";
  onConfirm: () => void;
}

/**
 * Wraps the ConfirmationDialog state so callbacks are never stored inside
 * React state (avoids non-serializable state and stale closures).
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (options: ConfirmDialogOptions & { onConfirm: () => void }) => {
      setDialogState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        type: options.type,
        variant: options.variant,
        onConfirm: options.onConfirm,
      });
    },
    [],
  );

  const alert = useCallback(
    (
      title: string,
      message: string,
      variant: "danger" | "info" | "success" = "info",
    ) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmLabel: "OK",
        type: "alert",
        variant,
        onConfirm: () => {},
      });
    },
    [],
  );

  const close = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { dialogState, confirm, alert, close };
}
