/**
 * EmergencyPanel.tsx
 * ------------------
 * The dramatic warning that appears on the mission tablet when the engine
 * raises an event (state.activeEvents).
 *
 * What is REAL (wired to the existing game):
 *   - the event title / description / severity   <- GameEvent from the catalog
 *   - every response button                      <- event.availableActions
 *   - "Ask Mission Controller"                   <- defaultAdvisor.recommend(...)
 *     (the project's rule-based advisor; it only READS state)
 *   - choosing a response calls onChoose -> useGameState().resolveActiveEvent
 *
 * What is a PLACEHOLDER (clearly labelled, does nothing):
 *   - the dashed "Conserve resources" card. The game has no such action yet, so
 *     we show where it would go instead of faking a game-state change.
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import { defaultAdvisor } from '../../ai-advisor/advisorInterface';
import { EventDescription } from '../../events/EventDescription';
import type { GameEvent } from '../../events/eventTypes';
import type { PlayerChoice } from '../../decisions/decisionTypes';
import type { GameState } from '../../simulation/simulationTypes';
import { EffectChips } from './EffectChips';

interface EmergencyPanelProps {
  state: GameState;
  event: GameEvent;
  /** How many OTHER unresolved events are waiting behind this one. */
  waiting: number;
  disabled: boolean;
  onChoose: (actionId: string, choice: PlayerChoice) => void;
}

const SEVERITY_LABEL: Record<GameEvent['severity'], string> = {
  critical: 'CRITICAL EMERGENCY',
  major: 'MAJOR INCIDENT',
  minor: 'MINOR INCIDENT',
  info: 'NOTIFICATION',
};

export function EmergencyPanel({
  state,
  event,
  waiting,
  disabled,
  onChoose,
}: EmergencyPanelProps): ReactElement {
  // Has the player asked the Mission Controller yet? (UI-only memory.)
  const [advised, setAdvised] = useState(false);

  // Read-only call into the existing advisor. It never mutates state.
  const recommendation = useMemo(
    () => defaultAdvisor.recommend({ state, eventId: event.id }),
    [state, event.id]
  );

  // Be honest in the history: did the player follow, ignore, or not ask?
  const choiceFor = (actionId: string): PlayerChoice => {
    if (!advised || !recommendation) return 'self-directed';
    return recommendation.actionId === actionId ? 'accepted-recommendation' : 'overrode-recommendation';
  };

  const urgent = event.severity === 'critical' || event.severity === 'major';

  return (
    <section className="bunker-emergency p-3" role="alert" aria-live="assertive">
      <div className="mb-1 flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-red-300">
        <AlertTriangle className="h-4 w-4 animate-pulse-soft" aria-hidden />
        <span>{SEVERITY_LABEL[event.severity]}</span>
        {waiting > 0 ? (
          <span className="ml-auto rounded bg-red-500/20 px-1.5 py-px text-[10px] text-red-200">
            +{waiting} more waiting
          </span>
        ) : null}
      </div>

      <h3 className="mb-1.5 text-lg font-bold leading-tight text-white">
        WARNING: {event.title.replace(/^[^\w]+/, '')}
      </h3>
      <p className="mb-3 text-xs leading-relaxed text-red-100/90">
        <EventDescription eventId={event.id} description={event.description} />
      </p>

      {/* Mission Controller (the project's rule-based advisor, NOT a real AI yet). */}
      {advised ? (
        <div className="mb-3 rounded-md border border-accent-blue/40 bg-accent-blue/10 p-2">
          <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-blue">
            <Radio className="h-3 w-3" aria-hidden />
            Mission Controller (rule-based)
            {recommendation ? ` · ${recommendation.confidence} confidence` : ''}
          </div>
          <p className="text-xs text-slate-200">
            {recommendation
              ? recommendation.rationale
              : 'Mission Controller has no recommendation for this event.'}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdvised(true)}
          disabled={disabled}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border border-accent-blue/50 bg-accent-blue/10 px-3 py-1.5 text-xs font-semibold text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50"
        >
          <Radio className="h-3.5 w-3.5" aria-hidden />
          Ask Mission Controller for advice
        </button>
      )}

      <div className="mb-1.5 font-mono text-[10px] font-semibold tracking-widest text-slate-400">
        CHOOSE YOUR RESPONSE
      </div>

      <div className="space-y-2">
        {event.availableActions.map((action) => {
          const recommended = advised && recommendation?.actionId === action.id;
          return (
            <button
              key={action.id}
              type="button"
              className="bunker-action"
              disabled={disabled}
              onClick={() => onChoose(action.id, choiceFor(action.id))}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-white">{action.label}</span>
                {recommended ? (
                  <span className="shrink-0 rounded bg-accent-blue/20 px-1.5 py-px font-mono text-[10px] text-accent-blue">
                    ★ ADVISED
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] leading-snug text-slate-300">{action.description}</p>
              <EffectChips action={action} />
            </button>
          );
        })}

        {/* Clearly-labelled PROTOTYPE placeholder: not connected to the engine. */}
        {urgent ? (
          <div className="bunker-placeholder" aria-disabled="true">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-slate-400">Conserve resources</span>
              <span className="shrink-0 rounded border border-slate-500 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-slate-400">
                Prototype placeholder
              </span>
            </div>
            <p className="text-[11px] leading-snug text-slate-500">
              Not in the event system yet, so it cannot be chosen. It will not change the game.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
