/**
 * PauseScreen.tsx
 * ---------------
 * The PAUSED phase overlay. Freezes the mission with a simple resume / new-run
 * choice. Pure presentational. Resumes on Escape for convenience.
 */

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Pause, Play, Rocket } from 'lucide-react';

interface PauseScreenProps {
  onResume: () => void;
  onNewRun: () => void;
}

export function PauseScreen({ onResume, onNewRun }: PauseScreenProps): ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      onClick={onResume}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-space-500 bg-space-900/95 p-6 text-center shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-space-700 ring-1 ring-space-500">
          <Pause className="h-6 w-6 text-slate-200" aria-hidden />
        </div>
        <h2 id="pause-title" className="font-mono text-xl font-bold tracking-tight text-slate-100">
          PAUSED
        </h2>
        <p className="mt-1 text-sm text-slate-400">The mission is on hold.</p>

        <div className="mt-5 flex flex-col gap-2">
          <button type="button" className="btn-primary justify-center" onClick={onResume} autoFocus>
            <Play className="h-4 w-4" aria-hidden />
            Resume
          </button>
          <button type="button" className="btn-secondary justify-center" onClick={onNewRun}>
            <Rocket className="h-4 w-4" aria-hidden />
            New Run
          </button>
        </div>
      </div>
    </div>
  );
}
