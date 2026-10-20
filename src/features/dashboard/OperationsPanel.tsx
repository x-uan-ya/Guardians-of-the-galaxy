/**
 * OperationsPanel.tsx
 * -------------------
 * The interactive controls for day-to-day operations:
 *  - Free actions (routine ops, ration, maintenance) as real buttons.
 *  - Any active events with their available actions.
 *  - The rule-based advisor's current recommendation (clearly labelled), which
 *    the player can follow or ignore. The engine validates either way.
 *
 * Every button dispatches through the useGameState handlers passed in — this
 * component never mutates state directly.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Lightbulb, Wrench } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { defaultAdvisor } from '../ai-advisor/advisorInterface';
import { getFreeActions } from '../simulation/simulationEngine';
import type { GameState } from '../simulation/simulationTypes';
import type { DecisionInput, PlayerChoice } from '../decisions/decisionTypes';

interface OperationsPanelProps {
  state: GameState;
  onDecide: (input: DecisionInput) => void;
}

export function OperationsPanel({ state, onDecide }: OperationsPanelProps): ReactElement {
  const freeActions = getFreeActions();
  const terminal = state.mission.status === 'failed' || state.mission.status === 'completed';

  // The advisor's current suggestion for free actions (no event selected).
  const recommendation = useMemo(
    () => (terminal ? null : defaultAdvisor.recommend({ state })),
    [state, terminal]
  );

  const choiceFor = (actionId: string): PlayerChoice => {
    if (!recommendation) return 'self-directed';
    return recommendation.actionId === actionId
      ? 'accepted-recommendation'
      : 'overrode-recommendation';
  };

  return (
    <section className="panel p-4">
      <SectionHeader title="Operations" icon={Wrench} subtitle="Daily actions and event responses" />

      {/* Advisor recommendation */}
      {recommendation ? (
        <div className="mb-4 rounded-md border border-accent-blue/30 bg-accent-blue/10 p-3">
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent-blue" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-blue">
              Mission Controller (rule-based) · {recommendation.confidence} confidence
            </span>
          </div>
          <p className="text-xs text-slate-300">{recommendation.rationale}</p>
        </div>
      ) : null}

      {/* Free actions */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Routine Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {freeActions.map((action) => {
            const recommended = recommendation?.actionId === action.id;
            return (
              <button
                key={action.id}
                type="button"
                disabled={terminal}
                onClick={() =>
                  onDecide({ actionId: action.id, playerChoice: choiceFor(action.id) })
                }
                className={`btn-secondary ${recommended ? 'ring-1 ring-accent-blue/60' : ''}`}
                title={action.description}
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
              <li key={event.id} className="rounded-md border border-space-600 bg-space-700/50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">{event.title}</span>
                  <span className="text-[10px] uppercase tracking-wide text-mars-orange">
                    {event.severity}
                  </span>
                </div>
                <p className="mb-2 text-xs text-slate-400">{event.description}</p>
                <div className="flex flex-wrap gap-2">
                  {event.availableActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={terminal}
                      onClick={() =>
                        onDecide({
                          eventId: event.id,
                          actionId: action.id,
                          playerChoice: 'self-directed',
                        })
                      }
                      className="btn-secondary"
                      title={action.description}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
