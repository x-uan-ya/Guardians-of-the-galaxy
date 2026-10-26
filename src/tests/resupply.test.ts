/**
 * resupply.test.ts
 * ----------------
 * Covers the one-time resupply mechanic (fixed at the mission midpoint, Sol 15):
 *  - every run's resupply day is RESUPPLY_DAY (15),
 *  - the resupply fires exactly once, on day 15,
 *  - it adds RESUPPLY_AMOUNT to every resource (clamped at 100),
 *  - resupplyDelivered flips true and the resupply never fires again,
 *  - day-30 completion is unaffected.
 */

import { describe, expect, it } from 'vitest';
import {
  RESUPPLY_AMOUNT,
  RESUPPLY_DAY,
  createInitialGameState,
  advanceSimulationDay,
  resolveEvent,
  resupplyDay,
  validateGameState,
} from '../features/simulation/simulationEngine';
import { RESOURCE_KEYS, type GameState } from '../features/simulation/simulationTypes';
import { advanceTestDay, FIXED_CONFIG, freshGame } from './helpers';
import { loadGame, saveGame } from '../lib/storage';

/** Keep the character comfortably alive each step so we can reach late days. */
function keepAlive(state: GameState): GameState {
  return {
    ...state,
    crew: { ...state.crew, health: 90, radiationExposure: 0 },
    resources: { power: 60, water: 60, food: 60, oxygen: 60 },
  };
}

describe('resupply day', () => {
  it('is always the fixed mission midpoint (Sol 15)', () => {
    expect(RESUPPLY_DAY).toBe(15);
    expect(resupplyDay()).toBe(15);
    expect(freshGame().mission.supplyWindow).toBe(15);
  });

  it('starts with resupplyDelivered = false and a valid state', () => {
    const state = freshGame();
    expect(state.mission.resupplyDelivered).toBe(false);
    expect(validateGameState(state).valid).toBe(true);
  });
});

describe('one-time resupply delivery', () => {
  function lowResources(state: GameState): GameState {
    return {
      ...state,
      resources: { power: 20, water: 20, food: 20, oxygen: 20 },
      crew: { ...state.crew, health: 90, radiationExposure: 0 },
    };
  }

  it('fires exactly once, on Sol 15', () => {
    // Step day-by-day, keeping the character alive, up to Sol 18.
    let state = lowResources(freshGame());
    const firedDays: number[] = [];
    for (let i = 0; i < 17 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceTestDay(state);
      if (res.resupplyFired) firedDays.push(res.state.day);
      state = res.state;
    }
    expect(firedDays).toEqual([RESUPPLY_DAY]);
    expect(state.mission.resupplyDelivered).toBe(true);
  });

  it('adds RESUPPLY_AMOUNT to every resource on arrival', () => {
    // Advance to Sol 14 (day before the drop), keeping alive, with low stores.
    let state = lowResources(freshGame());
    while (state.day < RESUPPLY_DAY - 1) {
      state = keepAlive(state);
      state = advanceTestDay(state).state;
    }
    // Pin resources just before the drop so the +25 is clearly observable.
    state = { ...state, resources: { power: 30, water: 30, food: 30, oxygen: 30 } };
    const onArrival = advanceTestDay(state).state;
    expect(onArrival.day).toBe(RESUPPLY_DAY);

    const avgBefore = 30;
    const avgAfter = RESOURCE_KEYS.reduce((s, k) => s + onArrival.resources[k], 0) / 4;
    // A full +25 minus one day's consumption must clearly exceed +10.
    expect(avgAfter - avgBefore).toBeGreaterThan(RESUPPLY_AMOUNT * 0.4);
  });

  it('does not fire a second time after Sol 15', () => {
    let state = lowResources(freshGame());
    const firedDays: number[] = [];
    for (let i = 0; i < 22 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceTestDay(state);
      if (res.resupplyFired) firedDays.push(res.state.day);
      state = res.state;
    }
    expect(firedDays.length).toBe(1);
  });

  it('does not redeliver after restoring a delivered Sol 15 save or resolving its event', () => {
    window.localStorage.clear();
    const beforeArrival: GameState = {
      ...freshGame({ missionType: 'mars' }),
      day: 14,
      activeEvents: [],
      resources: { power: 40, water: 40, food: 40, oxygen: 40 },
      crew: { health: 90, morale: 80, radiationExposure: 0 },
    };
    const arrival = advanceSimulationDay(beforeArrival);
    expect(arrival.resupplyFired).toBe(true);
    expect(saveGame(arrival.state).status).toBe('saved');

    const restored = loadGame();
    expect(restored.status).toBe('loaded');
    if (restored.status !== 'loaded') return;
    expect(restored.state.mission.resupplyDelivered).toBe(true);
    const event = restored.state.activeEvents[0]!;
    const resolved = resolveEvent(restored.state, event.id, event.availableActions[0]!.id);
    expect(resolved.resources).toEqual(restored.state.resources);

    const nextDay = advanceSimulationDay(resolved);
    expect(nextDay.resupplyFired).toBe(false);
    expect(nextDay.state.mission.resupplyDelivered).toBe(true);
  });
});

describe('completion unaffected by resupply', () => {
  it('still completes at day 30 when kept alive', () => {
    let state = createInitialGameState({ ...FIXED_CONFIG, gameId: 'survivor' });
    for (let i = 0; i < 40 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      state = advanceTestDay(state).state;
    }
    expect(state.day).toBeGreaterThanOrEqual(30);
    expect(state.mission.status).toBe('completed');
  });
});
