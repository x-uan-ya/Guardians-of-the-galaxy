/**
 * PersistenceBanner.tsx
 * ---------------------
 * A small dismissible banner that surfaces the latest persistence notice from
 * useGameState (restored / saved / failed / storage unavailable). Pure UI.
 */

import type { ReactElement } from 'react';
import { Info, X } from 'lucide-react';
import type { PersistenceNotice } from '../hooks/useGameState';

interface PersistenceBannerProps {
  notice: PersistenceNotice;
  onDismiss: () => void;
}

function describe(notice: PersistenceNotice): { text: string; tone: string } | null {
  switch (notice.kind) {
    case 'restored':
      return { text: 'Saved mission restored.', tone: 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue' };
    case 'saved':
      return { text: 'Mission saved to this browser.', tone: 'border-status-ok/40 bg-status-ok/10 text-status-ok' };
    case 'restore-failed':
      return {
        text: `Could not restore the saved game (${notice.reason}). Started a fresh mission; your old save was left untouched.`,
        tone: 'border-status-warn/40 bg-status-warn/10 text-status-warn',
      };
    case 'save-failed':
      return {
        text: `Save failed: ${notice.reason}`,
        tone: 'border-status-critical/40 bg-status-critical/10 text-status-critical',
      };
    case 'unavailable':
      return {
        text: 'Local storage is unavailable. The game still works, but progress will not be saved.',
        tone: 'border-status-warn/40 bg-status-warn/10 text-status-warn',
      };
    case 'idle':
    default:
      return null;
  }
}

export function PersistenceBanner({ notice, onDismiss }: PersistenceBannerProps): ReactElement | null {
  const info = describe(notice);
  if (!info) return null;

  return (
    <div className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${info.tone}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1">{info.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
