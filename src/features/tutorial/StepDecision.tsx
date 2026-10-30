/**
 * StepDecision.tsx
 * ----------------
 * Tutorial Step 4 — "Make Your First Decision"
 *
 * Presents the dust storm scenario with two choices. The player selects one
 * and immediately sees the outcome. They can switch between A and B at any
 * time — the outcome updates instantly. The parent disables "Next" until a
 * decision is selected, and passes the choice to Step 5 for consequence
 * analysis.
 *
 * No game state is mutated — purely illustrative.
 */

import type { ReactElement } from 'react';
import { AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { MOCK_SCENARIO } from './tutorialSteps';
import type { MockChoice } from './tutorialSteps';

interface StepDecisionProps {
  direction: 'forward' | 'back';
  /** The currently selected choice (null = nothing chosen yet). */
  chosen: MockChoice | null;
  /** Called when the player picks or switches a choice. */
  onChoose: (choice: MockChoice) => void;
}

export function StepDecision({ direction, chosen, onChoose }: StepDecisionProps): ReactElement {
  return (
    <div className={direction === 'forward' ? 'tut-step-enter' : 'tut-step-enter-back'}>
      <p className="mb-2 text-sm leading-relaxed text-slate-300">
        Every Sol you face decisions that affect your outpost. Some are routine, others are
        emergencies. Let's practice with a scenario.
      </p>
      <p className="mb-4 text-xs text-slate-400">
        Read both options below, then <span className="font-semibold text-mars-orange">choose Option A or Option B</span>.
        You can switch your choice at any time.
      </p>

      {/* Scenario card */}
      <div className="mb-4 rounded-lg border border-status-warn/40 bg-status-warn/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-warn" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-status-warn">
            Event
          </span>
        </div>
        <h3 className="text-base font-semibold text-slate-100">{MOCK_SCENARIO.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          {MOCK_SCENARIO.description}
        </p>
      </div>

      {/* Choices — always clickable, player can switch freely */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MOCK_SCENARIO.choices.map((choice, idx) => {
          const isChosen = chosen?.id === choice.id;
          const RiskIcon = choice.risk === 'low' ? ShieldCheck : Flame;
          const optionLabel = idx === 0 ? 'A' : 'B';

          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice)}
              aria-pressed={isChosen}
              className={`tut-card-interactive rounded-lg border p-4 text-left transition-all ${
                isChosen
                  ? 'border-mars-orange/60 bg-mars-red/15 ring-1 ring-mars-orange/40'
                  : 'border-space-600 bg-space-700/40'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-space-600 text-[10px] font-bold text-slate-300">
                    {optionLabel}
                  </span>
                  {choice.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    choice.risk === 'low'
                      ? 'border-status-ok/40 text-status-ok'
                      : 'border-status-critical/40 text-status-critical'
                  }`}
                >
                  <RiskIcon className="h-3 w-3" aria-hidden />
                  {choice.risk} risk
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{choice.description}</p>

              {/* Effect chips — always visible */}
              <div className="mt-2 flex flex-wrap gap-2">
                {choice.effects.map((eff) => (
                  <span
                    key={eff.resource}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono ${
                      eff.delta >= 0
                        ? 'border-status-ok/30 text-status-ok'
                        : 'border-status-critical/30 text-status-critical'
                    }`}
                  >
                    <span aria-hidden>{eff.icon}</span>
                    {eff.resource} {eff.delta >= 0 ? '+' : ''}
                    {eff.delta}%
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Outcome — shown immediately when a choice is selected */}
      {chosen ? (
        <div className="tut-reveal">
          <div
            className={`rounded-lg border p-4 ${
              chosen.risk === 'low'
                ? 'border-status-ok/40 bg-status-ok/5'
                : 'border-status-critical/40 bg-status-critical/5'
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Outcome — {chosen.label}
            </p>
            <p className="text-sm leading-relaxed text-slate-200">{chosen.outcome}</p>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {chosen.risk === 'low'
              ? 'The safe choice kept things stable — but you spent resources doing it.'
              : 'The risky choice paid off short-term but created a bigger problem. Decisions have consequences.'}
            <span className="ml-1 text-slate-500">Click the other option to compare.</span>
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-space-600 bg-space-800/40 p-4 text-center">
          <p className="text-xs text-slate-400">
            Select <span className="font-semibold text-mars-orange">Option A</span> or{' '}
            <span className="font-semibold text-mars-orange">Option B</span> above to see what
            happens.
          </p>
        </div>
      )}

      {/* Key takeaway */}
      <div className="mt-5 rounded-md border border-accent-blue/30 bg-accent-blue/5 p-3">
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-accent-blue">Key takeaway:</span> There are no free
          choices. Every option costs something and gains something. Read the effects carefully,
          weigh the risk, and think about what your outpost can afford to lose.
        </p>
      </div>
    </div>
  );
}
