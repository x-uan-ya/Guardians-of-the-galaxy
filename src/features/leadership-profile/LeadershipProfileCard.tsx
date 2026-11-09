/**
 * LeadershipProfileCard.tsx
 * -------------------------
 * Renders the Leadership Profile section for the Debrief page. Shows:
 *
 *  1. The assigned leadership profile title, icon, and explanation — or an
 *     "insufficient data" notice if the player has fewer than 3 decisions.
 *  2. Five progress bars showing the 0..100 score for each leadership trait.
 *
 * This component replaces the original three-bar Leadership Profile section.
 * It only READS state (via the scorer) and renders — it never mutates anything.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { UserRound } from 'lucide-react';
import type { GameState } from '../simulation/simulationTypes';
import { scoreLeadershipProfile } from './leadershipScorer';
import { LEADERSHIP_TRAITS, type LeadershipTrait } from './leadershipTypes';
import {
  PROFILE_DESCRIPTORS,
  INSUFFICIENT_DATA_MESSAGE,
  NO_PROFILE_MESSAGE,
} from './leadershipDescriptions';

interface LeadershipProfileCardProps {
  state: GameState;
}

/**
 * Colour classes for each trait's progress bar, chosen to be visually distinct
 * within the existing Mars palette. Uses Tailwind arbitrary-value bg colours
 * that complement the space theme without introducing new config entries.
 */
const TRAIT_BAR_COLOUR: Record<LeadershipTrait, string> = {
  riskTaker: 'bg-mars-red',
  survivor: 'bg-accent-blue',
  optimiser: 'bg-status-ok',
  humanitarian: 'bg-mars-orange',
  explorer: 'bg-accent-cyan',
};

export function LeadershipProfileCard({ state }: LeadershipProfileCardProps): ReactElement {
  const result = useMemo(() => scoreLeadershipProfile(state), [state]);

  const assigned = result.assignedTrait
    ? PROFILE_DESCRIPTORS[result.assignedTrait]
    : null;

  return (
    <section className="panel p-5">
      <SectionHeader
        title="Leadership Profile"
        icon={UserRound}
        subtitle="Derived from your decision patterns across the mission"
      />

      {/* Assigned profile or insufficient-data notice */}
      <div className="mb-4">
        {result.insufficientData ? (
          <p className="text-sm text-slate-400">{INSUFFICIENT_DATA_MESSAGE}</p>
        ) : assigned ? (
          <div className="flex items-start gap-3 rounded-md border border-space-600 bg-space-700/40 p-4">
            <assigned.icon
              className="mt-0.5 h-6 w-6 shrink-0 text-mars-orange"
              aria-hidden
            />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {assigned.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {assigned.description}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{NO_PROFILE_MESSAGE}</p>
        )}
      </div>

      {/* Five trait score bars */}
      <div className="space-y-3">
        {LEADERSHIP_TRAITS.map((trait) => {
          const descriptor = PROFILE_DESCRIPTORS[trait];
          const score = result.scores[trait];
          const isAssigned = trait === result.assignedTrait;

          return (
            <TraitBar
              key={trait}
              label={descriptor.barLabel}
              value={score}
              colourClass={TRAIT_BAR_COLOUR[trait]}
              highlighted={isAssigned}
            />
          );
        })}
      </div>

      {/* Decision count footer */}
      <p className="mt-3 text-xs text-slate-500">
        Based on {result.totalDecisions} recorded decision{result.totalDecisions !== 1 ? 's' : ''}.
      </p>
    </section>
  );
}

/** A single trait score bar with label, percentage, and colour. */
function TraitBar({
  label,
  value,
  colourClass,
  highlighted,
}: {
  label: string;
  value: number;
  colourClass: string;
  highlighted: boolean;
}): ReactElement {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={highlighted ? 'font-semibold text-slate-100' : 'text-slate-300'}>
          {label}
          {highlighted ? ' \u2605' : ''}
        </span>
        <span className="tnum text-slate-400">{Math.round(clamped)}%</span>
      </div>
      {/* Custom-coloured bar matching the trait, reusing the ProgressBar track style */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-space-600"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${colourClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
