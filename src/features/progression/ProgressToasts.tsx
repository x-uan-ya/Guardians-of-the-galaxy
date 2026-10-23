/**
 * ProgressToasts.tsx
 * ------------------
 * Brief "you earned something" notifications (a badge or a new rank). Shows
 * unseen ones, dismisses on its own after a few seconds.
 */

import { useEffect, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { ICONS } from './icons';
import type { ProgressionEvent } from './progressionEngine';

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 2;

interface ProgressToastsProps {
  events: ProgressionEvent[];
  onDismiss: () => void;
}

export function ProgressToasts({ events, onDismiss }: ProgressToastsProps): ReactElement | null {
  const unseen = events.filter((e) => !e.seen);
  const visible = unseen.slice(-MAX_VISIBLE);

  useEffect(() => {
    if (unseen.length === 0) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [unseen.length, onDismiss]);

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {visible.map((event) => {
        const Icon = ICONS[event.icon];
        return (
          <div
            key={event.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-mars-orange/50 bg-space-900 p-3 shadow-xl"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mars-orange/20 text-mars-orange">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-100">{event.title}</div>
              {event.detail ? <div className="text-xs text-slate-400">{event.detail}</div> : null}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mars-orange/60"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
