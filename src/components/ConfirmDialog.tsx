"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { button, errorText } from "@/lib/client/ui";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation before a permanent delete.
 * Uses the native modal dialog, which keeps focus inside it. Cancel has focus when it opens,
 * so pressing Enter never deletes anything by accident.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-lg font-semibold text-zinc-900">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-6 text-zinc-700">{children}</div>
      {error && (
        <p role="alert" className={`mt-3 ${errorText}`}>
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button ref={cancelRef} type="button" className={button.secondary} onClick={() => !busy && onCancel()}>
          Cancel
        </button>
        <button type="button" className={button.danger} aria-disabled={busy || undefined} onClick={() => !busy && onConfirm()}>
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
