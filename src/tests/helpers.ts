/**
 * helpers.ts (test support)
 * -------------------------
 * Shared fixtures for the test suite. A fixed gameId + now makes every test
 * deterministic.
 */

import { createInitialGameState } from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { EVENT_CATALOG } from '../features/events/eventCatalog';
import type { MissionConfig } from '../features/mission/missionTypes';

export const FIXED_CONFIG: MissionConfig = {
  objective: 'survival',
  operatingPhilosophy: 'balanced',
  startingCondition: 'standard',
  gameId: 'test-game',
  now: 1_700_000_000_000,
};

/** A fresh deterministic game. */
export function freshGame(overrides?: Partial<MissionConfig>): GameState {
  return createInitialGameState({ ...FIXED_CONFIG, ...overrides });
}

/** Inject an event from the catalog into activeEvents so it can be resolved. */
export function withActiveEvent(state: GameState, eventId: string): GameState {
  const event = EVENT_CATALOG.find((e) => e.id === eventId);
  if (!event) throw new Error(`Test event not found: ${eventId}`);
  return { ...state, activeEvents: [...state.activeEvents, event] };
}

/** Deep structural clone used to assert immutability. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
