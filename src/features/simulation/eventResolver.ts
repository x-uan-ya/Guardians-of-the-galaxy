/**
 * eventResolver.ts
 * ----------------
 * Validates a decision's (eventId?, actionId) pair against the event catalog
 * and returns the resolved EventAction. The engine uses this to reject invalid
 * action ids and to read the action's declared effects.
 *
 * This module does NOT mutate state. It only looks up and validates content.
 */

import { findFreeAction } from '../events/eventCatalog';
import type { EventAction } from '../events/eventTypes';
import type { DecisionInput } from '../decisions/decisionTypes';
import type { GameState } from './simulationTypes';

/** Thrown when a decision references an unknown or unavailable action. */
export class InvalidDecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDecisionError';
  }
}

/**
 * Resolve the EventAction a decision refers to, validating that:
 *  - a free action id exists (when no eventId), OR
 *  - the event is currently active AND offers the given action id.
 * Throws InvalidDecisionError otherwise.
 */
export function resolveDecisionAction(state: GameState, input: DecisionInput): EventAction {
  if (!input.actionId || typeof input.actionId !== 'string') {
    throw new InvalidDecisionError('Decision is missing a valid actionId.');
  }

  if (input.eventId === undefined) {
    // Routine actions must not bypass an event that is waiting for a response.
    if (state.activeEvents.length > 0) {
      throw new InvalidDecisionError('Resolve the active event before taking a free action.');
    }
    const free = findFreeAction(input.actionId);
    if (!free) {
      throw new InvalidDecisionError(`Unknown free action: "${input.actionId}".`);
    }
    return free;
  }

  const activeEvent = state.activeEvents.find((event) => event.id === input.eventId);
  if (!activeEvent) {
    throw new InvalidDecisionError(
      `Event "${input.eventId}" is not currently active and cannot be resolved.`
    );
  }

  // Resolve from the active event so saved or location-specific variants use
  // exactly the choices and effects that were presented to the player.
  const action = activeEvent.availableActions.find((candidate) => candidate.id === input.actionId);
  if (!action) {
    throw new InvalidDecisionError(
      `Action "${input.actionId}" is not available for event "${input.eventId}".`
    );
  }
  return action;
}
