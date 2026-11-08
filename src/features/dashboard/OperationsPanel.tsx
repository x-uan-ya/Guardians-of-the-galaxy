/**
 * OperationsPanel.tsx
 * -------------------
 * The interactive controls for day-to-day operations:
 *  - The Mission Controller's advice (recommended / alternative / risky), which
 *    the player can accept or override. The advisor only recommends.
 *  - Free actions (routine ops, ration, maintenance) as real buttons.
 *  - Any active events with their available actions and their own advice.
 *
 * Every button dispatches through the useGameState handlers passed in — this
 * component never mutates state directly.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Wrench } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAdvice } from '../../hooks/useAdvice';
import { AdviceAskButton } from '../ai-advisor/AdviceAskButton';
import { AdvicePanel } from '../ai-advisor/AdvicePanel';
import { decisionWithAdvice } from '../ai-advisor/adviceSnapshot';
import { getFreeActions } from '../simulation/simulationEngine';
import type { GameEvent } from '../events/eventTypes';
import type { GameState } from '../simulation/simulationTypes';
import type { DecisionInput } from '../decisions/decisionTypes';

interface OperationsPanelProps {
  state: GameState;
  onDecide: (input: DecisionInput) => void;
}

export function OperationsPanel({ state, onDecide }: OperationsPanelProps): ReactElement {
  const freeActions = getFreeActions();
  const terminal = state.mission.status === 'failed' || state.mission.status === 'completed';
  const eventBlocking = state.activeEvents.length > 0;

  // The advisor's current suggestion for free actions (only when no event is waiting).
  // Advice is optional: shown only after the player asks, and reset every Sol.
  const solKey = `${state.gameId}|${state.day}`;
  const [askedSol, setAskedSol] = useState<string | null>(null);
  const asked = askedSol === solKey;
  const { advice, loading } = useAdvice(state, undefined, {
    enabled: asked && !terminal && !eventBlocking,
  });

  const decideFree = (actionId: string): void => {
    const decision = decisionWithAdvice(advice, actionId);
    onDecide({
      actionId,
      playerChoice: decision.playerChoice,
      ...(decision.advice ? { advice: decision.advice } : {}),
    });
  };

  return (
    <section className="panel p-4">
      <SectionHeader title="Operations" icon={Wrench} subtitle="Daily actions and event responses" />

      {/* Mission Controller advice (only when asked) */}
      {advice ? (
        <div className="mb-4">
          <AdvicePanel
            advice={advice}
            loading={loading}
            disabled={terminal}
            onAccept={() => decideFree(advice.actionId)}
            onOverride={decideFree}
          />
        </div>
      ) : !asked && !terminal && !eventBlocking ? (
        <div className="mb-4">
          <AdviceAskButton onAsk={() => setAskedSol(solKey)} />
        </div>
      ) : null}

      {/* Free actions */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Routine Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {freeActions.map((action) => {
            const recommended = advice?.actionId === action.id;
            return (
              <button
                key={action.id}
                type="button"
                disabled={terminal || eventBlocking}
                onClick={() => decideFree(action.id)}
                className={`btn-secondary ${recommended ? 'ring-1 ring-accent-blue/60' : ''}`}
                title={
                  eventBlocking
                    ? 'Resolve the active event before taking a routine action.'
                    : action.description
                }
              >
                {action.label}
                {recommended ? <span className="text-accent-blue">★</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active events */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Active Events
        </h3>
        {state.activeEvents.length === 0 ? (
          <p className="text-sm text-slate-400">No active events. The outpost is stable for now.</p>
        ) : (
          <ul className="space-y-3">
            {state.activeEvents.map((event) => (
              <EventItem
                key={event.id}
                state={state}
                event={event}
                terminal={terminal}
                onDecide={onDecide}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventItem({
  state,
  event,
  terminal,
  onDecide,
}: {
  state: GameState;
  event: GameEvent;
  terminal: boolean;
  onDecide: (input: DecisionInput) => void;
}): ReactElement {
  const [asked, setAsked] = useState(false);
  const { advice, loading } = useAdvice(state, event.id, { enabled: asked && !terminal });

  const choose = (actionId: string): void => {
    const decision = decisionWithAdvice(advice, actionId);
    onDecide({
      eventId: event.id,
      actionId,
      playerChoice: decision.playerChoice,
      ...(decision.advice ? { advice: decision.advice } : {}),
    });
  };

  return (
    <li className="rounded-md border border-space-600 bg-space-700/50 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">{event.title}</span>
        <span className="text-[10px] uppercase tracking-wide text-mars-orange">{event.severity}</span>
      </div>
      <p className="mb-2 text-xs text-slate-400">{event.description}</p>

      {advice ? (
        <div className="mb-2">
          <AdvicePanel
            advice={advice}
            loading={loading}
            disabled={terminal}
            onAccept={() => choose(advice.actionId)}
            onOverride={choose}
          />
        </div>
      ) : !asked && !terminal ? (
        <div className="mb-2">
          <AdviceAskButton onAsk={() => setAsked(true)} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {event.availableActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={terminal}
            onClick={() => choose(action.id)}
            className="btn-secondary"
            title={action.description}
          >
            {action.label}
            {advice?.actionId === action.id ? <span className="text-accent-blue">★</span> : null}
          </button>
        ))}
      </div>
    </li>
  );
}