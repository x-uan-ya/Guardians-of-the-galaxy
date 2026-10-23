/**
 * Briefing.tsx
 * ------------
 * A short cinematic mission briefing shown before occupation selection.
 *
 * Flow:
 *   1. SOL 001 narrative text reveals line-by-line.
 *   2. Mission parameters (starting health / power / food / life support /
 *      radiation) appear.
 *   3. "Choose your occupation" advances to Mission Setup.
 *
 * Pure presentational. The parameter values are read from the documented
 * mission defaults so the briefing matches the real starting state. The exact
 * supply window (2–8 days) is rolled per run when the mission starts, so the
 * briefing shows the possible RANGE; the precise day appears on Mission Control.
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { ChevronRight, Rocket } from 'lucide-react';
import {
  DEFAULT_CREW,
  DEFAULT_SYSTEMS,
  STANDARD_RESOURCES,
} from './missionDefaults';
import { RESUPPLY_DAY } from '../simulation/simulationEngine';

interface BriefingProps {
  /** Advance to occupation selection. */
  onContinue: () => void;
}

/** The narrative lines, revealed one at a time. */
const NARRATIVE: string[] = [
  'Your spacecraft has successfully landed.',
  'The outpost is operational, but power reserves are below expected levels.',
  `Mission Control has scheduled a resupply drop for Sol ${RESUPPLY_DAY} — survive that long and reserves will be replenished.`,
];

interface Param {
  icon: string;
  label: string;
  value: number;
  unit: string;
}

const PARAMS: Param[] = [
  { icon: '❤️', label: 'Starting Health', value: DEFAULT_CREW.health, unit: '%' },
  { icon: '⚡', label: 'Power', value: STANDARD_RESOURCES.power, unit: '%' },
  { icon: '🍎', label: 'Food', value: STANDARD_RESOURCES.food, unit: '%' },
  { icon: '🫁', label: 'Life Support', value: DEFAULT_SYSTEMS.lifeSupportEfficiency, unit: '%' },
  { icon: '☢️', label: 'Radiation', value: DEFAULT_CREW.radiationExposure, unit: '%' },
];

export function Briefing({ onContinue }: BriefingProps): ReactElement {
  // Reveal narrative lines, then parameters, progressively.
  const [visibleLines, setVisibleLines] = useState(0);
  const [showParams, setShowParams] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Reveal each narrative line ~1s apart.
    NARRATIVE.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 700 + i * 1000));
    });
    // Then the parameters once the narrative is done.
    timers.push(setTimeout(() => setShowParams(true), 700 + NARRATIVE.length * 1000 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  /** Let impatient players skip the reveal animation. */
  const revealAll = (): void => {
    setVisibleLines(NARRATIVE.length);
    setShowParams(true);
  };

  const fullyRevealed = visibleLines >= NARRATIVE.length && showParams;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={fullyRevealed ? undefined : revealAll}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto">
        <div className="rounded-lg border border-mars-orange/40 bg-space-900/90 p-5 shadow-2xl shadow-mars-orange/10 sm:p-6">
          {/* SOL header */}
          <div className="mb-5 flex items-center justify-between border-b border-space-600/70 pb-3">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-mars-orange">
              SOL 001
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Mission Briefing
            </span>
          </div>

          {/* Narrative */}
          <div className="space-y-3">
            {NARRATIVE.map((line, i) => (
              <p
                key={line}
                className={`text-sm leading-relaxed text-slate-200 transition-all duration-700 ${
                  i < visibleLines ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-1'
                }`}
              >
                {line}
              </p>
            ))}
          </div>

          {/* Objective */}
          <div
            className={`mt-5 rounded-md border border-mars-red/40 bg-mars-red/10 p-3 transition-opacity duration-700 ${
              visibleLines >= NARRATIVE.length ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-mars-orange">
              Your Objective
            </div>
            <div className="mt-0.5 text-base font-semibold text-slate-100">
              Survive until extraction.
            </div>
          </div>

          {/* Mission parameters */}
          <div
            className={`mt-5 transition-all duration-700 ${
              showParams ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
            }`}
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Mission Parameters
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PARAMS.map((p) => (
                <div
                  key={p.label}
                  className="rounded-md border border-space-600 bg-space-800/60 p-2 text-center"
                >
                  <div className="text-lg" aria-hidden>{p.icon}</div>
                  <div className="tnum text-sm font-semibold text-slate-100">
                    {p.value}
                    <span className="text-[10px] text-slate-400">{p.unit}</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">{p.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Illustrative starting values, not real mission data.
            </p>
          </div>

          {/* Continue */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {!fullyRevealed ? (
              <button
                type="button"
                onClick={revealAll}
                className="text-xs text-slate-400 transition-colors hover:text-slate-200"
              >
                Skip
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">Next: choose your occupation.</span>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={onContinue}
              disabled={!fullyRevealed}
            >
              <Rocket className="h-4 w-4" aria-hidden />
              Choose your occupation
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
