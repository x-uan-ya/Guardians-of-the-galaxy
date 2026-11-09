/**
 * StepConsequences.tsx
 * --------------------
 * Tutorial Step 5 — "Learn From the Consequences"
 *
 * Continues the dust storm scenario from Step 4. Shows the actual option the
 * player selected, displays a Sol-by-Sol timeline of that choice's
 * consequences, explains what they learned about resource management and risk,
 * and keeps the scoring + risk-vs-reward explanations.
 *
 * All consequences are illustrative tutorial data — no real game state is
 * touched. If the player returns to Step 4 and changes their decision, this
 * step updates automatically.
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  ChevronLeft,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Rocket,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import type { MockChoice, TimelineEvent } from './tutorialSteps';

type TimelineType = TimelineEvent['type'];

const TYPE_STYLES: Record<TimelineType, { border: string; bg: string; text: string; icon: typeof Clock }> = {
  decision: { border: 'border-accent-blue/40', bg: 'bg-accent-blue/10', text: 'text-accent-blue', icon: Star },
  immediate: { border: 'border-mars-orange/40', bg: 'bg-mars-orange/10', text: 'text-mars-orange', icon: TrendingUp },
  delayed: { border: 'border-status-warn/40', bg: 'bg-status-warn/10', text: 'text-status-warn', icon: Clock },
  cascade: { border: 'border-status-critical/40', bg: 'bg-status-critical/10', text: 'text-status-critical', icon: AlertTriangle },
};

interface StepConsequencesProps {
  direction: 'forward' | 'back';
  /** The choice the player made in Step 4. Null should not happen (Next is
   *  disabled on Step 4 until a choice is made), but handled gracefully. */
  chosen: MockChoice | null;
}

