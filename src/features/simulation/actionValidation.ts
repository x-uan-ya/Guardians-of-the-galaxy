/**
 * actionValidation.ts
 * -------------------
 * Rules that stop impossible actions. Pure: reads the state and the action, and
 * returns a plain-English reason when the action cannot be taken right now.
 *
 * The engine enforces these (a rejected decision throws InvalidDecisionError),
 * and the UI uses the same function to grey out the button and say why, so the
 * two can never disagree.
 *
 * Rules for free (always-available) actions:
 *  - the mission must still be running (no actions after death or rescue)
 *  - you cannot spend more of a resource than is in store
 *    (power, water, food or oxygen)
 *  - an action that takes several Sols (a repair, a crop cycle) cannot be
 *    started again while the last one is still in progress
 *
 * Crisis responses (actions that belong to an event) are not limited by the
 * stock rule: the crew must still answer a crisis, and the engine clamps the
 * stores at zero instead.
 */
import type { EventAction } from '../events/eventTypes';
import { RESOURCE_KEYS, type GameState, type ResourceKey } from './simulationTypes';

const NAMES: Record<ResourceKey, string> = {
  power: 'power',
  water: 'water',
  food: 'food',
  oxygen: 'oxygen',
};

/** True while a delayed effect from an earlier use of this action is still waiting. */
export function isActionInProgress(state: GameState, actionId: string): boolean {
  const pendingSources = new Set(state.pendingEffects.map((effect) => effect.sourceDecisionId));
  return state.history.some((record) => record.actionId === actionId && pendingSources.has(record.id));
}

/**
 * Why a FREE action cannot be taken right now, or null when it can.
 */
export function unavailableReason(state: GameState, action: EventAction): string | null {
  if (state.mission.status === 'failed') return 'The mission is over. Start a new run.';
  if (state.mission.status === 'completed') return 'The mission is complete.';

  for (const key of RESOURCE_KEYS) {
    const change = action.effect.immediateResources?.[key] ?? 0;
    if (change < 0 && state.resources[key] < -change) {
      return `Not enough ${NAMES[key]}: needs ${-change}, only ${Math.floor(state.resources[key])} in store.`;
    }
  }

  if ((action.effect.delayed?.length ?? 0) > 0 && isActionInProgress(state, action.id)) {
    return `${action.label} is already in progress.`;
  }
  return null;
}
