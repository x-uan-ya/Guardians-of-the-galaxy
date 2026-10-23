/**
 * GameOver.tsx
 * ------------
 * A full-screen overlay shown when the player's character dies / the run fails.
 * It explains the cause, shows a short run summary, and offers two paths:
 *   - New Run:   go to occupation selection to pick a (possibly different) role.
 *   - Restart:   immediately start a fresh run with the SAME occupation.
 *
 * Pure presentational: it reads the final state and calls the handlers it is
 * given. It does not mutate state or run the engine.
 */

import type { ReactElement } from 'react';
import { RotateCcw, Rocket, Skull } from 'lucide-react';
import { getGameOverReason } from '../simulation/simulationEngine';
import { getOccupation } from './occupations';
import { OccupationAvatar } from './OccupationAvatar';
import type { GameState } from '../simulation/simulationTypes';

interface GameOverProps {
  state: GameState;
  /** Start a fresh run with the same occupation. */
  onRestartSame: () => void;
  /** Go to occupation selection for a new run. */
  onNewRun: () => void;
}

const REASON_TEXT: Record<ReturnType<typeof getGameOverReason>, string> = {
  'character-died': 'Your character succumbed to their injuries. Health reached zero.',
  'oxygen-depleted': 'The outpost ran out of breathable oxygen.',
  'radiation-lethal': 'Your character absorbed a lethal dose of radiation.',
  unknown: 'The mission failed.',
};

export function GameOver({ state, onRestartSame, onNewRun }: GameOverProps): ReactElement {
  const reason = getGameOverReason(state);
  const occupation = getOccupation(state.character.occupation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="panel w-full max-w-lg animate-fade-in-up p-6 text-center">
        <div className="relative mx-auto mb-4 w-fit">
          <OccupationAvatar occupation={occupation} size={84} still className="opacity-60 grayscale" />
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-status-critical/20 ring-1 ring-status-critical/50">
            <Skull className="h-4 w-4 text-status-critical" aria-hidden />
          </div>
        </div>

        <h2 id="gameover-title" className="font-mono text-2xl font-bold tracking-tight text-slate-100">
          MISSION FAILED
        </h2>
        <p className="mt-2 text-sm text-slate-300">{REASON_TEXT[reason]}</p>

        {/* Run summary */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-left">
          <Stat label="Occupation" value={occupation.label} />
          <Stat label="Sols Survived" value={String(state.day)} />
          <Stat label="Final Score" value={String(Math.round(state.mission.score))} />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={onRestartSame}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Restart as {occupation.label}
          </button>
          <button type="button" className="btn-secondary" onClick={onNewRun}>
            <Rocket className="h-4 w-4" aria-hidden />
            New Run (choose occupation)
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
