/**
 * ResupplyModal.tsx
 * -----------------
 * A celebratory pop-up shown when the one-time resupply drop arrives (Sol 15).
 * Compact and self-contained — it fits without scrolling. Pure presentational.
 */

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { RESUPPLY_AMOUNT } from '../simulation/simulationEngine';

interface ResupplyModalProps {
  /** The Sol the drop arrived on. */
  day: number;
  onClose: () => void;
}

const RESOURCES = [
  { icon: '⚡', label: 'Power' },
  { icon: '💧', label: 'Water' },
  { icon: '🍎', label: 'Food' },
  { icon: '🫁', label: 'Oxygen' },
] as const;

export function ResupplyModal({ day, onClose }: ResupplyModalProps): ReactElement {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resupply-title"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg border border-status-ok/50 bg-space-900/95 p-6 text-center shadow-2xl shadow-status-ok/20 animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-status-ok/15 ring-1 ring-status-ok/40">
            <Package className="h-7 w-7 text-status-ok" aria-hidden />
          </div>

          <h2 id="resupply-title" className="font-mono text-xl font-bold tracking-tight text-slate-100">
            RESUPPLY DELIVERED
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            The Sol {day} supply drop has landed. Reserves replenished.
          </p>

          {/* Resource boosts */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {RESOURCES.map((r) => (
              <div key={r.label} className="rounded-md border border-space-600 bg-space-800/60 p-2">
                <div className="text-lg" aria-hidden>{r.icon}</div>
                <div className="text-sm font-semibold text-status-ok">+{RESUPPLY_AMOUNT}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-400">{r.label}</div>
              </div>
            ))}
          </div>

          <button type="button" className="btn-primary mt-5 w-full justify-center" onClick={onClose} autoFocus>
            <X className="h-4 w-4" aria-hidden />
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
