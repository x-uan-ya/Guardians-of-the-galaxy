/**
 * Debrief.tsx
 * -----------
 * Renders the mission debrief: headline outcome, net resource change, a
 * decision timeline, and the derived leadership profile. It only READS state
 * via debriefBuilder — it never rewrites history.
 */

import type { ReactElement } from 'react';
import { ClipboardList, Radio, Rocket, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { AdviceMode, PlayerChoice } from '../decisions/decisionTypes';
import { buildDebriefSummary } from './debriefBuilder';
import { DecisionTimeline } from './timeline/DecisionTimeline';
import { LeadershipProfileCard } from '../leadership-profile/LeadershipProfileCard';
import { RESOURCE_LABELS } from '../dashboard/labels';
import { RESOURCE_KEYS, type GameState } from '../simulation/simulationTypes';
import { OutcomeAnalysis } from '../outcome-analysis/OutcomeAnalysis';
import { ComparisonPanel } from '../decision-comparison/ComparisonPanel';

const CHOICE_LABEL: Record<PlayerChoice, string> = {
  'accepted-recommendation': 'Accepted the recommendation',
  'overrode-recommendation': 'Overrode the recommendation',
  'self-directed': 'Decided without advice',
};

const MODE_LABEL: Record<AdviceMode, string> = {
  rules: 'rule-based',
  ai: 'AI advisor',
  fallback: 'Mission Safety Protocol',
};

interface DebriefProps {
  state: GameState;
  /** When provided, a "Play Again" CTA is shown at the bottom of the debrief. */
  onPlayAgain?: () => void;
}

export function Debrief({ state, onPlayAgain }: DebriefProps): ReactElement {
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

      {/* AI advisor history: what it recommended, what you decided, what happened. */}
      <section className="panel p-5" aria-label="AI advisor history">
        <SectionHeader
          title="AI Advisor History"
          icon={Radio}
          subtitle="The advisor recommends. You decide. Here is how it went."
        />
        <div className="tnum mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Followed advice" value={String(summary.advisor.stats.accepted)} />
          <Stat label="Overrode advice" value={String(summary.advisor.stats.overridden)} />
          <Stat label="Decided alone" value={String(summary.advisor.stats.selfDirected)} />
          <Stat label="Safety Protocol" value={String(summary.advisor.stats.fallbackAdvice)} />
        </div>
        {summary.advisor.entries.length === 0 ? (
          <p className="text-sm text-slate-400">No decisions yet, so there is no advisor history.</p>
        ) : (
          <ul className="space-y-3">
            {summary.advisor.entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-space-600 bg-space-700/40 p-3 text-sm"
                data-choice={entry.playerChoice}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">You chose: {entry.actionLabel}</span>
                  <span className="tnum text-xs text-slate-400">Sol {entry.day}</span>
                </div>
                <span className="mt-1 inline-block rounded bg-accent-blue/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-blue">
                  {CHOICE_LABEL[entry.playerChoice]}
                </span>
                {entry.advice ? (
                  <dl className="mt-2 space-y-1 text-xs text-slate-300">
                    <div>
                      <dt className="inline font-semibold text-slate-100">Advisor recommended: </dt>
                      <dd className="inline">
                        {entry.advice.recommendedLabel} ({entry.advice.confidence} confidence,{' '}
                        {MODE_LABEL[entry.advice.mode]})
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-100">Reason: </dt>
                      <dd className="inline">{entry.advice.reason}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-100">Risk noted: </dt>
                      <dd className="inline">{entry.advice.risk}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No advisor recommendation was recorded for this decision.</p>
                )}
                {entry.outcomeSummary ? (
                  <p className="mt-1 text-xs text-slate-300">
                    <span className="font-semibold text-slate-100">Outcome: </span>
                    {entry.outcomeSummary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Enhanced decision timeline */}
      <DecisionTimeline state={state} />

      {/* Play Again CTA — only rendered when the mission has ended */}
      {onPlayAgain ? (
        <section className="panel p-6 text-center">
          <p className="mb-4 text-sm text-slate-300">
            Ready to take on Mars again? Choose a new occupation and start a fresh mission.
          </p>
          <button type="button" className="btn-primary" onClick={onPlayAgain}>
            <Rocket className="h-4 w-4" aria-hidden />
            Play Again
          </button>
        </section>
      ) : null}
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

