/**
 * MajorDecisionsPanel.tsx
 * ------------------------
 * Displays the most impactful player decisions and recorded consequences.
 * Ranked by absolute resource impact. Pure presentational.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, GitBranch, Waypoints } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { RESOURCE_LABELS } from '../dashboard/labels';
import { RESOURCE_KEYS } from '../simulation/simulationTypes';
import type { RankedDecision, RecordedConsequence } from './outcomeTypes';

interface MajorDecisionsPanelProps {
  rankedDecisions: RankedDecision[];
  recordedConsequences: RecordedConsequence[];
}

/** Show at most this many top decisions initially. */
const INITIAL_SHOW = 5;

export function MajorDecisionsPanel({
  rankedDecisions,
  recordedConsequences,
}: MajorDecisionsPanelProps): ReactElement {
  const [showAll, setShowAll] = useState(false);

  const topDecisions = showAll
    ? rankedDecisions
    : rankedDecisions.slice(0, INITIAL_SHOW);

  const firedConsequences = recordedConsequences.filter((c) => c.hasFired);
  const pendingConsequences = recordedConsequences.filter((c) => !c.hasFired);

  return (
    <section className="panel p-5 space-y-5">
      <SectionHeader
        title="Major Decisions"
        icon={GitBranch}
        subtitle={
          rankedDecisions.length > 0
            ? `${rankedDecisions.length} decision${rankedDecisions.length !== 1 ? 's' : ''} ranked by resource impact`
            : undefined
        }
      />

      {/* Ranked decisions */}
      {topDecisions.length === 0 ? (
        <p className="text-sm text-slate-400">No decisions recorded.</p>
      ) : (
        <ol className="space-y-2" aria-label="Decisions ranked by impact">
          {topDecisions.map((rd, idx) => (
            <DecisionCard key={rd.record.id} rank={idx + 1} decision={rd} />
          ))}
        </ol>
      )}

      {rankedDecisions.length > INITIAL_SHOW ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 text-xs text-mars-orange transition-colors hover:text-mars-orange/80"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              Show top {INITIAL_SHOW} only
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              Show all {rankedDecisions.length} decisions
            </>
          )}
        </button>
      ) : null}

      {/* Fired consequences */}
      {firedConsequences.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Waypoints className="h-3.5 w-3.5" aria-hidden />
            Consequences That Occurred
          </h3>
          <ul className="space-y-1.5" aria-label="Consequences that already occurred">
            {firedConsequences.map((c, i) => (
              <ConsequenceItem key={`fired-${i}`} consequence={c} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Pending consequences */}
      {pendingConsequences.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <AlertTriangle className="h-3.5 w-3.5 text-status-warn" aria-hidden />
            Pending Consequences
          </h3>
          <ul className="space-y-1.5" aria-label="Consequences still pending">
            {pendingConsequences.map((c, i) => (
              <ConsequenceItem key={`pending-${i}`} consequence={c} pending />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DecisionCard({
  rank,
  decision,
}: {
  rank: number;
  decision: RankedDecision;
}): ReactElement {
  const { record, absoluteImpact, netImpact, eventTitle } = decision;
  const netColor =
    netImpact > 0
      ? 'text-status-ok'
      : netImpact < 0
        ? 'text-status-critical'
        : 'text-slate-300';

  // Build a compact resource delta summary.
  const deltas = RESOURCE_KEYS
    .filter((k) => (record.resourceChanges[k] ?? 0) !== 0)
    .map((k) => {
      const v = record.resourceChanges[k]!;
      return `${RESOURCE_LABELS[k]} ${v >= 0 ? '+' : ''}${v.toFixed(0)}`;
    });

  return (
    <li className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-space-600 text-[10px] font-bold text-slate-300"
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-100">
              {record.actionLabel}
            </p>
            <span className="shrink-0 text-xs text-slate-500">Sol {record.day}</span>
          </div>

          {eventTitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              In response to: {eventTitle}
            </p>
          ) : null}

          <p className="mt-1 text-xs text-slate-300">{record.explanation}</p>

          {/* Resource deltas */}
          {deltas.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {deltas.map((d) => (
                <span
                  key={d}
                  className="rounded bg-space-600/80 px-1.5 py-0.5 text-[10px] text-slate-300 tnum"
                >
                  {d}
                </span>
              ))}
            </div>
          ) : null}

          {/* Impact summary */}
          <div className="mt-1.5 flex gap-3 text-[10px] text-slate-500">
            <span>
              Impact: <span className="tnum">{absoluteImpact.toFixed(0)}</span>
            </span>
            <span>
              Net:{' '}
              <span className={`tnum ${netColor}`}>
                {netImpact >= 0 ? '+' : ''}
                {netImpact.toFixed(0)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function ConsequenceItem({
  consequence,
  pending = false,
}: {
  consequence: RecordedConsequence;
  pending?: boolean;
}): ReactElement {
  return (
    <li
      className={`rounded-md border p-2.5 text-xs ${
        pending
          ? 'border-status-warn/30 bg-status-warn/5'
          : 'border-space-600 bg-space-700/40'
      }`}
    >
      <p className="text-slate-200">{consequence.description}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {pending ? 'Scheduled' : 'Occurred'} on Sol {consequence.scheduledDay}
        {' '}&middot;{' '}
        Caused by: {consequence.sourceDecision.actionLabel} (Sol{' '}
        {consequence.sourceDecision.day})
      </p>
    </li>
  );
}