export function StepConsequences({ direction, chosen }: StepConsequencesProps): ReactElement {
  const timeline = chosen?.timeline ?? [];
  const [revealedCount, setRevealedCount] = useState(1);

  // Reset the reveal counter when the choice changes (player went back to
  // Step 4 and picked a different option).
  useEffect(() => {
    setRevealedCount(1);
  }, [chosen?.id]);

  const revealNext = (): void => {
    setRevealedCount((c) => Math.min(c + 1, timeline.length));
  };

  const allRevealed = revealedCount >= timeline.length;

  // Fallback: if somehow reached without a choice (shouldn't happen).
  if (!chosen) {
    return (
      <div className={direction === 'forward' ? 'tut-step-enter' : 'tut-step-enter-back'}>
        <div className="rounded-lg border border-space-600 bg-space-800/40 p-6 text-center">
          <ChevronLeft className="mx-auto mb-2 h-6 w-6 text-slate-500" aria-hidden />
          <p className="text-sm text-slate-300">
            Go back to <span className="font-semibold text-mars-orange">Step 4</span> and make a
            decision first.
          </p>
        </div>
      </div>
    );
  }

  const RiskIcon = chosen.risk === 'low' ? ShieldCheck : Flame;

  return (
    <div className={direction === 'forward' ? 'tut-step-enter' : 'tut-step-enter-back'}>
      <p className="mb-4 text-sm leading-relaxed text-slate-300">
        Decisions don't just have immediate effects. Some consequences are{' '}
        <span className="font-semibold text-status-warn">delayed</span> — they appear Sols later,
        after you have already moved on. Let's trace what happens after your choice.
      </p>

      {/* Recap: which option the player chose */}
      <div
        className={`mb-4 rounded-lg border p-3 ${
          chosen.risk === 'low'
            ? 'border-status-ok/40 bg-status-ok/5'
            : 'border-status-critical/40 bg-status-critical/5'
        }`}
      >
        <div className="flex items-center gap-2">
          <RiskIcon
            className={`h-4 w-4 ${chosen.risk === 'low' ? 'text-status-ok' : 'text-status-critical'}`}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your decision
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
              chosen.risk === 'low'
                ? 'border-status-ok/40 text-status-ok'
                : 'border-status-critical/40 text-status-critical'
            }`}
          >
            {chosen.risk} risk
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-100">{chosen.label}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {chosen.effects.map((eff) => (
            <span
              key={eff.resource}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono ${
                eff.delta >= 0
                  ? 'border-status-ok/30 text-status-ok'
                  : 'border-status-critical/30 text-status-critical'
              }`}
            >
              <span aria-hidden>{eff.icon}</span>
              {eff.resource} {eff.delta >= 0 ? '+' : ''}{eff.delta}%
            </span>
          ))}
        </div>
      </div>

      {/* Sol-by-Sol consequence timeline */}
      <div className="mb-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sol-by-Sol consequences
          <span className="ml-1 font-normal normal-case text-slate-500">
            (illustrative tutorial data)
          </span>
          {!allRevealed ? (
            <span className="ml-2 font-normal normal-case text-slate-500">
              — click "Reveal next" to see the chain
            </span>
          ) : null}
        </p>

        <div className="space-y-0">
          {timeline.slice(0, revealedCount).map((event, i) => {
            const style = TYPE_STYLES[event.type];
            const Icon = style.icon;
            return (
              <div key={`${chosen.id}-${i}`} className="flex gap-3 tut-reveal">
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${style.border} ${style.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${style.text}`} aria-hidden />
                  </div>
                  {i < revealedCount - 1 || !allRevealed ? (
                    <div className="w-px flex-1 bg-space-600" style={{ minHeight: 24 }} />
                  ) : null}
                </div>

                {/* Content */}
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300">
                      Sol {event.sol}
                    </span>
                    <span className={`text-xs font-semibold ${style.text}`}>{event.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!allRevealed ? (
          <button
            type="button"
            onClick={revealNext}
            className="mt-1 text-xs font-medium text-mars-orange transition-colors hover:text-mars-dust"
          >
            Reveal next effect ({revealedCount}/{timeline.length})
          </button>
        ) : null}
      </div>

      {/* What you learned — choice-specific lesson */}
      {allRevealed ? (
        <div className="mb-4 rounded-lg border border-mars-orange/30 bg-mars-red/5 p-4 tut-reveal">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-mars-orange">
            What you learned
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{chosen.lesson}</p>
          <p className="mt-2 text-xs text-slate-400">
            Want to see the other outcome?{' '}
            <span className="text-slate-300">
              Go back to Step 4 and pick the other option — this page will update.
            </span>
          </p>
        </div>
      ) : null}

      {/* Scoring explanation (kept from original) */}
      <div className="mb-4 rounded-lg border border-space-600 bg-space-800/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Star className="h-4 w-4 text-mars-orange" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            How scoring works
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-status-ok" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-slate-200">Score goes up when...</p>
              <p className="text-xs text-slate-400">
                You keep resources stable, make good decisions, maintain crew health and morale, and
                advance research.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-slate-200">Score goes down when...</p>
              <p className="text-xs text-slate-400">
                Resources hit critical levels, crew health drops, morale craters, or systems
                degrade from neglect.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk vs. reward summary (kept from original) */}
      <div className="mb-4 rounded-lg border border-space-600 bg-space-800/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Risk vs. reward
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-status-ok/30 bg-status-ok/5 p-2">
            <p className="text-lg font-bold text-status-ok">Safe</p>
            <p className="text-[10px] text-slate-400">Small gains, small losses. Predictable.</p>
          </div>
          <div className="rounded-md border border-status-warn/30 bg-status-warn/5 p-2">
            <p className="text-lg font-bold text-status-warn">Moderate</p>
            <p className="text-[10px] text-slate-400">Balanced trade-off. Some uncertainty.</p>
          </div>
          <div className="rounded-md border border-status-critical/30 bg-status-critical/5 p-2">
            <p className="text-lg font-bold text-status-critical">Risky</p>
            <p className="text-[10px] text-slate-400">Big upside, big downside. Can cascade.</p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-lg border border-mars-orange/40 bg-gradient-to-br from-mars-red/10 to-mars-deep/10 p-4 text-center">
        <Rocket className="mx-auto mb-2 h-8 w-8 text-mars-orange" aria-hidden />
        <p className="text-sm font-semibold text-slate-100">You are ready for Mars.</p>
        <p className="mt-1 text-xs text-slate-400">
          Click "Begin Mission" to choose your deployment site and occupation, then launch your
          first run. Good luck, Operator.
        </p>
      </div>
    </div>
  );
}
