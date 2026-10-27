/**
 * ConfirmDialog.tsx
 * -----------------
 * A lightweight modal for confirming destructive actions (reset, discard the
 * current game to start a new one). Pure presentational + a couple of callbacks.
 * Rendered only when `open` is true. Closes on Escape and backdrop click.
 */

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="panel my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-warn" aria-hidden />
          <h3 id="confirm-title" className="text-base font-semibold text-slate-100">
            {title}
          </h3>
        </div>
        <p className="mb-5 text-sm text-slate-300">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
