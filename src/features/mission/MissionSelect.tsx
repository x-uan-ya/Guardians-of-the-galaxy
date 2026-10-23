/**
 * MissionSelect.tsx
 * -----------------
 * The MISSION_SELECT phase: the player picks a deployment site before choosing
 * an occupation. Each card shows the site's flavour conditions, a difficulty
 * badge, and a short summary of how it changes the simulation (derived from the
 * mission's typed modifiers). Pure presentational — it calls onSelect.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Rocket } from 'lucide-react';
import { MISSION_LIST } from './missions';
import type { MissionDef } from './missions';
import type { MissionType } from '../simulation/simulationTypes';

interface MissionSelectProps {
  /** Called with the chosen site when the player confirms. */
  onSelect: (missionType: MissionType) => void;
  /** Preselected site (defaults to the first). */
  current?: MissionType;
}

const DIFFICULTY_STYLES: Record<MissionDef['difficulty'], string> = {
  Moderate: 'bg-status-ok/15 text-status-ok border-status-ok/40',
  Hard: 'bg-status-warn/15 text-status-warn border-status-warn/40',
  Extreme: 'bg-status-critical/15 text-status-critical border-status-critical/40',
};

/** Turn a mission's modifiers into short human-readable effect lines. */
function effectLines(def: MissionDef): string[] {
  const m = def.modifiers;
  const lines: string[] = [];
  const pct = (factor: number): string => `${factor >= 1 ? '+' : '−'}${Math.round(Math.abs(1 - factor) * 100)}%`;

  if (m.powerGenerationFactor !== 1) lines.push(`Power generation ${pct(m.powerGenerationFactor)}`);
  if (m.solarFactor !== 1) lines.push(`Solar power ${pct(m.solarFactor)}`);
  if (m.foodProductionFactor !== 1) lines.push(`Food production ${pct(m.foodProductionFactor)}`);
  if (m.lifeSupportFactor !== 1) lines.push(`Life support ${pct(m.lifeSupportFactor)}`);
  if (m.radiationPerDay > 0) lines.push(`Radiation +${m.radiationPerDay}/sol`);
  if (m.startingResourceDelta !== 0)
    lines.push(`Starting reserves ${m.startingResourceDelta > 0 ? '+' : ''}${m.startingResourceDelta}`);
  if (m.noResupply) lines.push('No resupply drop');
  return lines;
}

export function MissionSelect({ onSelect, current }: MissionSelectProps): ReactElement {
  const [selected, setSelected] = useState<MissionType>(current ?? MISSION_LIST[0]!.id);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="w-full max-w-4xl">
        <div className="mb-5 text-center">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-100">
            Choose Your Mission
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Each site changes the odds. Pick where to make your stand, then choose your character.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {MISSION_LIST.map((mission) => {
            const isSelected = mission.id === selected;
            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => setSelected(mission.id)}
                aria-pressed={isSelected}
                className={`flex h-full flex-col rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-mars-orange/60 bg-space-800/80 ring-1 ring-mars-orange/40'
                    : 'border-space-600 bg-space-800/50 hover:bg-space-700/60'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl" aria-hidden style={{ color: mission.accent }}>
                    {mission.glyph}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[mission.difficulty]}`}
                  >
                    {mission.difficulty}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-100">{mission.label}</div>
                <p className="mt-0.5 text-xs text-slate-400">{mission.summary}</p>

                {/* Flavour conditions */}
                <ul className="mt-3 space-y-1">
                  {mission.conditions.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-xs text-slate-300">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: mission.accent }} />
                      {c}
                    </li>
                  ))}
                </ul>

                {/* Mechanical effects */}
                <div className="mt-3 border-t border-space-600/70 pt-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Simulation effects
                  </div>
                  <ul className="space-y-0.5">
                    {effectLines(mission).map((line) => (
                      <li key={line} className="font-mono text-[11px] text-mars-orange">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" className="btn-primary" onClick={() => onSelect(selected)}>
            <Rocket className="h-4 w-4" aria-hidden />
            Confirm Mission
          </button>
        </div>
      </div>
    </div>
  );
}
