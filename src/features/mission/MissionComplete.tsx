/**
 * MissionComplete.tsx
 * -------------------
 * The MISSION_COMPLETE phase overlay: shown when the character survives to
 * extraction (day 30). Celebrates the win, shows a short summary, and routes to
 * the Debrief or a new run. Pure presentational.
 */

import type { ReactElement } from 'react';
import { ClipboardList, PartyPopper, Rocket } from 'lucide-react';
import { getOccupation } from './occupations';
import type { GameState } from '../simulation/simulationTypes';

interface MissionCompleteProps {
  state: GameState;
  onViewDebrief: () => void;
  onNewRun: () => void;
}

export function MissionComplete({
  state,
  onViewDebrief,
  onNewRun,
}: MissionCompleteProps): ReactElement {
  const occupation = getOccupation(state.character.occupation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-status-ok/50 bg-space-900/95 p-6 text-center shadow-2xl shadow-status-ok/20 animate-fade-in-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-ok/15 ring-1 ring-status-ok/40">
          <PartyPopper className="h-7 w-7 text-status-ok" aria-hidden />
        </div>

        <h2 id="complete-title" className="font-mono text-2xl font-bold tracking-tight text-slate-100">
          MISSION COMPLETE
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Extraction reached. You survived all 30 sols and kept the outpost alive.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 text-left">
          <Stat label="Occupation" value={occupation.label} />
          <Stat label="Sols Survived" value={String(state.day)} />
          <Stat label="Final Score" value={String(Math.round(state.mission.score))} />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={onViewDebrief}>
            <ClipboardList className="h-4 w-4" aria-hidden />
            View Debrief
          </button>
          <button type="button" className="btn-secondary" onClick={onNewRun}>
            <Rocket className="h-4 w-4" aria-hidden />
            New Run
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
