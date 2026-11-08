/**
 * EmergencyPanel.tsx
 * ------------------
 * The dramatic warning that appears on the mission tablet when the engine
 * raises an event (state.activeEvents).
 *
 * What is REAL (wired to the existing game):
 *   - the event title / description / severity   <- GameEvent from the catalog
 *   - every response button                      <- event.availableActions
 *   - the Mission Controller advice panel         <- useAdvice (read-only)
 *     "Accept recommendation" / "Override" are the player's own clicks
 *   - choosing a response calls onChoose -> useGameState().resolveActiveEvent
 *
 * What is a PLACEHOLDER (clearly labelled, does nothing):
 *   - the dashed "Conserve resources" card. The game has no such action yet, so
 *     we show where it would go instead of faking a game-state change.
 */

import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdvicePanel } from '../../ai-advisor/AdvicePanel';
import { decisionWithAdvice } from '../../ai-advisor/adviceSnapshot';
import { useAdvice } from '../../../hooks/useAdvice';
import { EventDescription } from '../../events/EventDescription';
import type { GameEvent } from '../../events/eventTypes';
import type { AdviceSnapshot, PlayerChoice } from '../../decisions/decisionTypes';
import type { GameState } from '../../simulation/simulationTypes';
import { EffectChips } from './EffectChips';

interface EmergencyPanelProps {
  state: GameState;
  event: GameEvent;
  /** How many OTHER unresolved events are waiting behind this one. */
  waiting: number;
  disabled: boolean;
  onChoose: (actionId: string, choice: PlayerChoice, advice?: AdviceSnapshot) => void;
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
  // Read-only advice for this event. The advisor never mutates state and never
  // chooses for the player: every response below is the player's own click.
  const { advice, loading } = useAdvice(state, event.id);

  // The history records what the advisor said and whether it was followed.
  const choose = (actionId: string): void => {
    const decision = decisionWithAdvice(advice, actionId);
    onChoose(actionId, decision.playerChoice, decision.advice);
  };

  const actionById = (actionId: string) => event.availableActions.find((a) => a.id === actionId);

  // Responses already shown inside the advice panel are not repeated below.
  const adviceIds = new Set(advice?.options.map((o) => o.actionId) ?? []);
  const remaining = event.availableActions.filter((a) => !adviceIds.has(a.id));

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

      {/* Mission Controller: recommends, explains the risk, and the player decides. */}
      <div className="mb-3">
        <AdvicePanel
          advice={advice}
          loading={loading}
          disabled={disabled}
          onAccept={() => advice && choose(advice.actionId)}
          onOverride={choose}
          renderExtra={(actionId) => {
            const action = actionById(actionId);
            return action ? <EffectChips action={action} /> : null;
          }}
        />
      </div>

      {!advice || remaining.length > 0 ? (
        <div className="mb-1.5 font-mono text-[10px] font-semibold tracking-widest text-slate-400">
          {advice ? 'MORE RESPONSES' : 'CHOOSE YOUR RESPONSE'}
        </div>
      ) : null}

      <div className="space-y-2">
        {(advice ? remaining : event.availableActions).map((action) => (
          <button
            key={action.id}
            type="button"
            className="bunker-action"
            disabled={disabled}
            onClick={() => choose(action.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-white">{action.label}</span>
            </div>
            <p className="text-[11px] leading-snug text-slate-300">{action.description}</p>
            <EffectChips action={action} />
          </button>
        ))}

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
