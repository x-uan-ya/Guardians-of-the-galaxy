/**
 * AstronautProfile.tsx
 * --------------------
 * A compact, flexible profile card for the mission tablet.
 *
 * GOOD NEWS: the occupation system already exists in this project
 * (features/mission/occupations.ts + state.character), so this card shows REAL
 * data, not mock data:
 *   - occupation, summary, strengths / weaknesses   <- OccupationDef
 *   - "specialised skill"                            <- occupation.passive
 *   - attributes (health, stamina, intelligence,
 *     strength, technical, medical)                  <- state.character.attributes
 *   - live health / morale / radiation               <- derived status
 *
 * If a teammate adds new attributes later, they appear automatically because we
 * loop over ATTRIBUTE_KEYS from the shared types.
 */

import type { ReactElement } from 'react';
import { Sparkles } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { getOccupation } from '../../mission/occupations';
import { OccupationAvatar } from '../../mission/OccupationAvatar';
import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type DerivedStatus,
  type GameState,
} from '../../simulation/simulationTypes';
import { CREW_LABELS } from '../labels';

interface AstronautProfileProps {
  state: GameState;
  derived: DerivedStatus;
}

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  health: 'Max health',
  intelligence: 'Intelligence',
  strength: 'Strength',
  stamina: 'Stamina',
  technical: 'Technical',
  medical: 'Medical',
};

/** The four attributes the brief asked for come first, the rest follow. */
const ATTRIBUTE_ORDER: readonly AttributeKey[] = [
  'stamina',
  'intelligence',
  'strength',
  ...ATTRIBUTE_KEYS.filter((k) => !['stamina', 'intelligence', 'strength'].includes(k)),
];

export function AstronautProfile({ state, derived }: AstronautProfileProps): ReactElement {
  const occ = getOccupation(state.character.occupation);
  const live = [
    { key: 'health', m: derived.crew.health },
    { key: 'morale', m: derived.crew.morale },
    { key: 'radiationExposure', m: derived.crew.radiationExposure },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <OccupationAvatar occupation={occ} size={84} pose="idle" />
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Occupation</div>
          <div className="text-base font-bold text-white">{occ.label}</div>
          <div className="text-[11px] leading-snug text-slate-400">{occ.summary}</div>
        </div>
      </div>

      {/* Live condition */}
      <div className="rounded-md border border-space-600 bg-space-800/60 p-2.5">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Live condition
        </div>
        <div className="space-y-1.5">
          {live.map(({ key, m }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[11px] text-slate-300">
                {CREW_LABELS[key].replace('Crew ', '')}
              </span>
              <div className="flex-1">
                <ProgressBar value={m.value} level={m.level} label={CREW_LABELS[key]} />
              </div>
              <span className="tnum w-9 text-right text-[11px] text-slate-200">{Math.round(m.value)}%</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Health reaching 0% or radiation reaching 100% ends the run.
        </p>
      </div>

      {/* Specialised skill */}
      <div className="flex items-start gap-1.5 rounded-md border border-accent-blue/30 bg-accent-blue/10 p-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" aria-hidden />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent-blue">
            Specialised skill
          </div>
          <div className="text-xs font-semibold text-slate-100">{occ.passive.name}</div>
          <div className="text-[11px] text-slate-300">{occ.passive.description}</div>
        </div>
      </div>

      {/* Attributes */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Attributes
        </div>
        <div className="space-y-1.5">
          {ATTRIBUTE_ORDER.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[11px] text-slate-300">{ATTRIBUTE_LABELS[key]}</span>
              <div className="flex-1">
                <ProgressBar value={state.character.attributes[key]} level="ok" label={ATTRIBUTE_LABELS[key]} />
              </div>
              <span className="tnum w-9 text-right text-[11px] text-slate-200">
                {state.character.attributes[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths / weaknesses */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-status-ok/30 bg-status-ok/5 p-2">
          <div className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-status-ok">Strengths</div>
          <ul className="list-inside list-disc space-y-0.5 text-slate-300">
            {occ.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-status-warn/30 bg-status-warn/5 p-2">
          <div className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-status-warn">Weaknesses</div>
          <ul className="list-inside list-disc space-y-0.5 text-slate-300">
            {occ.weaknesses.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
