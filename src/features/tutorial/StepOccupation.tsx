/**
 * StepOccupation.tsx
 * ------------------
 * Tutorial Step 3 — "Choose Your Occupation"
 *
 * INTEGRATES with the existing occupation system by importing from
 * features/mission/occupations.ts. This is a PREVIEW only — the real selection
 * happens later in MissionSetup.tsx during the SETUP phase (unchanged).
 *
 * Players can click each occupation card to reveal attributes, passive ability,
 * strengths and weaknesses. This teaches them what the stats mean BEFORE they
 * need to make a blind choice.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { User } from 'lucide-react';
import { OCCUPATION_LIST } from '../mission/occupations';
import type { OccupationDef } from '../mission/occupations';
import { ATTRIBUTE_KEYS } from '../simulation/simulationTypes';
import { OccupationAvatar } from '../mission/OccupationAvatar';

/** Human-readable labels for the six attributes. */
const ATTR_LABELS: Record<string, string> = {
  health: 'Health',
  intelligence: 'Intelligence',
  strength: 'Strength',
  stamina: 'Stamina',
  technical: 'Technical',
  medical: 'Medical',
};

/** Colour for the attribute bar based on value. */
function attrColor(value: number): string {
  if (value >= 80) return 'bg-status-ok';
  if (value >= 60) return 'bg-accent-blue';
  if (value >= 45) return 'bg-status-warn';
  return 'bg-status-critical';
}

function OccupationDetail({ occ }: { occ: OccupationDef }): ReactElement {
  return (
    <div className="mt-3 space-y-3 tut-reveal">
      {/* Attributes */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Attributes
        </p>
        <div className="space-y-1.5">
          {ATTRIBUTE_KEYS.map((key) => {
            const value = occ.attributes[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 text-xs text-slate-400">{ATTR_LABELS[key]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-space-600">
                  <div
                    className={`tut-bar-fill tut-attr-bar h-full rounded-full ${attrColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs font-bold text-slate-300">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Passive ability */}
      <div className="rounded-md border border-mars-orange/30 bg-mars-orange/5 px-3 py-2">
        <p className="text-xs font-semibold text-mars-orange">{occ.passive.name}</p>
        <p className="mt-0.5 text-xs text-slate-300">{occ.passive.description}</p>
      </div>

      {/* Strengths and weaknesses */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-status-ok">
            Strengths
          </p>
          <ul className="space-y-0.5">
            {occ.strengths.map((s) => (
              <li key={s} className="text-xs text-slate-300">
                + {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-status-critical">
            Weaknesses
          </p>
          <ul className="space-y-0.5">
            {occ.weaknesses.map((w) => (
              <li key={w} className="text-xs text-slate-300">
                - {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface StepOccupationProps {
  direction: 'forward' | 'back';
}

export function StepOccupation({ direction }: StepOccupationProps): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={direction === 'forward' ? 'tut-step-enter' : 'tut-step-enter-back'}>
      <p className="mb-2 text-sm leading-relaxed text-slate-300">
        Your occupation determines your starting attributes and a unique passive ability that
        activates every Sol. No occupation is the best at everything — each has trade-offs.
      </p>
      <p className="mb-4 text-xs text-slate-400">
        <User className="mr-1 inline h-3 w-3" aria-hidden />
        Click any role below to preview its stats. You will make your real choice on the next screen.
      </p>

      {/* Occupation grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {OCCUPATION_LIST.map((occ) => {
          const isSelected = selectedId === occ.id;
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => setSelectedId(isSelected ? null : occ.id)}
              aria-expanded={isSelected}
              className={`tut-card-interactive flex flex-col items-center rounded-lg border p-3 text-center ${
                isSelected
                  ? 'border-mars-orange/60 bg-mars-red/10 ring-1 ring-mars-orange/40'
                  : 'border-space-600 bg-space-700/40'
              }`}
            >
              <OccupationAvatar occupation={occ} size={72} className="mb-1.5" />
              <span className="text-xs font-semibold text-slate-100">{occ.label}</span>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{occ.summary}</p>
            </button>
          );
        })}
      </div>

      {/* Expanded detail panel */}
      {selectedId ? (
        <div className="mt-4 rounded-lg border border-space-600 bg-space-800/60 p-4">
          <OccupationDetail occ={OCCUPATION_LIST.find((o) => o.id === selectedId)!} />
        </div>
      ) : null}

      {/* Key takeaway */}
      <div className="mt-5 rounded-md border border-accent-blue/30 bg-accent-blue/5 p-3">
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-accent-blue">Key takeaway:</span> Pick based on
          playstyle, not raw numbers. An Engineer keeps systems alive longer. A Botanist boosts food.
          A Commander steadies morale. There is no wrong answer — every occupation can survive.
        </p>
      </div>
    </div>
  );
}
