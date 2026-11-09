/**
 * ComparisonPanel.tsx
 * --------------------
 * The main "What If? Compare Decisions" section rendered inside the Debrief
 * page. Computes comparison data from GameState (via buildDecisionComparisons)
 * and renders a list of expandable ComparisonCards — one per event-based
 * decision in the player's history.
 *
 * Integrated into Debrief.tsx as a single component insertion. Does not modify
 * any teammate code, simulation engine, or existing debrief features.
 *
 * READ-ONLY: all data is derived from existing GameState and event catalog.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { GitCompareArrows } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { GameState } from '../simulation/simulationTypes';
import { buildDecisionComparisons } from './comparisonBuilder';
import { ComparisonCard } from './ComparisonCard';
import './comparison.css';

interface ComparisonPanelProps {
  state: GameState;
}

export function ComparisonPanel({ state }: ComparisonPanelProps): ReactElement {
  const comparisons = useMemo(() => buildDecisionComparisons(state), [state]);

  return (
    <section className="dc-panel panel p-5">
      <SectionHeader
        title="What If? Compare Decisions"
        icon={GitCompareArrows}
        subtitle={
          comparisons.length > 0
            ? `${comparisons.length} event decision${comparisons.length !== 1 ? 's' : ''} with alternatives · click any card to expand`
            : undefined
        }
      />

      {/* Methodology note */}
      <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
        Your recorded outcomes are shown alongside alternative actions from the
        event definitions. Alternative effects are the values defined in the
        event catalog — the same values the game engine would have applied — but
        they do not account for how later events or daily simulation would have
        unfolded differently. They are not predictions of the full alternative
        mission.
      </p>

      {comparisons.length === 0 ? (
        <p className="text-sm text-slate-400">
          No event-based decisions with alternatives were recorded. Play through
          some crisis events, then return here to compare your choices.
        </p>
      ) : (
        <div className="space-y-3">
          {comparisons.map((c) => (
            <ComparisonCard key={c.id} comparison={c} />
          ))}
        </div>
      )}
    </section>
  );
}
