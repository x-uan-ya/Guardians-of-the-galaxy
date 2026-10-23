/**
 * CharacterPanel.tsx
 * ------------------
 * Shows the player's character during gameplay: occupation, unique ability,
 * live health (the stat that ends the run at 0), and the six attributes.
 *
 * Pure reader of state + derived status. It never mutates state.
 */

import type { ReactElement } from 'react';
import { Sparkles, UserRound } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { calculateDerivedStatus } from '../simulation/simulationEngine';
import { getOccupation } from '../mission/occupations';
import { OccupationAvatar } from '../mission/OccupationAvatar';
import { ATTRIBUTE_KEYS, type AttributeKey, type GameState } from '../simulation/simulationTypes';

interface CharacterPanelProps {
  state: GameState;
}

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  health: 'Health',
  intelligence: 'Intelligence',
  strength: 'Strength',
  stamina: 'Stamina',
  technical: 'Technical',
  medical: 'Medical',
};

export function CharacterPanel({ state }: CharacterPanelProps): ReactElement {
  const occ = getOccupation(state.character.occupation);
  const derived = calculateDerivedStatus(state);
  const health = derived.crew.health;

  const healthColor =
    health.level === 'critical'
      ? 'text-status-critical'
      : health.level === 'warn'
        ? 'text-status-warn'
        : 'text-slate-100';

  return (
    <section className="panel p-4">
      <SectionHeader title="Character" icon={UserRound} />

      {/* Portrait + identity */}
      <div className="mb-3 flex items-center gap-3">
        <OccupationAvatar occupation={occ} size={64} live />
        <div>
          <div className="text-sm font-semibold text-slate-100">{occ.label}</div>
          <div className="text-xs text-slate-400">{occ.summary}</div>
        </div>
      </div>

      {/* Live health — the stat that ends the run. */}
      <div className="mb-3 rounded-md border border-space-600 bg-space-700/40 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Live Health
          </span>
          <span className={`tnum text-lg font-semibold ${healthColor}`}>
            {Math.round(health.value)}
            <span className="ml-0.5 text-xs text-slate-400">%</span>
          </span>
        </div>
        <ProgressBar value={health.value} level={health.level} label="Live Health" />
        <p className="mt-1 text-[11px] text-slate-500">Reaching 0% ends the run.</p>
      </div>

      {/* Unique ability */}
      <div className="mb-3 flex items-start gap-1.5 rounded-md border border-accent-blue/25 bg-accent-blue/10 p-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" aria-hidden />
        <div>
          <div className="text-[11px] font-semibold text-accent-blue">{occ.passive.name}</div>
          <div className="text-[11px] text-slate-300">{occ.passive.description}</div>
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-1.5">
        {ATTRIBUTE_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
              {ATTRIBUTE_LABELS[key]}
            </span>
            <div className="flex-1">
              <ProgressBar
                value={state.character.attributes[key]}
                level="ok"
                label={ATTRIBUTE_LABELS[key]}
              />
            </div>
            <span className="tnum w-7 text-right text-[10px] text-slate-300">
              {state.character.attributes[key]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
