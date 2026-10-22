/**
 * TopBar.tsx
 * ----------
 * The mission-control header: branding, current day, mission status pill, and
 * the primary controls (advance day, save, new mission, reset). Buttons call
 * handlers passed down from App; this component holds no game logic.
 */

import type { ReactElement } from 'react';
import { FastForward, RotateCcw, Rocket, Save } from 'lucide-react';
import type { MissionStatus } from '../../features/simulation/simulationTypes';

interface TopBarProps {
  day: number;
  status: MissionStatus;
  score: number;
  storageAvailable: boolean;
  hasActiveEvents: boolean;
  onAdvanceDay: () => void;
  onSave: () => void;
  onNewMission: () => void;
  onReset: () => void;
  onLogoClick?: () => void;
}

const STATUS_STYLES: Record<MissionStatus, string> = {
  active: 'bg-status-ok/15 text-status-ok border-status-ok/40',
  critical: 'bg-status-critical/15 text-status-critical border-status-critical/40',
  completed: 'bg-accent-blue/15 text-accent-blue border-accent-blue/40',
  failed: 'bg-space-600 text-slate-300 border-space-500',
};

const STATUS_LABEL: Record<MissionStatus, string> = {
  active: 'Active',
  critical: 'Critical',
  completed: 'Completed',
  failed: 'Failed',
};

export function TopBar({
  day,
  status,
  score,
  storageAvailable,
  hasActiveEvents,
  onAdvanceDay,
  onSave,
  onNewMission,
  onReset,
  onLogoClick,
}: TopBarProps): ReactElement {
  const terminal = status === 'failed' || status === 'completed';
  const canAdvance = !terminal && !hasActiveEvents;

  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-space-600/80 bg-space-850/70 backdrop-blur-md">
      {/* Decorative scanline sweep across the header. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-scan-sweep
                   bg-gradient-to-r from-transparent via-mars-orange/10 to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        {/* Branding */}
        <button 
          onClick={onLogoClick}
          className="flex items-center gap-3 transition-opacity hover:opacity-80 cursor-pointer bg-transparent border-none p-0"
          title="Return to Mission Control"
        >
          <div className="flex h-9 w-9 animate-float items-center justify-center rounded-md bg-gradient-to-br from-mars-red to-mars-deep shadow-glow">
            <span className="text-lg" aria-hidden>🛰️</span>
          </div>
          <div className="leading-tight">
            <h1 className="font-mono text-base font-bold tracking-tight text-slate-100">
              MARS<span className="text-mars-orange">:</span> OUTPOST ZERO
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-400">Mission Control</p>
          </div>
        </button>

        {/* Day + status */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Sol</div>
            <div className="tnum font-mono text-lg font-semibold text-slate-100">{day}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Score</div>
            <div className="tnum font-mono text-lg font-semibold text-slate-100">{Math.round(score)}</div>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Controls */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            className="btn-primary flex-1 sm:flex-none"
            onClick={onAdvanceDay}
            disabled={!canAdvance}
            title={
              terminal 
                ? 'Mission has ended — start a new mission' 
                : hasActiveEvents
                ? 'Resolve the current event before advancing'
                : 'Advance the simulation by one day'
            }
          >
            <FastForward className="h-4 w-4" aria-hidden />
            Advance Day
          </button>
          <button type="button" className="btn-secondary" onClick={onSave} disabled={!storageAvailable}>
            <Save className="h-4 w-4" aria-hidden />
            Save
          </button>
          <button type="button" className="btn-secondary" onClick={onNewMission}>
            <Rocket className="h-4 w-4" aria-hidden />
            New
          </button>
          <button type="button" className="btn-ghost" onClick={onReset} title="Reset and clear the saved game">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}
