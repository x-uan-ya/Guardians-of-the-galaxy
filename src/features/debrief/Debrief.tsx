/**
 * Debrief.tsx
 * -----------
 * Renders the mission debrief: headline outcome, net resource change, a
 * decision timeline, and the derived leadership profile. It only READS state
 * via debriefBuilder — it never rewrites history.
 */

import type { ReactElement } from 'react';
import { ClipboardList, Radio, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ProgressBar } from '../../components/ui/ProgressBar';
import type { AdviceMode, PlayerChoice } from '../decisions/decisionTypes';
import { buildDebriefSummary } from './debriefBuilder';
import { RESOURCE_LABELS } from '../dashboard/labels';
import { RESOURCE_KEYS, type GameState } from '../simulation/simulationTypes';

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
      <section className="panel p-5">
        <SectionHeader title="Leadership Profile" subtitle="Derived from decision patterns (descriptive only)" />
        <div className="space-y-3">
          <ProfileBar label="Advisor Trust" value={summary.leadershipProfile.advisorTrust} />
          <ProfileBar label="Caution" value={summary.leadershipProfile.caution} />
          <ProfileBar label="Ambition" value={summary.leadershipProfile.ambition} />
        </div>
      </section>

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

      {/* Decision timeline */}
      <section className="panel p-5">
        <SectionHeader title="Decision Timeline" />
        {summary.timeline.length === 0 ? (
          <p className="text-sm text-slate-400">No decisions recorded yet. Play a few sols, then return here.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-space-600 pl-4">
            {summary.timeline.map((entry) => (
              <li key={entry.record.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-mars-orange" aria-hidden />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">{entry.actionLabel}</span>
                  <span className="tnum text-xs text-slate-400">Sol {entry.day}</span>
                </div>
                <p className="text-xs text-slate-400">{entry.explanation}</p>
                {entry.overrodeAdvisor ? (
                  <span className="mt-1 inline-block rounded bg-accent-blue/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-blue">
                    Overrode advisor
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
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

function ProfileBar({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="tnum text-slate-400">{Math.round(value)}%</span>
      </div>
      <ProgressBar value={value} level="ok" label={label} />
    </div>
  );
}
