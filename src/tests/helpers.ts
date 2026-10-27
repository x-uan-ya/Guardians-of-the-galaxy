/**
 * helpers.ts (test support)
 * -------------------------
 * Shared fixtures for the test suite. A fixed gameId + now makes every test
 * deterministic.
 */

import {
  advanceSimulationDay,
  createInitialGameState,
  resolveEvent,
  type AdvanceResult,
} from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { EVENT_CATALOG } from '../features/events/eventCatalog';
import type { MissionConfig } from '../features/mission/missionTypes';

export const FIXED_CONFIG: MissionConfig = {
  missionType: 'mars',
  occupation: 'engineer',
  objective: 'survival',
  operatingPhilosophy: 'balanced',
  startingCondition: 'standard',
  gameId: 'test-game',
  now: 1_700_000_000_000,
};

/** A fresh deterministic game. */
export function freshGame(overrides?: Partial<MissionConfig>): GameState {
  const state = createInitialGameState({ ...FIXED_CONFIG, ...overrides });
  // Most legacy unit tests need a quiet baseline; startup behavior is tested
  // directly against createInitialGameState.
  return { ...state, activeEvents: [] };
}

/** Inject an event from the catalog into activeEvents so it can be resolved. */
export function withActiveEvent(state: GameState, eventId: string): GameState {
  const event = EVENT_CATALOG.find((e) => e.id === eventId);
  if (!event) throw new Error(`Test event not found: ${eventId}`);
  return { ...state, activeEvents: [...state.activeEvents, event] };
}

/** Resolve test-only events with their first action before a simulated Sol. */
export function resolveTestEvents(state: GameState): GameState {
  let next = state;
  while (next.activeEvents.length > 0) {
    const event = next.activeEvents[0];
    // Prefer choices without future effects so baseline tests stay focused on
    // the engine behavior they are exercising.
    const action =
      event?.availableActions.find((candidate) => !candidate.effect.delayed?.length) ??
      event?.availableActions[0];
    if (!event || !action) {
      throw new Error('Test event has no available action to resolve.');
    }
    next = resolveEvent(next, event.id, action.id);
  }
  return next;
}

/** Advance one Sol after resolving any event produced by the prior Sol. */
export function advanceTestDay(state: GameState): AdvanceResult {
  return advanceSimulationDay(resolveTestEvents(state));
}

/** Deep structural clone used to assert immutability. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
