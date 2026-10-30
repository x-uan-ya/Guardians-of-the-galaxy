/**
 * Debrief.tsx
 * -----------
 * Renders the mission debrief: headline outcome, net resource change, a
 * decision timeline, and the derived leadership profile. It only READS state
 * via debriefBuilder — it never rewrites history.
 */

import type { ReactElement } from 'react';
import { ClipboardList, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { buildDebriefSummary } from './debriefBuilder';
import { DecisionTimeline } from './timeline/DecisionTimeline';
import { LeadershipProfileCard } from '../leadership-profile/LeadershipProfileCard';
import { RESOURCE_LABELS } from '../dashboard/labels';
import { RESOURCE_KEYS, type GameState } from '../simulation/simulationTypes';
import { OutcomeAnalysis } from '../outcome-analysis/OutcomeAnalysis';
import { ComparisonPanel } from '../decision-comparison/ComparisonPanel';

interface DebriefProps {
  state: GameState;
}

export function Debrief({ state }: DebriefProps): ReactElement {
  const summary = buildDebriefSummary(state);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Headline */}
      <section className="panel p-5">
        <SectionHeader title="Mission Debrief" icon={ClipboardList} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Outcome" value={summary.finalStatus.toUpperCase()} />
          <Stat label="Score" value={String(Math.round(summary.finalScore))} />
          <Stat label="Sols Survived" value={String(summary.daysSurvived)} />
          <Stat label="Decisions" value={String(summary.totalDecisions)} />
        </div>
      </section>

      {/* Mission Outcome Analysis (Feature 3) */}
      <OutcomeAnalysis state={state} />

      {/* What If? Compare Decisions (Feature 6) */}
      <ComparisonPanel state={state} />

      {/* Net resource change */}
      <section className="panel p-5">
        <SectionHeader title="Net Resource Change" icon={TrendingUp} subtitle="Sum of recorded decision effects" />
        <div className="tnum grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RESOURCE_KEYS.map((key) => {
            const v = summary.netResourceChange[key];
            const tone = v > 0 ? 'text-status-ok' : v < 0 ? 'text-status-critical' : 'text-slate-300';
            return (
              <div key={key} className="rounded-md border border-space-600 bg-space-700/40 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{RESOURCE_LABELS[key]}</div>
                <div className={`text-lg font-semibold ${tone}`}>
                  {v >= 0 ? '+' : ''}
                  {v.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leadership profile */}
      <LeadershipProfileCard state={state} />

      {/* Enhanced decision timeline */}
      <DecisionTimeline state={state} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

