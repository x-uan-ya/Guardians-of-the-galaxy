/**
 * TitleScreen.tsx
 * ---------------
 * The TITLE phase: the game's front door. Branding, a start button, and (when
 * available) a "continue saved run" entry point. Pure presentational — it calls
 * the handlers it is given; the flow machine decides where they lead.
 */

import type { ReactElement } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface TitleScreenProps {
  /** Begin a brand-new playthrough (-> BRIEFING). */
  onStart: () => void;
  /** Resume a restored saved run, if one exists (-> PLAYING). */
  onContinue?: () => void;
  /** Whether a saved run is available to continue. */
  canContinue?: boolean;
}

export function TitleScreen({
  onStart,
  onContinue,
  canContinue = false,
}: TitleScreenProps): ReactElement {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-fade-in-up">
        {/* Emblem */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-mars-red to-mars-deep shadow-glow">
          <span className="text-4xl" aria-hidden>🛰️</span>
        </div>

        {/* Title */}
        <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          MARS<span className="text-mars-orange">:</span> OUTPOST ZERO
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-slate-400">
          Survival Mission Simulator
        </p>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-300">
          You are the sole operator of a fledgling Mars outpost. Balance power,
          water, food and oxygen, weather the crises, and survive until extraction.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button type="button" className="btn-primary w-56 justify-center" onClick={onStart}>
            <Play className="h-4 w-4" aria-hidden />
            {canContinue ? 'New Mission' : 'Start Mission'}
          </button>

          {canContinue && onContinue ? (
            <button type="button" className="btn-secondary w-56 justify-center" onClick={onContinue}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Continue Saved Run
            </button>
          ) : null}
        </div>

        <p className="mt-10 text-[10px] uppercase tracking-widest text-slate-600">
          Illustrative simulation · not real mission data
        </p>
      </div>
    </div>
  );
}
